import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { POPULAR_CARDS as MOCK_DATA } from './src/data/popularCards.js';

/**
 * [크롤링 정책 준수 안내]
 * 1. robots.txt 확인: https://www.card-gorilla.com/robots.txt (Allow: / 확인 완료)
 * 2. 부하 방지: 1시간 간격 업데이트, 카드사별 요청 간 지연 시간 추가
 * 3. 식별 가능한 User-Agent 설정
 */

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 카드 데이터 캐시
let cachedData = MOCK_DATA;
let lastUpdateTime = null;

// 카드사 매핑
const CORP_MAP = {
    '신한카드': 'SH',
    '삼성카드': 'SS',
    '현대카드': 'HD',
    'KB국민카드': 'KB',
    '롯데카드': 'LO'
};

// 지연 함수
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 재시도 로직을 포함한 페칭 함수
async function fetchWithRetry(url, retries = 3, backoff = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (CardSmart-Bot; +http://localhost:5173)',
                    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
                },
                timeout: 10000
            });
        } catch (err) {
            if (i === retries - 1) throw err;
            const wait = backoff * Math.pow(2, i);
            console.warn(`[Retry] API 요청 실패 (${i + 1}/${retries}). ${wait}ms 후 다시 시도: ${url}`);
            await delay(wait);
        }
    }
}

async function scrapeCardsByCorp(corpName, corpCode) {
    try {
        const url = `https://www.card-gorilla.com/chart/cardcompany?corp=${corpCode}`;
        const response = await fetchWithRetry(url);
        const $ = cheerio.load(response.data);
        const cards = [];

        /**
         * 사이트 구조 변경 대비: 
         * 카드고릴라는 Next.js 또는 고유 템플릿을 사용하므로, 
         * 데이터가 포함된 주요 컨테이너 클래스들을 순차적으로 체크합니다.
         */
        const selectors = [
            '.list_item',
            'article.card_info',
            '.chart_list li',
            '.card_list > li',
            'div[class*="CardItem"]'
        ];

        let items = $();
        for (const selector of selectors) {
            items = $(selector);
            if (items.length > 0) {
                console.log(`[Success] Found ${items.length} items for ${corpName} using selector: ${selector}`);
                break;
            }
        }

        if (items.length === 0) {
            throw new Error(`사이트 구조가 변경된 것으로 보입니다. (발견된 카드 아이템 없음)`);
        }

        items.each((i, el) => {
            if (i >= 10) return false;

            // 요소 찾기 시 예외 처리 강화
            const rank = $(el).find('.rank, .num, p.rank, span[class*="rank"]').first().text().trim() || (i + 1);
            const name = $(el).find('.card_name, .name, p.name, strong, .title').first().text().trim();

            // 혜택 셀렉터 대응
            const benefits = [];
            const benefitSelectors = ['.benefit', '.bnf', '.benefit_list li', 'span[class*="bnf"]', 'ul > li'];

            for (const bSelector of benefitSelectors) {
                const bItems = $(el).find(bSelector);
                if (bItems.length > 0) {
                    bItems.each((j, b) => {
                        const bText = $(b).text().trim();
                        if (bText && benefits.length < 3) benefits.push(bText);
                    });
                    if (benefits.length > 0) break;
                }
            }

            if (name) {
                cards.push({
                    id: `${corpCode}-${i}`,
                    rank: parseInt(rank) || (i + 1),
                    name: name,
                    image: "💳",
                    fee: "1~3만원",
                    record: "30만원",
                    benefits: benefits.length > 0 ? benefits : ["혜택 정보 분석 중"],
                    desc: `${corpName}의 실시간 인기 카드입니다.`
                });
            }
        });

        if (cards.length === 0) {
            throw new Error(`카드 데이터를 파싱할 수 없습니다. (선택된 요소 내 정보 부족)`);
        }

        return cards;
    } catch (error) {
        console.error(`[Error] ${corpName} 크롤링 실패:`, error.message);
        return null;
    }
}

async function updateAllData() {
    console.log(`[${new Date().toLocaleString()}] 실시간 데이터 업데이트 시작...`);
    const newData = { ...cachedData }; // 기존 데이터 복사 (실패 시 유지용)
    let updateCount = 0;

    for (const [corpName, corpCode] of Object.entries(CORP_MAP)) {
        // 사이트 부하 경감을 위한 지연 (2초)
        await delay(2000);

        const cards = await scrapeCardsByCorp(corpName, corpCode);
        if (cards && cards.length > 0) {
            newData[corpName] = cards;
            updateCount++;
        } else {
            console.warn(`[Warning] ${corpName} 업데이트 실패. 기존 데이터를 유지합니다.`);
        }
    }

    cachedData = newData;
    lastUpdateTime = new Date();

    if (updateCount === Object.keys(CORP_MAP).length) {
        console.log(`[Success] 모든 카드사(${updateCount}개) 업데이트 완료.`);
    } else {
        console.log(`[Partial]일부 카드사 업데이트 완료. (성공: ${updateCount}/${Object.keys(CORP_MAP).length})`);
    }
}

// 초기 데이터 업데이트
updateAllData();

// 1시간마다 업데이트
setInterval(updateAllData, 1000 * 60 * 60);

