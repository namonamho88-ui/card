import puppeteer from 'puppeteer';

async function testWithDifferentWaits() {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: "new"
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const detailUrl = '/card/detail/13';

    console.log('\n=== TEST 1: domcontentloaded (current) ===');
    await page.goto(`https://www.card-gorilla.com${detailUrl}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    let benefits = await page.evaluate(() => {
        const list = [];
        const bnfSection = document.querySelector('.bnf1');
        if (bnfSection) {
            const dls = bnfSection.querySelectorAll('dl');
            dls.forEach((dl) => {
                const dt = dl.querySelector('dt');
                const dd = dl.querySelector('dd');
                if (dt) {
                    const title = dt.innerText.trim();
                    const desc = dd ? dd.innerText.trim() : '';
                    const fullText = desc ? `${title} ${desc}` : title;
                    if (fullText.length > 3 && fullText.length < 100) {
                        list.push(fullText);
                    }
                }
            });
        }
        return list.length > 0 ? list.slice(0, 3) : [];
    });
    console.log('Result:', benefits.length > 0 ? benefits : ["상세 혜택 홈페이지 참조"]);

    console.log('\n=== TEST 2: networkidle2 ===');
    await page.goto(`https://www.card-gorilla.com${detailUrl}`, { waitUntil: 'networkidle2', timeout: 10000 });
    benefits = await page.evaluate(() => {
        const list = [];
        const bnfSection = document.querySelector('.bnf1');
        if (bnfSection) {
            const dls = bnfSection.querySelectorAll('dl');
            dls.forEach((dl) => {
                const dt = dl.querySelector('dt');
                const dd = dl.querySelector('dd');
                if (dt) {
                    const title = dt.innerText.trim();
                    const desc = dd ? dd.innerText.trim() : '';
                    const fullText = desc ? `${title} ${desc}` : title;
                    if (fullText.length > 3 && fullText.length < 100) {
                        list.push(fullText);
                    }
                }
            });
        }
        return list.length > 0 ? list.slice(0, 3) : [];
    });
    console.log('Result:', benefits.length > 0 ? benefits : ["상세 혜택 홈페이지 참조"]);

    console.log('\n=== TEST 3: domcontentloaded + wait for .bnf1 ===');
    await page.goto(`https://www.card-gorilla.com${detailUrl}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    try {
        await page.waitForSelector('.bnf1', { timeout: 5000 });
        console.log('.bnf1 found!');
    } catch (e) {
        console.log('.bnf1 NOT found within 5s');
    }
    benefits = await page.evaluate(() => {
        const list = [];
        const bnfSection = document.querySelector('.bnf1');
        if (bnfSection) {
            const dls = bnfSection.querySelectorAll('dl');
            dls.forEach((dl) => {
                const dt = dl.querySelector('dt');
                const dd = dl.querySelector('dd');
                if (dt) {
                    const title = dt.innerText.trim();
                    const desc = dd ? dd.innerText.trim() : '';
                    const fullText = desc ? `${title} ${desc}` : title;
                    if (fullText.length > 3 && fullText.length < 100) {
                        list.push(fullText);
                    }
                }
            });
        }
        return list.length > 0 ? list.slice(0, 3) : [];
    });
    console.log('Result:', benefits.length > 0 ? benefits : ["상세 혜택 홈페이지 참조"]);

    await browser.close();
}

testWithDifferentWaits();
