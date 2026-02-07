import axios from 'axios';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const markets = 'KRW-BTC,KRW-ETH,KRW-SOL,KRW-XRP,KRW-DOGE,KRW-ADA,KRW-STX,KRW-AVAX,KRW-DOT,KRW-LINK';
    const names = {
        'KRW-BTC': '비트코인', 'KRW-ETH': '이더리움', 'KRW-SOL': '솔라나',
        'KRW-XRP': '리플', 'KRW-DOGE': '도지코인', 'KRW-ADA': '에이다',
        'KRW-STX': '스택스', 'KRW-AVAX': '아발란체', 'KRW-DOT': '폴카닷', 'KRW-LINK': '체인링크'
    };

    try {
        const url = `https://api.upbit.com/v1/ticker?markets=${markets}`;
        const response = await axios.get(url);
        const data = response.data.map((c, i) => ({
            id: `crypto-${i}`,
            name: names[c.market] || c.market,
            price: c.trade_price.toLocaleString(),
            change: (c.signed_change_rate * 100).toFixed(2),
            isPositive: c.change === 'RISE'
        }));
        return res.status(200).json(data);
    } catch (e) {
        console.error('Crypto Fetch Error:', e.message);
        return res.status(500).json({ error: 'Failed to fetch crypto data' });
    }
}
