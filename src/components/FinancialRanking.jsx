import React, { useState, useEffect } from 'react';

function FinancialRanking() {
    const [activeTab, setActiveTab] = useState('kr'); // 'kr', 'global', 'crypto'
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            const endpoint = {
                'kr': '/api/financial/stocks/kr',
                'global': '/api/financial/stocks/global',
                'crypto': '/api/financial/crypto'
            }[activeTab];
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error('데이터를 가져오는 데 실패했습니다.');
            const result = await response.json();
            setData(result);
            setError(null);
        } catch (error) {
            console.error('Fetch Error:', error);
            setError('실시간 데이터를 불러올 수 없습니다. 서버 상태를 확인해주세요.');
        } finally {
            setLoading(false);
        }
    };

    // 탭 변경 시 즉시 갱신 및 10초마다 주기적 갱신
    useEffect(() => {
        setLoading(true);
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [activeTab]);

    const tabIcons = {
        'kr': 'trending_up',
        'global': 'public',
        'crypto': 'currency_bitcoin'
    };

    return (
        <div className="bg-white dark:bg-[#111111] flex-1 flex flex-col min-h-[500px]">
            {/* Tab Navigation */}
            <div className="sticky top-[60px] z-20 bg-white dark:bg-[#111111] border-b border-toss-gray-100 dark:border-gray-800">
                <div className="flex overflow-x-auto no-scrollbar px-5 gap-6 items-center h-12">
                    {[
                        { id: 'kr', name: '국내 주식' },
                        { id: 'global', name: '해외 주식' },
                        { id: 'crypto', name: '가상화폐' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex flex-col items-center shrink-0 justify-center h-full border-b-2 transition-all ${activeTab === tab.id ? 'border-toss-gray-800 dark:border-white' : 'border-transparent'}`}
                        >
                            <p className={`text-[15px] tracking-tight ${activeTab === tab.id ? 'text-toss-gray-800 dark:text-white font-bold' : 'text-toss-gray-600 dark:text-gray-500 font-medium'}`}>
                                {tab.name}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content - List */}
            <div className="px-5 py-4 space-y-1 flex-1">
                {error ? (
                    <div className="py-20 text-center">
                        <span className="material-symbols-outlined text-4xl text-toss-gray-200 mb-2">error</span>
                        <p className="text-toss-gray-600 dark:text-gray-400 text-[15px]">{error}</p>
                    </div>
                ) : loading && data.length === 0 ? (
                    <div className="py-20 text-center text-toss-gray-600 dark:text-gray-400">데이터를 불러오는 중...</div>
                ) : (
                    data.map((item, idx) => (
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
                                    {tabIcons[activeTab]}
                                </span>
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-toss-gray-800 dark:text-white text-[16px] font-semibold truncate leading-snug">
                                    {item.name}
                                </p>
                                <p className={`text-[13px] font-medium truncate ${item.isPositive ? 'text-red-500' : 'text-blue-500'}`}>
                                    {item.price}원 ({item.isPositive ? '+' : ''}{item.change}%)
                                </p>
                            </div>

                            <span className="material-symbols-outlined text-toss-gray-200 dark:text-gray-700">chevron_right</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default FinancialRanking;
