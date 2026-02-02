import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CORP_MAP = {
    '신한카드': 'SH',
    '삼성카드': 'SS',
    '현대카드': 'HD',
    'KB국민카드': 'KB',
    '롯데카드': 'LO'
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, retries = 3, backoff = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (CardSmart-Bot; +https://github.com/namonamho88-ui/card)',
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
            if (items.length > 0) break;
        }

        if (items.length === 0) return null;

        items.each((i, el) => {
            if (i >= 10) return false;

            const rank = $(el).find('.rank, .num, p.rank, span[class*="rank"]').first().text().trim() || (i + 1);
            const name = $(el).find('.card_name, .name, p.name, strong, .title').first().text().trim();

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

        return cards.length > 0 ? cards : null;
    } catch (error) {
        console.error(`[Error] ${corpName} 크롤링 실패:`, error.message);
        return null;
    }
}

async function runSync() {
    console.log('Starting card data synchronization...');
    const newData = {};
    let successCount = 0;

    for (const [corpName, corpCode] of Object.entries(CORP_MAP)) {
        console.log(`Fetching data for ${corpName}...`);
        await delay(2000);
        const cards = await scrapeCardsByCorp(corpName, corpCode);
        if (cards) {
            newData[corpName] = cards;
            successCount++;
        } else {
            console.warn(`Failed to fetch cards for ${corpName}`);
        }
    }

    if (successCount === 0) {
        console.error('No data could be fetched. Aborting write.');
        process.exit(1);
    }

    const targetPath = path.resolve(__dirname, '../src/data/popularCards.js');
    const fileContent = `// Auto-generated card data - ${new Date().toISOString()}\n\nexport const CARD_DATA = ${JSON.stringify(newData, null, 4)};\n`;

    fs.writeFileSync(targetPath, fileContent, 'utf-8');
    console.log(`Successfully updated ${targetPath} (${successCount}/${Object.keys(CORP_MAP).length} companies synced)`);
}

runSync();
