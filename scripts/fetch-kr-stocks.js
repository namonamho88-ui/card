/**
 * 📈 국내주식 TOP 10 실시간 주가 수집 스크립트
 * GitHub Actions에서 매일 실행되어 네이버 금융에서 주가를 크롤링합니다.
 * 
 * 사용법: node scripts/fetch-kr-stocks.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.join(__dirname, '..', 'public', 'reports');

// 국내 시가총액 상위 10 종목
const KR_STOCK_SYMBOLS = [
    { symbol: '005930', name: '삼성전자', sector: '반도체' },
    { symbol: '000660', name: 'SK하이닉스', sector: '반도체' },
    { symbol: '373220', name: 'LG에너지솔루션', sector: '2차전지' },
    { symbol: '207940', name: '삼성바이오로직스', sector: '바이오' },
    { symbol: '005380', name: '현대차', sector: '자동차' },
    { symbol: '006400', name: '삼성SDI', sector: '2차전지' },
    { symbol: '051910', name: 'LG화학', sector: '화학' },
    { symbol: '035420', name: 'NAVER', sector: 'IT' },
    { symbol: '035720', name: '카카오', sector: 'IT' },
    { symbol: '068270', name: '셀트리온', sector: '바이오' },
];

function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 네이버 금융에서 개별 종목 주가 크롤링
 */
async function fetchStockPrice(symbol) {
    try {
        // 네이버 금융 API (JSON 반환)
        const url = `https://m.stock.naver.com/api/stock/${symbol}/basic`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const price = parseInt(data.closePrice?.replace(/,/g, '') || '0');
        const change = parseFloat(data.compareToPreviousClosePrice?.replace(/,/g, '') || '0');
        const prevClose = price - change;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
        const volume = data.accumulatedTradingVolume || '0';
        const marketCap = data.marketCap
            ? `${Math.round(parseInt(data.marketCap.replace(/,/g, '')) / 1e8) / 10000}조`
            : '-';

        return {
            price,
            change: parseFloat(changePercent.toFixed(2)),
            volume: parseInt(volume.replace(/,/g, '')).toLocaleString('ko-KR'),
            marketCap,
        };
    } catch (e) {
        console.warn(`  ⚠️ ${symbol} 네이버 API 실패: ${e.message}`);
        return null;
    }
}

/**
 * Fallback: 네이버 시세 페이지에서 크롤링
 */
async function fetchStockPriceFallback(symbol) {
    try {
        const url = `https://finance.naver.com/item/main.naver?code=${symbol}`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();

        // 현재가 추출
        const priceMatch = html.match(/no_today.*?<span class="blind">([\d,]+)<\/span>/s);
        const changeMatch = html.match(/no_exday.*?<span class="blind">([\d,.]+)<\/span>/s);

        if (priceMatch) {
            const price = parseInt(priceMatch[1].replace(/,/g, ''));
            const changeVal = changeMatch ? parseFloat(changeMatch[1].replace(/,/g, '')) : 0;
            const isDown = html.includes('no_exday') && html.includes('nv_down');
            const actualChange = isDown ? -changeVal : changeVal;
            const prevClose = price - actualChange;
            const changePercent = prevClose > 0 ? (actualChange / prevClose) * 100 : 0;

            return {
                price,
                change: parseFloat(changePercent.toFixed(2)),
                volume: '-',
                marketCap: '-',
            };
        }
        return null;
    } catch (e) {
        console.warn(`  ⚠️ ${symbol} Fallback 크롤링 실패: ${e.message}`);
        return null;
    }
}

// ── 메인 실행 ──
async function main() {
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const today = getTodayKey();
    console.log(`\n📈 ${today} 국내주식 TOP 10 주가 수집 시작\n${'─'.repeat(50)}`);

    const results = [];

    for (const stock of KR_STOCK_SYMBOLS) {
        console.log(`  📊 ${stock.name} (${stock.symbol}) 조회 중...`);

        // 1차: 네이버 모바일 API
        let data = await fetchStockPrice(stock.symbol);

        // 2차: Fallback 크롤링
        if (!data) {
            console.log(`  🔄 ${stock.name} Fallback 크롤링 시도...`);
            data = await fetchStockPriceFallback(stock.symbol);
        }

        if (data) {
            results.push({
                symbol: stock.symbol,
                name: stock.name,
                sector: stock.sector,
                price: data.price,
                change: data.change,
                volume: data.volume,
                marketCap: data.marketCap,
            });
            console.log(`  ✅ ${stock.name}: ${data.price.toLocaleString()}원 (${data.change > 0 ? '+' : ''}${data.change}%)`);
        } else {
            console.log(`  ❌ ${stock.name}: 데이터 수집 실패`);
        }

        // Rate Limit 방지
        await new Promise(r => setTimeout(r, 500));
    }

    if (results.length > 0) {
        const output = {
            date: today,
            generatedAt: new Date().toISOString(),
            data: results
        };

        const outputFile = path.join(REPORTS_DIR, 'kr-stocks.json');
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf-8');
        console.log(`\n✅ ${results.length}개 종목 저장 완료 → ${outputFile}`);
    } else {
        console.log('\n❌ 수집된 데이터가 없습니다.');
    }

    console.log(`${'─'.repeat(50)}\n`);
}

main().catch(err => {
    console.error('❌ 치명적 오류:', err);
    process.exit(1);
});
