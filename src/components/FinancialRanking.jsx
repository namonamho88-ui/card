import React, { useState, useEffect } from 'react';

const STOCK_MOCK = [
    { id: 1, name: '삼성전자', price: '73,400', change: '+1.24', isPositive: true },
    { id: 2, name: 'SK하이닉스', price: '142,500', change: '-0.35', isPositive: false },
    { id: 3, name: 'NAVER', price: '210,500', change: '+2.11', isPositive: true },
    { id: 4, name: '카카오', price: '58,200', change: '+0.85', isPositive: true },
    { id: 5, name: 'LG에너지솔루션', price: '385,000', change: '-1.42', isPositive: false },
    { id: 6, name: '현대차', price: '235,500', change: '+0.64', isPositive: true },
    { id: 7, name: '기아', price: '115,200', change: '+1.05', isPositive: true },
    { id: 8, name: '셀트리온', price: '178,400', change: '-0.11', isPositive: false },
    { id: 9, name: 'POSCO홀딩스', price: '425,000', change: '+0.47', isPositive: true },
    { id: 10, name: '에코프로비엠', price: '215,000', change: '-2.35', isPositive: false },
];

const COIN_MOCK = [
    { id: 1, name: '비트코인', price: '64,235,000', change: '+3.42', isPositive: true },
    { id: 2, name: '이더리움', price: '3,250,000', change: '+2.15', isPositive: true },
    { id: 3, name: '솔라나', price: '145,000', change: '-1.24', isPositive: false },
    { id: 4, name: '리플', price: '824', change: '+0.54', isPositive: true },
    { id: 5, name: '도지코인', price: '112', change: '-3.11', isPositive: false },
    { id: 6, name: '에이다', price: '645', change: '+1.12', isPositive: true },
    { id: 7, name: '아발란체', price: '48,500', change: '+0.85', isPositive: true },
    { id: 8, name: '폴카닷', price: '9,850', change: '-0.45', isPositive: false },
    { id: 9, name: '체인링크', price: '24,500', change: '+1.54', isPositive: true },
    { id: 10, name: '트론', price: '145', change: '+0.32', isPositive: true },
];

function FinancialRanking() {
    const [activeTab, setActiveTab] = useState('stocks'); // 'stocks' or 'coins'
    const [stocks, setStocks] = useState(STOCK_MOCK);
    const [coins, setCoins] = useState(COIN_MOCK);

    // 10초마다 데이터 갱신 (Polling Mock)
    useEffect(() => {
        const interval = setInterval(() => {
            const updateData = (prev) => prev.map(item => ({
                ...item,
                price: (parseFloat(item.price.replace(/,/g, '')) * (1 + (Math.random() * 0.01 - 0.005))).toLocaleString(undefined, { maximumFractionDigits: 0 }),
                change: (Math.random() * 10 - 5).toFixed(2),
                isPositive: Math.random() > 0.5
            }));

            if (activeTab === 'stocks') {
                setStocks(updateData);
            } else {
                setCoins(updateData);
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [activeTab]);

    const displayedData = activeTab === 'stocks' ? stocks : coins;

    return (
        <div className="bg-white dark:bg-[#111111]">
            {/* Tab Navigation */}
            <div className="sticky top-[60px] z-20 bg-white dark:bg-[#111111] border-b border-toss-gray-100 dark:border-gray-800">
                <div className="flex px-5 gap-8 items-center h-12">
                    <button
                        onClick={() => setActiveTab('stocks')}
                        className={`flex flex-col items-center shrink-0 justify-center h-full border-b-2 transition-all ${activeTab === 'stocks' ? 'border-toss-gray-800 dark:border-white' : 'border-transparent'
                            }`}
                    >
                        <p className={`text-[15px] tracking-tight ${activeTab === 'stocks' ? 'text-toss-gray-800 dark:text-white font-bold' : 'text-toss-gray-600 dark:text-gray-500 font-medium'
                            }`}>
                            주식 랭킹
                        </p>
                    </button>
                    <button
                        onClick={() => setActiveTab('coins')}
                        className={`flex flex-col items-center shrink-0 justify-center h-full border-b-2 transition-all ${activeTab === 'coins' ? 'border-toss-gray-800 dark:border-white' : 'border-transparent'
                            }`}
                    >
                        <p className={`text-[15px] tracking-tight ${activeTab === 'coins' ? 'text-toss-gray-800 dark:text-white font-bold' : 'text-toss-gray-600 dark:text-gray-500 font-medium'
                            }`}>
                            코인 랭킹
                        </p>
                    </button>
                </div>
            </div>

            {/* Main Content - List */}
            <div className="px-5 py-4 space-y-1">
                {displayedData.map((item, idx) => (
                    <div
                        key={item.id}
                        className="flex items-center gap-4 py-4 active:bg-gray-50 dark:active:bg-white/5 transition-colors cursor-pointer group"
                    >
                        <span className={`text-toss-gray-800 dark:text-white text-lg font-bold w-4 text-center ${idx >= 3 ? 'text-opacity-50' : ''}`}>
                            {idx + 1}
                        </span>

                        {/* Round Icon Container */}
                        <div className="w-10 h-10 rounded-full bg-toss-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden border border-toss-gray-200 dark:border-gray-700">
                            <span className="material-symbols-outlined text-toss-gray-600 dark:text-gray-400">
                                {activeTab === 'stocks' ? 'trending_up' : 'currency_bitcoin'}
                            </span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-toss-gray-800 dark:text-white text-[16px] font-semibold truncate leading-snug">
                                {item.name}
                            </p>
                            <p className={`text-[13px] font-medium truncate ${item.change.startsWith('+') || item.isPositive ? 'text-red-500' : 'text-blue-500'}`}>
                                {item.price}원 ({item.change.startsWith('+') || item.isPositive ? '+' : ''}{item.change}%)
                            </p>
                        </div>

                        <span className="material-symbols-outlined text-toss-gray-200 dark:text-gray-700">chevron_right</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default FinancialRanking;
