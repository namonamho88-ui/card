import puppeteer from 'puppeteer';

async function testActualScrapingFunction() {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: "new"
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const detailUrl = '/card/detail/13';
    await page.goto(`https://www.card-gorilla.com${detailUrl}`, { waitUntil: 'domcontentloaded', timeout: 10000 });

    // This is the EXACT code from sync-cards.js lines 148-178
    const benefits = await page.evaluate(() => {
        const list = [];

        // Find the benefit section
        const bnfSection = document.querySelector('.bnf1, .bnf_list, div[class*="benefit"]');

        if (bnfSection) {
            // Get all DL elements within the benefit section
            const dls = bnfSection.querySelectorAll('dl');

            dls.forEach((dl) => {
                const dt = dl.querySelector('dt');
                const dd = dl.querySelector('dd');

                if (dt) {
                    const title = dt.innerText.trim();
                    const desc = dd ? dd.innerText.trim() : '';

                    // Combine title and description
                    const fullText = desc ? `${title} ${desc}` : title;

                    // Filter out very short or very long text
                    if (fullText.length > 3 && fullText.length < 100) {
                        list.push(fullText);
                    }
                }
            });
        }

        return list.length > 0 ? list.slice(0, 3) : [];
    });

    console.log('\n=== SCRAPING FUNCTION TEST ===');
    console.log('Benefits found:', benefits);
    console.log('Benefits count:', benefits.length);

    const finalResult = benefits.length > 0 ? benefits : ["상세 혜택 홈페이지 참조"];
    console.log('Final result:', finalResult);

    await browser.close();
}

testActualScrapingFunction();
