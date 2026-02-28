
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

const EXCLUDED_ISSUERS = ['KB국민카드', 'NH농협카드', 'IBK기업은행', 'BC카드'];

// 2. 카드사 추론 키워드
const ISSUER_KEYWORDS = {
    '신한카드': ['신한', 'Deep', 'Mr.Life', 'Plea', '플리', 'SOL', 'Eats', '점심', 'Always'],
    '삼성카드': ['삼성', 'taptap', 'iD', 'MILEAGE', 'Monimo', '모니모'],
    '현대카드': ['현대', 'ZERO', 'M BOOST', 'Z family', 'Nolja', '네이버', 'Mobility'],
    '롯데카드': ['롯데', 'LOCA', 'Digi', 'LIKIT', 'Rolling', '롤라'],
    '우리카드': ['우리', 'DA@', '카드의정석', 'NU', 'Nu', '오하쳌'],
    '하나카드': ['하나', '내맘대로', 'MULTI', 'Any', 'Jade', '원더', '트래블로그', '토스뱅크'],
};

function extractCategories(benefits) {
    const categories = new Set();
    const keywords = {
        '카페': ['카페', '커피', '스타벅스'],
        '편의점': ['편의점'],
        '주유': ['주유', '유류'],
        '대중교통': ['대중교통', '버스', '지하철', '교통'],
        '쇼핑': ['쇼핑', '마트', '백화점', '온라인'],
        '배달': ['배달'],
        '영화': ['영화'],
        '여행': ['여행', '항공', '마일리지', '해외'],
        '통신': ['통신'],
        '할인': ['할인', '%'],
        '적립': ['적립', '포인트', '캐시백'],
        '음식': ['음식', '외식', '레스토랑', '맛집', '식당', '푸드'],
        '스트리밍': ['넷플릭스', '유튜브', 'OTT', '구독'],
    };

    benefits.forEach(b => {
        for (const [cat, words] of Object.entries(keywords)) {
            if (words.some(w => b.includes(w))) categories.add(cat);
        }
    });

    return Array.from(categories).slice(0, 4);
}

function inferIssuer(cardName) {
    for (const [issuer, keywords] of Object.entries(ISSUER_KEYWORDS)) {
        if (keywords.some(k => cardName.includes(k))) {
            return issuer;
        }
    }
    return '기타';
}

// ── 카드 상세 페이지 스크래핑 ──
// card-gorilla.com 상세페이지: /card/detail/{id}
// - 연회비: "국내전용 X,XXX원 / 해외겸용 X,XXX원" (상단 텍스트)
// - 전월실적: "전월실적 XX만원 이상" (상단 텍스트)
// - 주요혜택: .bnf1 섹션 내 dt (카테고리명) + i (설명)
// - 혜택요약: .lst_tag li (상단 3개 요약)
async function scrapeCardDetail(page, cardId) {
    const result = {
        benefits: ["상세 혜택 홈페이지 참조"],
        annualFee: "1~3만원",
        previousMonthSpending: "30만원"
    };

    try {
        const url = `https://www.card-gorilla.com/card/detail/${cardId}`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

        // SPA 렌더링 대기
        await new Promise(r => setTimeout(r, 3000));

        const data = await page.evaluate(() => {
            const result = { benefits: [], annualFee: '', previousMonthSpending: '' };
            const bodyText = document.body.innerText;

            // === 연회비 추출 ===
            // 패턴: "국내전용 15,000원" / "해외겸용 18,000원"
            const domesticFee = bodyText.match(/국내전용\s*([\d,]+)\s*원/);
            const intlFee = bodyText.match(/해외겸용\s*([\d,]+)\s*원/);

            if (domesticFee && intlFee) {
                result.annualFee = `국내 ${domesticFee[1]}원 / 해외 ${intlFee[1]}원`;
            } else if (domesticFee) {
                result.annualFee = `국내 ${domesticFee[1]}원`;
            } else {
                // 다른 패턴 시도
                const feeAlt = bodyText.match(/연회비\s*([\d,]+)\s*원/);
                if (feeAlt) result.annualFee = `${feeAlt[1]}원`;
            }

            // === 전월 실적 추출 ===
            const spending = bodyText.match(/전월실적\s*([\d,]+)\s*만원\s*이상/);
            const spending2 = bodyText.match(/전월\s*실적\s*([\d,]+)\s*만\s*원/);
            if (spending) {
                result.previousMonthSpending = `${spending[1]}만원 이상`;
            } else if (spending2) {
                result.previousMonthSpending = `${spending2[1]}만원 이상`;
            }

            // === 혜택 추출 ===
            // 방법 1: .bnf1 섹션 내 dt 요소 (카테고리명 + i태그 설명)
            const bnf1 = document.querySelector('.bnf1');
            if (bnf1) {
                const dts = bnf1.querySelectorAll('dt');
                dts.forEach(dt => {
                    const category = dt.childNodes[0]?.textContent?.trim() || '';
                    const iTag = dt.querySelector('i');
                    const desc = iTag ? iTag.innerText.trim() : '';
                    const text = desc ? `${category} ${desc}` : category;
                    if (text.length > 2 && text.length < 150) {
                        result.benefits.push(text);
                    }
                });
            }

            // 방법 2: .lst_tag li (상단 혜택 요약 태그)
            if (result.benefits.length === 0) {
                const tags = document.querySelectorAll('.lst_tag li');
                tags.forEach(li => {
                    const text = li.innerText.trim();
                    if (text.length > 2 && text.length < 100) {
                        result.benefits.push(text);
                    }
                });
            }

            // 방법 3: 카드 상단 혜택 미리보기 (아이콘 옆 텍스트)
            if (result.benefits.length === 0) {
                const topArea = document.querySelector('.card_top_info, .top_info, .info_area');
                if (topArea) {
                    const items = topArea.querySelectorAll('li, p, span');
                    items.forEach(el => {
                        const text = el.innerText.trim();
                        if (text.length > 3 && text.length < 100 &&
                            (text.includes('%') || text.includes('할인') || text.includes('적립') ||
                                text.includes('캐시백') || text.includes('포인트'))) {
                            result.benefits.push(text);
                        }
                    });
                }
            }

            result.benefits = result.benefits.slice(0, 5);
            return result;
        });

        if (data.benefits.length > 0) result.benefits = data.benefits;
        if (data.annualFee) result.annualFee = data.annualFee;
        if (data.previousMonthSpending) result.previousMonthSpending = data.previousMonthSpending;

    } catch (e) {
        console.warn(`  ⚠ Detail scrape failed for card ${cardId}: ${e.message}`);
    }

    return result;
}