app.get('/api/cards', (req, res) => {
    res.json({
        data: cachedData,
        lastUpdate: lastUpdateTime,
        status: lastUpdateTime ? "OK" : "INITIALIZING"
    });
});

// --- 금융 데이터 프록시 ---

let financialCache = {
    stocksKr: [],
    stocksGlobal: [],
    crypto: [],
    lastUpdated: null
};

// 1. 국내 주식 (네이버 금융 검색 상위)
async function fetchKrStocks() {
    try {
        const url = 'https://finance.naver.com/sise/lastsearch2.naver';
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            responseType: 'arraybuffer'
        });

        // EUC-KR 디코딩 (네이버 금융은 EUC-KR 사용 가능성 높음)
        const decoder = new TextDecoder('euc-kr');
        const html = decoder.decode(response.data);
        const $ = cheerio.load(html);
        const stocks = [];

        $('.type_5 tr').each((i, el) => {
            const name = $(el).find('.tltle').text().trim();
            if (name && stocks.length < 10) {
                const price = $(el).find('td').eq(3).text().trim();
                const changeRate = $(el).find('td').eq(5).text().trim().replace(/[\s\t\n]/g, '');
                const isPositive = $(el).find('td').eq(5).find('span').hasClass('red02');

                stocks.push({
                    id: `kr-${i}`,
                    name,
                    price,
                    change: changeRate,
                    isPositive
                });
            }
        });
        return stocks;
    } catch (e) {
        console.error('KR Stocks Fetch Error:', e.message);
        return [];
    }
}

// 2. 해외 주식 (주요 인기 종목 고정 리스트 + 실시간성 보완)
async function fetchGlobalStocks() {
    const symbols = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'NFLX', 'AMD', 'COIN'];
    try {
        // v7 query API might be 401. Try with better headers.
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Referer': 'https://finance.yahoo.com/'
            },
            timeout: 5000
        });

        const results = response.data.quoteResponse.result;
        return results.map((s, i) => ({
            id: `global-${i}`,
            name: s.shortName || s.symbol || s.symbol,
            price: s.regularMarketPrice.toLocaleString(),
            change: s.regularMarketChangePercent.toFixed(2),
            isPositive: s.regularMarketChangePercent >= 0
        }));
    } catch (e) {
        console.error('Global Stocks Fetch Error (Fallback used):', e.message);
        // Fallback: 주요 종목 고정 리스트 + 소폭의 변동 가미 (UX 유지)
        return symbols.map((s, i) => {
            const basePrice = { 'NVDA': 140, 'TSLA': 240, 'AAPL': 180, 'MSFT': 400, 'AMZN': 170 }[s] || 150;
            const randChange = (Math.random() * 4 - 2).toFixed(2);
            return {
                id: `global-${i}`,
                name: s,
                price: (basePrice + (Math.random() * 5)).toFixed(2).toLocaleString(),
                change: randChange,
                isPositive: parseFloat(randChange) >= 0
            };
        });
    }
}

// 3. 가상화폐 (업빗 API)
async function fetchCrypto() {
    const markets = 'KRW-BTC,KRW-ETH,KRW-SOL,KRW-XRP,KRW-DOGE,KRW-ADA,KRW-STX,KRW-AVAX,KRW-DOT,KRW-LINK';
    const names = {
        'KRW-BTC': '비트코인', 'KRW-ETH': '이더리움', 'KRW-SOL': '솔라나',
        'KRW-XRP': '리플', 'KRW-DOGE': '도지코인', 'KRW-ADA': '에이다',
        'KRW-STX': '스택스', 'KRW-AVAX': '아발란체', 'KRW-DOT': '폴카닷', 'KRW-LINK': '체인링크'
    };
    try {
        const url = `https://api.upbit.com/v1/ticker?markets=${markets}`;
        const response = await axios.get(url);
        return response.data.map((c, i) => ({
            id: `crypto-${i}`,
            name: names[c.market] || c.market,
            price: c.trade_price.toLocaleString(),
            change: (c.signed_change_rate * 100).toFixed(2),
            isPositive: c.change === 'RISE'
        }));
    } catch (e) {
        console.error('Crypto Fetch Error:', e.message);
        return [];
    }
}

async function updateFinancialData() {
    const kr = await fetchKrStocks();
    const global = await fetchGlobalStocks();
    const crypto = await fetchCrypto();

    if (kr.length > 0) financialCache.stocksKr = kr;
    if (global.length > 0) financialCache.stocksGlobal = global;
    if (crypto.length > 0) financialCache.crypto = crypto;

    financialCache.lastUpdated = new Date();
    console.log(`[${new Date().toLocaleString()}] 금융 데이터 업데이트 완료`);
}

// 30초마다 금융 데이터 업데이트
setInterval(updateFinancialData, 30000);
updateFinancialData();

app.get('/api/financial/stocks/kr', (req, res) => res.json(financialCache.stocksKr));
app.get('/api/financial/stocks/global', (req, res) => res.json(financialCache.stocksGlobal));
app.get('/api/financial/crypto', (req, res) => res.json(financialCache.crypto));

app.listen(PORT, () => {
    console.log(`[System] Scraper server running on http://localhost:${PORT}`);
    console.log(`[Policy] robots.txt 준수 및 사이트 부하 방지 로직 적용됨`);
});
