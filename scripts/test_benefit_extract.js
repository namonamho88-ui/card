import puppeteer from 'puppeteer';

async function testBenefitExtraction() {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: "new"
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const url = 'https://www.card-gorilla.com/card/detail/13';
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    const benefits = await page.evaluate(() => {
        const list = [];

        // Find the benefit section
        const bnfSection = document.querySelector('.bnf1, .bnf_list, div[class*="benefit"]');

        if (bnfSection) {
            console.log('Found benefit section:', bnfSection.className);

            // Try to get all DL elements
            const dls = bnfSection.querySelectorAll('dl');
            console.log(`Found ${dls.length} DL elements`);

            dls.forEach((dl, idx) => {
                const dt = dl.querySelector('dt');
                const dd = dl.querySelector('dd');

                if (dt) {
                    const title = dt.innerText.trim();
                    const desc = dd ? dd.innerText.trim() : '';

                    // Combine title and description
                    const fullText = desc ? `${title}: ${desc}` : title;

                    console.log(`DL ${idx}: ${fullText.substring(0, 100)}`);
                    list.push(fullText);
                }
            });
        } else {
            console.log('No benefit section found');
        }

        return list.slice(0, 5);
    });

    console.log('\n=== EXTRACTED BENEFITS ===');
    benefits.forEach((b, i) => {
        console.log(`${i + 1}. ${b}`);
    });

    await browser.close();
}

testBenefitExtraction();