// ── Top 100 목록 스크래핑 ──
// card-gorilla.com SPA 구조:
// - 카드 목록: a.card_data 요소 (100개)
// - 순위: div.rank 내 숫자
// - 이미지: div.img > img (src = api.card-gorilla.com URL)
// - 카드명: innerText에서 추출 (순위, 혜택설명, 카드사명 사이의 카드명)
// - 카드 ID: 이미지 URL에서 /card/{id}/ 패턴으로 추출
async function scrapeTop100(page) {
    const url = 'https://www.card-gorilla.com/chart/top100?term=weekly';
    console.log(`📊 Navigating to Top 100: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // SPA 렌더링 대기
    await new Promise(r => setTimeout(r, 5000));

    // a.card_data 요소 확인
    const count = await page.$$eval('a.card_data', els => els.length);
    console.log(`  ✓ Found ${count} a.card_data elements`);

    if (count === 0) {
        console.warn('  ⚠ No a.card_data found, trying alternative selectors...');
        // 대안 시도
        await new Promise(r => setTimeout(r, 5000));
    }

    const cards = await page.evaluate(() => {
        const results = [];
        const items = document.querySelectorAll('a.card_data');

        items.forEach((el) => {
            // 순위 추출
            const rankEl = el.querySelector('div.rank, .rank');
            const rank = rankEl ? parseInt(rankEl.innerText.trim()) : 0;
            if (!rank || rank <= 0) return;

            // 이미지 추출
            const imgEl = el.querySelector('div.img img, .img img, img');
            let image = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src')) : null;
            if (image && !image.startsWith('http')) {
                image = `https://www.card-gorilla.com${image}`;
            }

            // 카드 ID를 이미지 URL에서 추출: /card/{id}/
            let cardId = null;
            if (image) {
                const idMatch = image.match(/\/card\/(\d+)\//);
                if (idMatch) cardId = idMatch[1];
            }

            // 전체 텍스트에서 카드명 추출
            // 텍스트 형식: "1 - 최대 52만원 캐시백 신한카드 Mr.Life 신한카드"
            const fullText = el.innerText.trim();
            const lines = fullText.split('\n').map(l => l.trim()).filter(l => l);

            // 카드명은 보통 3번째 or 4번째 줄 (순위, -, 혜택설명, 카드명, 카드사)
            let name = '';
            let rawIssuer = '';

            // 카드명 찾기: 가장 긴 라인 중 혜택 설명이 아닌 것
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // 순위, 하이픈, 짧은 텍스트 건너뛰기
                if (/^\d+$/.test(line)) continue; // 순위 숫자만
                if (line === '-' || line === '–') continue;
                if (line.startsWith('최대') || line.includes('캐시백') || line.includes('혜택')) continue;

                // 카드사명 추출 (마지막 줄이 보통 카드사)
                if (i === lines.length - 1 && line.includes('카드')) {
                    rawIssuer = line;
                    continue;
                }

                // 그 외는 카드명 후보
                if (!name && line.length > 2) {
                    name = line;
                }
            }

            if (!name) return;

            results.push({
                rank,
                name,
                rawIssuer: rawIssuer || 'Unknown',
                image,
                cardId, // 상세페이지용 ID
            });
        });

        return results;
    });

    console.log(`  ✓ Extracted ${cards.length} cards from Top 100`);
    return cards;
}

