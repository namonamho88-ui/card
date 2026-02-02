
import puppeteer from 'puppeteer';

async function debugSelector() {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: "new"
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Shinhan Mr.Life (ID 13)
    const url = 'https://www.card-gorilla.com/card/detail/13';
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 5000));
    console.log('--- Body Text Start ---');
    console.log(bodyText);

    const benefitHTML = await page.evaluate(() => {
        const containers = document.querySelectorAll('dl.bnf_list, .benefit_list, .bnf_list, div[class*="benefit"]');
        return Array.from(containers).map(c => c.outerHTML).slice(0, 3);
    });

    console.log('--- Benefit Containers HTML ---');
    console.log(benefitHTML.join('\n\n'));

    await browser.close();
}

debugSelector();
