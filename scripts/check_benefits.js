
import puppeteer from 'puppeteer';

async function checkBenefits() {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: "new"
    });
    const page = await browser.newPage();
    // Mobile UA might show different layout, but let's stick to Desktop as per previous script
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('Navigating...');
    await page.goto('https://www.card-gorilla.com/chart/top100?term=weekly', { waitUntil: 'networkidle2' });

    console.log('Extracting...');
    const data = await page.evaluate(() => {
        // Target main section specifically to avoid header/sidebar
        const items = Array.from(document.querySelectorAll('section .chart_list > li'));
        return items.slice(0, 3).map(el => {
            return {
                html: el.innerHTML,
                text: el.innerText
            };
        });
    });

    console.log('--- Item 1 InnerHTML ---');
    console.log(data[0]?.html);
    console.log('--- Item 1 InnerText ---');
    console.log(data[0]?.text);

    await browser.close();
}

checkBenefits();
