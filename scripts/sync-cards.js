
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
        '음식': ['음식', '외식', '레스토랑', '맛집', '식당', '배달'],
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

// ── SPA 렌더링 대기 헬퍼 ──
async function waitForSPAContent(page, selectors, timeout = 20000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        for (const selector of selectors) {
            try {
                const found = await page.$(selector);
                if (found) {
                    // 추가 안정화 대기
                    await new Promise(r => setTimeout(r, 1500));
                    return selector;
                }
            } catch (e) { }
        }
        await new Promise(r => setTimeout(r, 500));
    }
    return null;
}

// ── 카드 상세 페이지 스크래핑 (연회비 + 혜택) ──
async function scrapeCardDetail(page, detailUrl) {
    const result = {
        benefits: ["상세 혜택 홈페이지 참조"],
        annualFee: "1~3만원",
        previousMonthSpending: "30만원"
    };

    try {
        const fullUrl = detailUrl.startsWith('http')
            ? detailUrl
            : `https://www.card-gorilla.com${detailUrl}`;

        await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 20000 });

        // SPA 로딩 대기 - 다양한 셀렉터 시도
        await waitForSPAContent(page, [
            '.bnf1', '.benefit_area', '.bnf_list',
            '.card_detail', '.detail_info', '.info_area',
            'div[class*="benefit"]', 'div[class*="bnf"]',
            '.annual_fee', '.fee_info',
            'dl', '.tbl_type'
        ], 15000);

        const data = await page.evaluate(() => {
            const result = { benefits: [], annualFee: '', previousMonthSpending: '' };

            // === 연회비 추출 ===
            // 방법 1: .annual_fee, .fee 등 직접 셀렉터
            const feeSelectors = [
                '.annual_fee', '.fee_info', '.card_fee',
                'div[class*="fee"]', 'div[class*="annual"]',
                '.tbl_type', 'table'
            ];

            for (const sel of feeSelectors) {
                const el = document.querySelector(sel);
                if (el) {
                    const text = el.innerText.trim();
                    // 연회비 관련 텍스트 찾기
                    const feeMatch = text.match(/국내[^\d]*(\d[\d,.]+)\s*원/);
                    const feeMatch2 = text.match(/연회비[^\d]*(\d[\d,.]+)\s*원/);
                    const feeMatch3 = text.match(/(\d[\d,.]+)\s*원/);
                    if (feeMatch) {
                        result.annualFee = `국내 ${feeMatch[1]}원`;
                        break;
                    } else if (feeMatch2) {
                        result.annualFee = `${feeMatch2[1]}원`;
                        break;
                    } else if (feeMatch3 && text.includes('연회비')) {
                        result.annualFee = `${feeMatch3[1]}원`;
                        break;
                    }
                }
            }

            // 방법 2: 페이지 전체에서 연회비 패턴 검색
            if (!result.annualFee) {
                const allText = document.body.innerText;
                const patterns = [
                    /국내전용[:\s]*(\d[\d,.]+)\s*원/,
                    /국내[:\s]*(\d[\d,.]+)\s*원.*?해외[:\s]*(\d[\d,.]+)\s*원/,
                    /연회비[:\s]*(\d[\d,.]+)\s*원/,
                    /연회비.*?(\d[\d,.]+)\s*원/,
                ];
                for (const p of patterns) {
                    const m = allText.match(p);
                    if (m) {
                        if (m[2]) {
                            result.annualFee = `국내 ${m[1]}원 / 해외 ${m[2]}원`;
                        } else {
                            result.annualFee = `${m[1]}원`;
                        }
                        break;
                    }
                }
            }

            // === 전월 실적 추출 ===
            {
                const allText = document.body.innerText;
                const spendPatterns = [
                    /전월\s*실적[:\s]*(\d[\d,.]+)\s*만\s*원/,
                    /전월.*?(\d[\d,.]+)\s*만\s*원\s*이상/,
                    /(\d[\d,.]+)\s*만\s*원\s*이상.*?전월/,
                ];
                for (const p of spendPatterns) {
                    const m = allText.match(p);
                    if (m) {
                        result.previousMonthSpending = `${m[1]}만원 이상`;
                        break;
                    }
                }
            }

            // === 혜택 추출 ===
            // 방법 1: .bnf1 섹션의 dl/dt/dd 구조
            const bnfSelectors = [
                '.bnf1', '.bnf_list', '.benefit_area',
                'div[class*="benefit"]', 'div[class*="bnf"]',
                '.card_detail_benefit'
            ];

            for (const sel of bnfSelectors) {
                const section = document.querySelector(sel);
                if (section) {
                    // dl/dt/dd 패턴
                    const dls = section.querySelectorAll('dl');
                    if (dls.length > 0) {
                        dls.forEach(dl => {
                            const dt = dl.querySelector('dt');
                            const dd = dl.querySelector('dd');
                            if (dt) {
                                const title = dt.innerText.trim();
                                const desc = dd ? dd.innerText.trim() : '';
                                const text = desc ? `${title}: ${desc}` : title;
                                if (text.length > 3 && text.length < 150) {
                                    result.benefits.push(text);
                                }
                            }
                        });
                    }

                    // li 패턴
                    if (result.benefits.length === 0) {
                        const lis = section.querySelectorAll('li');
                        lis.forEach(li => {
                            const text = li.innerText.trim();
                            if (text.length > 3 && text.length < 150) {
                                result.benefits.push(text);
                            }
                        });
                    }

                    // p, span 패턴
                    if (result.benefits.length === 0) {
                        const items = section.querySelectorAll('p, span, div > strong');
                        items.forEach(item => {
                            const text = item.innerText.trim();
                            if (text.length > 5 && text.length < 150 &&
                                (text.includes('%') || text.includes('할인') || text.includes('적립') ||
                                    text.includes('캐시백') || text.includes('포인트') || text.includes('무이자'))) {
                                result.benefits.push(text);
                            }
                        });
                    }

                    if (result.benefits.length > 0) break;
                }
            }

            // 방법 2: 카드 요약 영역에서 혜택 추출
            if (result.benefits.length === 0) {
                const summarySelectors = ['.lst_tag', '.tag_area', '.card_summary', '.summary'];
                for (const sel of summarySelectors) {
                    const section = document.querySelector(sel);
                    if (section) {
                        const spans = section.querySelectorAll('span, a, li');
                        spans.forEach(s => {
                            const text = s.innerText.trim();
                            if (text.length > 2 && text.length < 80) {
                                result.benefits.push(text);
                            }
                        });
                        if (result.benefits.length > 0) break;
                    }
                }
            }

            result.benefits = result.benefits.slice(0, 5);
            return result;
        });

        if (data.benefits.length > 0) result.benefits = data.benefits;
        if (data.annualFee) result.annualFee = data.annualFee;
        if (data.previousMonthSpending) result.previousMonthSpending = data.previousMonthSpending;

    } catch (e) {
        console.warn(`  ⚠ Failed to scrape detail: ${detailUrl} - ${e.message}`);
    }

    return result;
}

