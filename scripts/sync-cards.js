import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. 브랜드 색상
const ISSUER_COLORS = {
    '신한카드': 'linear-gradient(135deg, #0046FF 0%, #0066FF 100%)',
    '현대카드': 'linear-gradient(135deg, #111111 0%, #333333 100%)',
    '삼성카드': 'linear-gradient(135deg, #003366 0%, #0066cc 100%)',
    '우리카드': 'linear-gradient(135deg, #004a99 0%, #0099ff 100%)',
    '하나카드': 'linear-gradient(135deg, #004d40 0%, #009688 100%)',
    '롯데카드': 'linear-gradient(135deg, #ED1C24 0%, #FF3333 100%)',
    'KB국민카드': 'linear-gradient(135deg, #ffcc00 0%, #ffbb00 100%)',
    'NH농협카드': 'linear-gradient(135deg, #00c73c 0%, #00a030 100%)',
    'IBK기업은행': 'linear-gradient(135deg, #1865a9 0%, #104a80 100%)',
    'BC카드': 'linear-gradient(135deg, #ec1e26 0%, #c4121a 100%)'
};

// 2. 카드사 추론 키워드 (Top 100에서 카드사 정보가 명시적이지 않을 경우 대비)
const ISSUER_KEYWORDS = {
    '신한카드': ['신한', 'Deep', 'Mr.Life', 'Plea', '플리', 'SOL', 'Eats', '점심', 'Always'],
    '삼성카드': ['삼성', 'taptap', 'iD', 'MILEAGE', 'Monimo', '모니모'],
    '현대카드': ['현대', 'ZERO', 'M BOOST', 'Z family', 'Nolja', '네이버', 'Mobility'],
    'KB국민카드': ['KB', '국민', 'WE:SH', 'My WE:SH', '톡톡', '청춘', '다담', 'Easy'],
    '롯데카드': ['롯데', 'LOCA', 'Digi', 'LIKIT', 'Rolling', '롤라'],
    '우리카드': ['우리', 'DA@', '카드의정석', 'NU', 'Nu', '오하쳌'],
    '하나카드': ['하나', '내맘대로', 'MULTI', 'Any', 'Jade', '원더', '트래블로그'],
    'NH농협카드': ['농협', 'NH', 'zgm', '지금', '올바른'],
    'IBK기업은행': ['IBK', '기업', '일상의', 'I-Al'],
    'BC카드': ['BC', '비씨', '바로', 'GOAT', 'K-First']
};

// 3. 정적 헬퍼 함수
const HELPER_FUNCTIONS = `
// 카드사 목록
export const ISSUERS = ['전체', '신한카드', '현대카드', '삼성카드', '우리카드', '하나카드', '롯데카드'];

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function getCardsByIssuer(issuer) {
    if (issuer === '전체') {
        return shuffleArray(POPULAR_CARDS);
    }
    return POPULAR_CARDS.filter(card => card.issuer === issuer);
}

export function findCardByBenefits(query) {
    const keywords = {
        '카페': ['카페', '커피', '스타벅스', '이디야', '투썸', '할리스', '커피빈', '엔제리너스'],
        '편의점': ['편의점', 'GS25', 'CU', '세븐일레븐'],
        '주유': ['주유', '기름', '휘발유', '경유', '셀프주유'],
        '대중교통': ['대중교통', '지하철', '버스', '교통', '택시', '따릉이', '킥보드', 'T머니'],
        '쇼핑': ['쇼핑', '온라인', '쿠팡', '네이버', '11번가', 'G마켓', '옥션', '백화점', '아울렛'],
        '배달': ['배달', '배민', '배달의민족', '쿠팡이츠', '요기요', '음식'],
        '영화': ['영화', '시네마', 'CGV', '롯데시네마', '메가박스', 'IMAX', '4DX'],
        '여행': ['여행', '항공', '비행기', '호텔', '숙박', '해외', '공항', '라운지', '마일리지'],
        '뷰티': ['뷰티', '화장품', '헤어샵', '미용실'],
        '패션': ['패션', '옷', '의류', '브랜드'],
        '마트': ['마트', '이마트', '홈플러스', '롯데마트', '코스트코', '식료품'],
        '자동차': ['자동차', '정비', '세차', '보험', '용품'],
        '통신': ['통신', '통신비', '휴대폰', '인터넷'],
        '디지털': ['디지털', '넷플릭스', '유튜브', '스트리밍']
    };

    const queryLower = query.toLowerCase();
    const scoredCards = [];

    POPULAR_CARDS.forEach(card => {
        let score = 0;
        card.benefits.forEach(benefit => {
            const benefitLower = benefit.toLowerCase();
            Object.entries(keywords).forEach(([category, words]) => {
                words.forEach(word => {
                    if (queryLower.includes(word.toLowerCase())) {
                        if (benefitLower.includes(word.toLowerCase())) score += 10;
                        if (card.categories.some(cat => cat.includes(category))) score += 5;
                    }
                });
            });
            if (benefitLower.includes(queryLower)) score += 15;
            const discountMatch = benefit.match(/(\\d+)%/);
            if (discountMatch) score += parseInt(discountMatch[1]) / 10;
        });

        if (score > 0) scoredCards.push({ card, score });
    });

    scoredCards.sort((a, b) => b.score - a.score);
    return scoredCards.map(item => item.card);
}
`;

