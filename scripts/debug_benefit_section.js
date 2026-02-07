import puppeteer from 'puppeteer';

async function debugBenefitSection() {
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

    // Strategy: Look for benefit section by finding elements with benefit-related keywords
    const benefitData = await page.evaluate(() => {
        const results = {
            mainBenefitSection: null,
            benefitItems: []
        };

        // Find the main benefit section (usually has class like 'benefit', 'bnf', etc.)
        const possibleSections = document.querySelectorAll('section, div[class*="benefit"], div[class*="bnf"], .card_benefit, #card_benefit');

        possibleSections.forEach((section, idx) => {
            const text = section.innerText.substring(0, 200);
            if (text.includes('혜택') || text.includes('할인') || text.includes('적립')) {
                console.log(`Section ${idx}: ${section.className || section.id}`);
                console.log(`Text preview: ${text}`);

                // Try to extract benefit items from this section
                const items = [];

                // Try different selectors
                const selectors = [
                    'dl > dt',
                    'ul > li',
                    '.benefit-item',
                    'div[class*="item"]',
                    'p'
                ];

                selectors.forEach(sel => {
                    const elements = section.querySelectorAll(sel);
                    if (elements.length > 0 && elements.length < 20) {
                        elements.forEach((el, i) => {
                            if (i < 5) {
                                const txt = el.innerText.trim();
                                if (txt.length > 5 && txt.length < 100) {
                                    items.push({
                                        selector: sel,
                                        text: txt
                                    });
                                }
                            }
                        });
                    }
                });

                if (items.length > 0) {
                    results.benefitItems.push({
                        sectionClass: section.className || section.id,
                        items: items.slice(0, 10)
                    });
                }
            }
        });

        return results;
    });

    console.log('\n=== BENEFIT SECTION ANALYSIS ===');
    console.log(JSON.stringify(benefitData, null, 2));

    await browser.close();
}

debugBenefitSection();