// ── Top 100 목록 스크래핑 ──
async function scrapeTop100(page) {
    const url = 'https://www.card-gorilla.com/chart/top100?term=weekly';
    console.log(`📊 Navigating to Top 100: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // SPA 렌더링 대기
    const matchedSelector = await waitForSPAContent(page, [
        '.chart_list li',
        '.ranking_list li',
        'ol li',
        'ul li a[href*="/card/detail"]',
    ], 20000);

    if (!matchedSelector) {
        console.warn('⚠ No card list items found after waiting. Trying generic selectors...');
    } else {
        console.log(`  ✓ Found content via: ${matchedSelector}`);
    }

    const cards = await page.evaluate(() => {
        const results = [];

        // SPA 렌더링 된 카드 목록 찾기 - 다양한 패턴 시도
        let items = document.querySelectorAll('.chart_list li');
        if (items.length === 0) items = document.querySelectorAll('.ranking_list li');
        if (items.length === 0) items = document.querySelectorAll('ol > li');
        if (items.length === 0) {
            // 모든 li 중에 카드 관련 링크가 있는 것만
            const allLi = document.querySelectorAll('li');
            items = Array.from(allLi).filter(li => {
                const a = li.querySelector('a');
                return a && a.href && a.href.includes('/card/detail');
            });
        }

        items.forEach((el, index) => {
            // 카드명 추출 - 다양한 셀렉터 시도
            const nameSelectors = [
                '.card_name', '.name', '.title',
                'p[class*="name"]', 'strong', 'h3', 'h4'
            ];
            let name = '';
            for (const sel of nameSelectors) {
                const found = el.querySelector(sel);
                if (found) {
                    name = found.innerText.trim();
                    if (name && name.length > 2 && name.length < 80) break;
                    name = '';
                }
            }
            if (!name) return;

            // 순위 추출
            const rankSelectors = ['.rank', '.num', 'span[class*="rank"]', '.number'];
            let rank = index + 1;
            for (const sel of rankSelectors) {
                const found = el.querySelector(sel);
                if (found) {
                    const parsed = parseInt(found.innerText.trim());
                    if (!isNaN(parsed) && parsed > 0) {
                        rank = parsed;
                        break;
                    }
                }
            }

            // 카드사명 & 이미지 추출
            let issuer = 'Unknown';
            let image = null;
            const imgSelectors = [
                'div.card_img img', '.card_img img',
                '.img img', 'img[alt]', 'img'
            ];
            for (const sel of imgSelectors) {
                const img = el.querySelector(sel);
                if (img) {
                    const alt = img.getAttribute('alt');
                    if (alt) issuer = alt.split(' ')[0];
                    image = img.getAttribute('src') || img.getAttribute('data-src');
                    if (image && !image.startsWith('http')) {
                        image = `https://www.card-gorilla.com${image}`;
                    }
                    if (image) break;
                }
            }

            // CloudFront URL이면 data-src 체크
            if (!image || image.includes('placeholder')) {
                const lazyImg = el.querySelector('img[data-src]');
                if (lazyImg) {
                    image = lazyImg.getAttribute('data-src');
                    if (image && !image.startsWith('http')) {
                        image = `https://www.card-gorilla.com${image}`;
                    }
                }
            }

            // 상세 페이지 URL 추출
            const anchor = el.querySelector('a[href*="/card/detail"], a[href*="/card/"]');
            const detailUrl = anchor ? anchor.getAttribute('href') : null;

            results.push({ rank, name, rawIssuer: issuer, image, detailUrl });
        });

        return results;
    });

    console.log(`  ✓ Found ${cards.length} cards in Top 100 list`);
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
        process.exit(0); // 0으로 종료해서 기존 데이터 보존
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

    // 순차 처리
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

        // 제외 로직
        if (issuer === '기타' || EXCLUDED_ISSUERS.includes(issuer) || !ISSUER_COLORS[issuer]) {
            continue;
        }

        // 각 카드사별 최대 10개까지만 수집
        if (issuerBuckets[issuer].length < 10) {
            console.log(`📋 [${issuer}] ${raw.name} (rank: ${raw.rank})`);

            let detail = {
                benefits: ["상세 혜택 홈페이지 참조"],
                annualFee: "1~3만원",
                previousMonthSpending: "30만원"
            };

            if (raw.detailUrl) {
                detail = await scrapeCardDetail(page, raw.detailUrl);
                // 대기 (서버 부하 방지)
                await new Promise(r => setTimeout(r, 1500));

                if (detail.benefits[0] !== "상세 혜택 홈페이지 참조") {
                    detailSuccessCount++;
                    console.log(`  ✓ 혜택 ${detail.benefits.length}개, 연회비: ${detail.annualFee}`);
                } else {
                    detailFailCount++;
                    console.log(`  ⚠ 혜택 추출 실패 - placeholder 사용`);
                }
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

    // 3. 결과 요약
    console.log('\n📊 --- Distribution ---');
    Object.entries(issuerBuckets).forEach(([k, v]) => {
        if (v.length > 0) console.log(`  ${k}: ${v.length} cards`);
    });
    console.log(`\n✅ Detail scraping: ${detailSuccessCount} success, ${detailFailCount} failed`);

    // 4. 카드가 없으면 기존 데이터 보존
    if (allCards.length === 0) {
        console.error('❌ No cards after filtering! Aborting to keep existing data.');
        process.exit(0);
    }

    // 5. 결과 저장
    const outputPath = path.resolve(__dirname, '../src/data/popularCards.json');
    const result = {
        updatedAt: new Date().toISOString(),
        cards: allCards
    };

    fs.writeFileSync(outputPath, JSON.stringify(result, null, 4));
    console.log(`\n💾 Saved ${allCards.length} cards to ${outputPath}`);
}

runSync();
