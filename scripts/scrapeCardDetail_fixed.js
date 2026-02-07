async function scrapeCardDetail(page, detailUrl) {
    try {
        await page.goto(`https://www.card-gorilla.com${detailUrl}`, { waitUntil: 'domcontentloaded', timeout: 10000 });

        // 상세 혜택 추출 (Correct .bnf1 section with dl/dt/dd structure)
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

        return benefits.length > 0 ? benefits : ["상세 혜택 홈페이지 참조"];
    } catch (e) {
        console.warn(`Failed to scrape detail: ${detailUrl}`, e.message);
        return ["상세 혜택 홈페이지 참조"];
    }
}