function extractCategories(benefits) {
    const categories = new Set();
    const keywords = {
        '카페': ['카페', '커피', '스타벅스'],
        '편의점': ['편의점'],
        '주유': ['주유'],
        '대중교통': ['대중교통', '버스', '지하철', '교통'],
        '쇼핑': ['쇼핑', '마트', '백화점'],
        '배달': ['배달'],
        '영화': ['영화'],
        '여행': ['여행', '항공', '마일리지'],
        '통신': ['통신'],
        '할인': ['할인'],
        '적립': ['적립']
    };

    benefits.forEach(b => {
        for (const [cat, words] of Object.entries(keywords)) {
            if (words.some(w => b.includes(w))) categories.add(cat);
        }
    });
    return Array.from(categories).slice(0, 3);
}

// 카드명으로 카드사 추론
function inferIssuer(cardName) {
    for (const [issuer, keywords] of Object.entries(ISSUER_KEYWORDS)) {
        if (keywords.some(k => cardName.includes(k))) {
            return issuer;
        }
    }
    return '기타'; // 매칭 실패 시
}

async function scrapeTop100(page) {
    const url = 'https://www.card-gorilla.com/chart/top100?term=weekly';
    console.log(`Navigating to Top 100: ${url}`);

    // 타임아웃 넉넉히 설정
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    try {
        await page.waitForSelector('.chart_list > li, .ranking_list > li, li', { timeout: 10000 });
    } catch (e) {
        console.warn('Timeout waiting for list items.');
    }

    const cards = await page.evaluate(() => {
        const results = [];
        const items = document.querySelectorAll('.chart_list > li, .ranking_list > li, li');

        items.forEach((el, index) => {
            // 카드명 추출
            const nameEl = el.querySelector('.card_name, .name, .title, strong, p[class*="name"]');
            if (!nameEl) return;
            const name = nameEl.innerText.trim();
            if (!name) return;

            // 순위 추출
            const rankEl = el.querySelector('.rank, .num, span[class*="rank"]');
            const rankText = rankEl ? rankEl.innerText.trim() : (index + 1).toString();
            const rank = parseInt(rankText) || (index + 1);

            // 카드사 추출 (이미지에 alt 태그가 있거나, 텍스트에 포함된 경우 시도)
            let issuer = 'Unknown';
            const imgEl = el.querySelector('div.card_img img, .card_img img, .img img');
            if (imgEl) {
                const alt = imgEl.getAttribute('alt');
                if (alt) issuer = alt.split(' ')[0]; // 보통 "신한카드 딥드림" 꼴
            }

            // 혜택 추출
            const benefits = [];
            el.querySelectorAll('.w_benefit li, .benefit li, .bnf li, span[class*="benefit"]').forEach(b => {
                const t = b.innerText.trim();
                if (t) benefits.push(t);
            });

            results.push({
                rank,
                name,
                rawIssuer: issuer,
                benefits: benefits.slice(0, 3),
            });
        });
        return results;
    });

    console.log(`Scraped ${cards.length} raw cards from Top 100.`);
    return cards;
}

