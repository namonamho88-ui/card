
import puppeteer from 'puppeteer';

async function debugHtml() {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: "new"
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://www.card-gorilla.com/chart/top100?term=weekly', { waitUntil: 'networkidle2' });

    // Grab the first card item using a broad selector that worked before
    const html = await page.evaluate(() => {
        const el = document.querySelector('.chart_list > li, .ranking_list > li, li:has(.card_name)');
        return el ? el.innerHTML : 'No element found';
    });

    console.log('--- Card Item HTML ---');
    console.log(html);

    await browser.close();
}

debugHtml();