// ── 메인 동기화 함수 ──
async function runSync() {
    console.log('🚀 Starting card data synchronization...');
    console.log(`⏰ Time: ${new Date().toISOString()}`);

    const browser = await puppeteer.launch({
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1920,1080'
        ],
        headless: "new"
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    // 불필요한 리소스 차단 (속도 향상)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const type = req.resourceType();
        if (['font', 'media'].includes(type)) {
            req.abort();
        } else {
            req.continue();
        }
    });

    // 1. Top 100 목록 수집
    const rawCards = await scrapeTop100(page);

    if (rawCards.length === 0) {
        console.error('❌ No cards found! Site structure may have changed. Aborting to keep existing data.');
        await browser.close();
        process.exit(0);
    }

    // 2. 필터링 및 상세 스크래핑
    const allCards = [];
    const seenCardNames = new Set();
    const issuerBuckets = {};
    Object.keys(ISSUER_COLORS).forEach(k => issuerBuckets[k] = []);

    const ID_PREFIXES = {
        '신한카드': 'sh', '삼성카드': 'ss', '현대카드': 'hd',
        '롯데카드': 'lo', '우리카드': 'wo', '하나카드': 'hn'
    };

    let detailSuccessCount = 0;
    let detailFailCount = 0;

    for (const raw of rawCards) {
        if (seenCardNames.has(raw.name)) continue;
        seenCardNames.add(raw.name);

        let issuer = inferIssuer(raw.name);

        if (issuer === '기타' && raw.rawIssuer !== 'Unknown') {
            issuer = inferIssuer(raw.rawIssuer);
            if (issuer === '기타') {
                if (ISSUER_COLORS[raw.rawIssuer]) issuer = raw.rawIssuer;
            }
        }

        if (issuer === '기타' || EXCLUDED_ISSUERS.includes(issuer) || !ISSUER_COLORS[issuer]) {
            continue;
        }

        if (issuerBuckets[issuer].length < 10) {
            console.log(`📋 [${issuer}] ${raw.name} (rank: ${raw.rank}, id: ${raw.cardId})`);

            let detail = {
                benefits: ["상세 혜택 홈페이지 참조"],
                annualFee: "1~3만원",
                previousMonthSpending: "30만원"
            };

            // 카드 ID가 있으면 상세페이지 스크래핑
            if (raw.cardId) {
                detail = await scrapeCardDetail(page, raw.cardId);
                await new Promise(r => setTimeout(r, 1500));

                if (detail.benefits[0] !== "상세 혜택 홈페이지 참조") {
                    detailSuccessCount++;
                    console.log(`  ✓ 혜택 ${detail.benefits.length}개, 연회비: ${detail.annualFee}, 전월실적: ${detail.previousMonthSpending}`);
                } else {
                    detailFailCount++;
                    console.log(`  ⚠ 혜택 추출 실패 - placeholder 사용`);
                }
            } else {
                detailFailCount++;
                console.log(`  ⚠ 카드 ID 없음 - 상세 스크래핑 건너뜀`);
            }

            const prefix = ID_PREFIXES[issuer] || 'etc';
            const newCard = {
                id: `${prefix}-${issuerBuckets[issuer].length + 1}`,
                issuer: issuer,
                name: raw.name,
                annualFee: detail.annualFee,
                previousMonthSpending: detail.previousMonthSpending,
                benefits: detail.benefits,
                categories: extractCategories(detail.benefits),
                image: raw.image,
                color: ISSUER_COLORS[issuer],
                rank: raw.rank
            };
            issuerBuckets[issuer].push(newCard);
            allCards.push(newCard);
        }
    }

    await browser.close();

    // 결과 요약
    console.log('\n📊 --- Distribution ---');
    Object.entries(issuerBuckets).forEach(([k, v]) => {
        if (v.length > 0) console.log(`  ${k}: ${v.length} cards`);
    });
    console.log(`\n✅ Detail scraping: ${detailSuccessCount} success, ${detailFailCount} failed`);

    if (allCards.length === 0) {
        console.error('❌ No cards after filtering! Aborting to keep existing data.');
        process.exit(0);
    }

    // 결과 저장
    const outputPath = path.resolve(__dirname, '../src/data/popularCards.json');
    const result = {
        updatedAt: new Date().toISOString(),
        cards: allCards
    };

    fs.writeFileSync(outputPath, JSON.stringify(result, null, 4));
    console.log(`\n💾 Saved ${allCards.length} cards to ${outputPath}`);
}

runSync();