async function runSync() {
    console.log('Starting card data synchronization (Top 100 Strategy)...');

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: "new"
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 1. Top 100 긁어오기
    const rawCards = await scrapeTop100(page);
    await browser.close();

    if (rawCards.length === 0) {
        console.error('No Top 100 data fetched. Aborting.');
        process.exit(1);
    }

    // 2. 데이터 가공 및 카드사별 분류
    const allCards = [];
    const issuerBuckets = {};
    // 타겟 카드사 초기화
    Object.keys(ISSUER_COLORS).forEach(k => issuerBuckets[k] = []);

    // 카드사별 ID 접두사 매핑
    const ID_PREFIXES = {
        '신한카드': 'sh', '삼성카드': 'ss', '현대카드': 'hd',
        'KB국민카드': 'kb', '롯데카드': 'lo', '우리카드': 'wo',
        '하나카드': 'hn', 'NH농협카드': 'nh', 'IBK기업은행': 'ib',
        'BC카드': 'bc'
    };

    rawCards.forEach(raw => {
        // 카드사 추론
        let issuer = inferIssuer(raw.name);

        // 추론 실패 시 rawIssuer(이미지 alt 등) 활용 재시도
        if (issuer === '기타' && raw.rawIssuer !== 'Unknown') {
            issuer = inferIssuer(raw.rawIssuer);
            if (issuer === '기타') { // 그래도 안되면 rawIssuer 자체가 카드사 이름일수도
                if (ISSUER_COLORS[raw.rawIssuer]) issuer = raw.rawIssuer;
            }
        }

        if (issuer === '기타') return; // 타겟 카드사 아니면 제외

        // 버킷에 추가 (10개 꽉 차면 스킵)
        if (issuerBuckets[issuer].length < 10) {
            const prefix = ID_PREFIXES[issuer] || 'etc';
            const newCard = {
                id: `${prefix}-${issuerBuckets[issuer].length + 1}`,
                issuer: issuer,
                name: raw.name,
                annualFee: "1~3만원", // 기본값
                previousMonthSpending: "30만원", // 기본값
                benefits: raw.benefits.length > 0 ? raw.benefits : ["상세 혜택 홈페이지 참조"],
                categories: extractCategories(raw.benefits),
                color: ISSUER_COLORS[issuer],
                rank: raw.rank
            };
            issuerBuckets[issuer].push(newCard);
            allCards.push(newCard);
        }
    });

    console.log('--- Distribution ---');
    Object.entries(issuerBuckets).forEach(([k, v]) => {
        console.log(`${k}: ${v.length} cards`);
    });

    if (allCards.length === 0) {
        console.error('No valid issuer cards filtered. Aborting.');
        process.exit(1);
    }

    const targetPath = path.resolve(__dirname, '../src/data/popularCards.js');
    const fileContent = `// Auto-generated card data - ${new Date().toISOString()}
// This file is updated automatically by GitHub Actions running scripts/sync-cards.js

const ISSUER_COLORS = ${JSON.stringify(ISSUER_COLORS, null, 4)};

export const POPULAR_CARDS = ${JSON.stringify(allCards, null, 4)};

${HELPER_FUNCTIONS}
`;

    fs.writeFileSync(targetPath, fileContent, 'utf-8');
    console.log(`Successfully updated ${targetPath} with ${allCards.length} sorted cards.`);
}

runSync();
