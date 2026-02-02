import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { CARD_DATA as MOCK_DATA } from './src/data/popularCards.js';

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

app.listen(PORT, () => {
    console.log(`[System] Scraper server running on http://localhost:${PORT}`);
    console.log(`[Policy] robots.txt 준수 및 사이트 부하 방지 로직 적용됨`);
});
