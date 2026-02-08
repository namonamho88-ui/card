// src/data/mockFinancialData.js

// 국내주식 TOP 10 (Mock + 매일 Gemini 업데이트)
export const MOCK_KR_STOCKS = [
    { symbol: '005930', name: '삼성전자', price: 72400, change: 1.12, volume: '18,234,567', marketCap: '432조', sector: '반도체' },
    { symbol: '000660', name: 'SK하이닉스', price: 210000, change: -0.52, volume: '5,678,901', marketCap: '153조', sector: '반도체' },
    { symbol: '373220', name: 'LG에너지솔루션', price: 368000, change: 2.34, volume: '1,234,567', marketCap: '86조', sector: '2차전지' },
    { symbol: '207940', name: '삼성바이오로직스', price: 980000, change: 0.87, volume: '234,567', marketCap: '69조', sector: '바이오' },
    { symbol: '005380', name: '현대차', price: 267000, change: -1.23, volume: '2,345,678', marketCap: '57조', sector: '자동차' },
    { symbol: '006400', name: '삼성SDI', price: 412000, change: 1.56, volume: '890,123', marketCap: '28조', sector: '2차전지' },
    { symbol: '051910', name: 'LG화학', price: 298000, change: -0.34, volume: '567,890', marketCap: '21조', sector: '화학' },
    { symbol: '035420', name: 'NAVER', price: 215000, change: 0.94, volume: '1,456,789', marketCap: '35조', sector: 'IT' },
    { symbol: '035720', name: '카카오', price: 42350, change: -2.15, volume: '6,789,012', marketCap: '19조', sector: 'IT' },
    { symbol: '068270', name: '셀트리온', price: 185000, change: 1.78, volume: '1,567,890', marketCap: '25조', sector: '바이오' },
];

// 해외주식 심볼 (Finnhub 실시간 조회용)
export const US_STOCK_SYMBOLS = [
    { symbol: 'AAPL', name: 'Apple', nameKr: '애플', sector: 'IT' },
    { symbol: 'MSFT', name: 'Microsoft', nameKr: '마이크로소프트', sector: 'IT' },
    { symbol: 'NVDA', name: 'NVIDIA', nameKr: '엔비디아', sector: '반도체' },
    { symbol: 'GOOGL', name: 'Alphabet', nameKr: '구글', sector: 'IT' },
    { symbol: 'AMZN', name: 'Amazon', nameKr: '아마존', sector: '이커머스' },
    { symbol: 'META', name: 'Meta', nameKr: '메타', sector: 'IT' },
    { symbol: 'TSLA', name: 'Tesla', nameKr: '테슬라', sector: '자동차' },
    { symbol: 'TSM', name: 'TSMC', nameKr: 'TSMC', sector: '반도체' },
    { symbol: 'AVGO', name: 'Broadcom', nameKr: '브로드컴', sector: '반도체' },
    { symbol: 'JPM', name: 'JPMorgan', nameKr: 'JP모건', sector: '금융' },
];

// 가상화폐 (CoinGecko ID 매핑)
export const CRYPTO_IDS = [
    'bitcoin', 'ethereum', 'binancecoin', 'solana', 'ripple',
    'cardano', 'dogecoin', 'avalanche-2', 'chainlink', 'polkadot'
];
