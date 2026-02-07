import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const url = 'https://finance.naver.com/sise/lastsearch2.naver';
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            responseType: 'arraybuffer'
        });

        const decoder = new TextDecoder('euc-kr');
        const html = decoder.decode(response.data);
        const $ = cheerio.load(html);
        const stocks = [];

        $('.type_5 tr').each((i, el) => {
            const name = $(el).find('.tltle').text().trim();
            if (name && stocks.length < 10) {
                const price = $(el).find('td').eq(3).text().trim();
                const changeRate = $(el).find('td').eq(5).text().trim().replace(/[\s\t\n]/g, '');
                const isPositive = $(el).find('td').eq(5).find('span').hasClass('red02');

                stocks.push({
                    id: `kr-${i}`,
                    name,
                    price,
                    change: changeRate,
                    isPositive
                });
            }
        });

        return res.status(200).json(stocks);
    } catch (e) {
        console.error('KR Stocks Fetch Error:', e.message);
        return res.status(500).json({ error: 'Failed to fetch KR stocks' });
    }
}
