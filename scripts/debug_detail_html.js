
import puppeteer from 'puppeteer';

async function debugDetail() {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: "new"
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Use a known card ID (e.g., 13 -> Shinhan Mr.Life)
    const url = 'https://www.card-gorilla.com/card/detail/13';
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    const html = await page.evaluate(() => {
        // Just dump the body text to find where keywords like "월납요금" or "편의점" are
        // Then we can infer structure. Or dump a large chunk of HTML.
        return document.body.innerHTML.substring(0, 50000);
    });

    console.log('--- Benefit HTML Debug ---');
    console.log(html);

    await browser.close();
}

debugDetail();
