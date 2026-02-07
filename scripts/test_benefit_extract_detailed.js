import puppeteer from 'puppeteer';

async function debugDetailedBenefits() {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: "new"
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Test with Shinhan Mr.Life card (ID 13)
    const url = 'https://www.card-gorilla.com/card/detail/13';
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    const benefitData = await page.evaluate(() => {
        const results = [];

        // Find the .bnf1 section specifically
        const bnfSection = document.querySelector('.bnf1');

        if (bnfSection) {
            console.log('Found .bnf1 section');

            // Get all DL elements
            const dls = bnfSection.querySelectorAll('dl');
            console.log(`Found ${dls.length} dl elements`);

            dls.forEach((dl, idx) => {
                const dt = dl.querySelector('dt');
                const dd = dl.querySelector('dd');

                const dtText = dt ? dt.innerText.trim() : 'NO DT';
                const ddText = dd ? dd.innerText.trim() : 'NO DD';
                const ddHTML = dd ? dd.innerHTML.substring(0, 200) : 'NO DD HTML';

                results.push({
                    index: idx,
                    dt: dtText,
                    dd: ddText,
                    ddHTML: ddHTML,
                    ddLength: ddText.length
                });
            });
        } else {
            console.log('.bnf1 section NOT found');
        }

        return results;
    });

    console.log('\n=== DETAILED BENEFIT ANALYSIS ===');
    benefitData.forEach(item => {
        console.log(`\n--- DL ${item.index} ---`);
        console.log(`DT: ${item.dt}`);
        console.log(`DD: ${item.dd}`);
        console.log(`DD Length: ${item.ddLength}`);
        console.log(`DD HTML: ${item.ddHTML}`);
    });

    await browser.close();
}

debugDetailedBenefits();
