import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MOCK_KR_STOCKS, US_STOCK_SYMBOLS, CRYPTO_IDS } from '../data/mockFinancialData';
import { geminiRequest, extractJSON, enqueueGeminiRequest } from '../utils/geminiUtils';

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const NEWS_CACHE_KEY = 'financial_news_cache';

function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const TABS = [
    { id: 'kr', label: '국내주식', icon: '🇰🇷' },
    { id: 'us', label: '해외주식', icon: '🇺🇸' },
    { id: 'crypto', label: '가상화폐', icon: '₿' },
];

export default function FinancialRanking() {
    const [activeTab, setActiveTab] = useState('kr');
    const [krStocks, setKrStocks] = useState(MOCK_KR_STOCKS);
    const [usStocks, setUsStocks] = useState([]);
    const [cryptos, setCryptos] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isLive, setIsLive] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [newsData, setNewsData] = useState(null);
    const [newsLoading, setNewsLoading] = useState(false);
    const intervalRef = useRef(null);
    const isMountedRef = useRef(true);

    // ══════════════════════════════════════════
    // 1. 해외주식 (Finnhub) - 동일
    // ══════════════════════════════════════════
    const fetchUSStocks = useCallback(async () => {
        if (!FINNHUB_KEY) return;
        try {
            const results = await Promise.allSettled(
                US_STOCK_SYMBOLS.map(s =>
                    fetch(`https://finnhub.io/api/v1/quote?symbol=${s.symbol}&token=${FINNHUB_KEY}`)
                        .then(r => r.json())
                )
            );

            const stocks = US_STOCK_SYMBOLS.map((s, i) => {
                const r = results[i];
                if (r.status === 'fulfilled' && r.value.c) {
                    const data = r.value;
                    return {
                        symbol: s.symbol,
                        name: s.name,
                        nameKr: s.nameKr,
                        sector: s.sector,
                        price: data.c,
                        change: data.c && data.pc ? ((data.c - data.pc) / data.pc * 100) : 0,
                        high: data.h,
                        low: data.l,
                        open: data.o,
                        prevClose: data.pc,
                    };
                }
                return { ...s, price: 0, change: 0 };
            }).filter(s => s.price > 0);

            if (isMountedRef.current && stocks.length > 0) {
                setUsStocks(stocks);
                setLastUpdated(new Date());
                setIsLive(true);
            }
        } catch (e) {
            console.warn('Finnhub error:', e.message);
        }
    }, []);

    // ══════════════════════════════════════════
    // 2. 가상화폐 (CoinGecko) - 동일
    // ══════════════════════════════════════════
    const fetchCrypto = useCallback(async () => {
        try {
            const ids = CRYPTO_IDS.join(',');
            const res = await fetch(
                `https://api.coingecko.com/api/v3/coins/markets?vs_currency=krw&ids=${ids}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`
            );
            if (!res.ok) return;
            const data = await res.json();

            if (isMountedRef.current && data?.length > 0) {
                setCryptos(data.map((c, i) => ({
                    rank: i + 1,
                    id: c.id,
                    symbol: c.symbol?.toUpperCase(),
                    name: c.name,
                    image: c.image,
                    price: c.current_price,
                    change: c.price_change_percentage_24h || 0,
                    marketCap: c.market_cap,
                    volume: c.total_volume,
                    high24h: c.high_24_h || c.high_24h,
                    low24h: c.low_24_h || c.low_24h,
                })));
                setLastUpdated(new Date());
                setIsLive(true);
            }
        } catch (e) {
            console.warn('CoinGecko error:', e.message);
        }
    }, []);

    // ══════════════════════════════════════════
    // 3. 국내주식 (Gemini) - ✅ 캐시 강화 + 큐
    // ══════════════════════════════════════════
    const fetchKRStocks = useCallback(async () => {
        const cacheKey = `kr_stocks_${getTodayKey()}`;

        // 캐시 확인
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                // ✅ 캐시가 12시간 이내면 사용 (더 넉넉하게)
                if (data?.length > 0 && Date.now() - timestamp < 12 * 60 * 60 * 1000) {
                    setKrStocks(data);
                    return;
                }
            }
        } catch (e) { }

        if (!GEMINI_KEY) return;

        try {
            const raw = await enqueueGeminiRequest(() =>
                geminiRequest(
                    `오늘 한국 주식시장(KOSPI, KOSDAQ) 시가총액 TOP 10 종목의 현재 정보를 알려주세요.
반드시 JSON 배열만 출력:
[{"symbol":"005930","name":"삼성전자","price":72400,"change":1.12,"volume":"18,234,567","marketCap":"432조","sector":"반도체"}]
change는 전일 대비 등락률(%)입니다.`,
                    { useSearch: true }
                )
            );

            const parsed = extractJSON(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const data = parsed.slice(0, 10);
                setKrStocks(data);
                localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
            }
        } catch (e) {
            console.warn('KR stocks Gemini error:', e.message);
            // ✅ 실패 시 Mock 데이터 유지 (이미 초기값)
        }
    }, []);

    // ══════════════════════════════════════════
    // 4. 뉴스/호재 분석 - ✅ 캐시 강화 + 큐 + Fallback
    // ══════════════════════════════════════════
    const fetchNews = useCallback(async (item) => {
        const key = `${NEWS_CACHE_KEY}_${item.symbol || item.id}_${getTodayKey()}`;

        // ✅ 캐시 확인 (하루 단위)
        try {
            const cached = localStorage.getItem(key);
            if (cached) {
                setNewsData(JSON.parse(cached));
                return;
            }
        } catch (e) { }

        if (!GEMINI_KEY) {
            setNewsData({ summary: 'API 키가 설정되지 않았습니다.', sentiment: '중립', items: [] });
            return;
        }

        setNewsLoading(true);
        try {
            const stockName = item.nameKr || item.name;
            const raw = await enqueueGeminiRequest(() =>
                geminiRequest(
                    `"${stockName}" (${item.symbol || item.id})에 대한 오늘의 투자 뉴스 및 호재/악재를 분석해주세요.
반드시 JSON만 출력:
{
  "summary": "한줄 종합 의견 (50자 이내)",
  "sentiment": "긍정 또는 부정 또는 중립",
  "items": [
    {"title": "뉴스 제목", "type": "호재 또는 악재 또는 중립", "detail": "한줄 설명"}
  ]
}
items는 최대 5개.`,
                    { useSearch: true }
                )
            );

            const parsed = extractJSON(raw);
            localStorage.setItem(key, JSON.stringify(parsed));
            setNewsData(parsed);
        } catch (e) {
            console.warn('News fetch error:', e.message);
            setNewsData({
                summary: '분석 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
                sentiment: '중립',
                items: [
                    {
                        title: 'API 요청 제한',
                        type: '중립',
                        detail: '일일 무료 할당량을 초과했습니다. 캐시된 데이터가 없어 표시할 수 없습니다.'
                    }
                ]
            });
        } finally {
            setNewsLoading(false);
        }
    }, []);

    // ══════════════════════════════════════════
    // 인터벌 관리 (동일)
    // ══════════════════════════════════════════
    useEffect(() => {
        isMountedRef.current = true;

        if (activeTab === 'us') fetchUSStocks();
        else if (activeTab === 'crypto') fetchCrypto();
        else fetchKRStocks();

        if (activeTab === 'us' || activeTab === 'crypto') {
            intervalRef.current = setInterval(() => {
                if (activeTab === 'us') fetchUSStocks();
                else if (activeTab === 'crypto') fetchCrypto();
            }, 10000);
        }

        return () => {
            isMountedRef.current = false;
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [activeTab, fetchUSStocks, fetchCrypto, fetchKRStocks]);

    const currentData = activeTab === 'kr' ? krStocks
        : activeTab === 'us' ? usStocks
            : cryptos;

    function formatPrice(price, tab) {
        if (!price) return '-';
        if (tab === 'us') return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (tab === 'crypto') return `₩${price.toLocaleString('ko-KR')}`;
        return `₩${Number(price).toLocaleString('ko-KR')}`;
    }

    function formatMarketCap(val, tab) {
        if (!val) return '-';
        if (tab === 'crypto') {
            if (val >= 1e12) return `₩${(val / 1e12).toFixed(1)}조`;
            if (val >= 1e8) return `₩${(val / 1e8).toFixed(0)}억`;
            return `₩${val.toLocaleString()}`;
        }
        return val;
    }

    return (
        <div className="flex-1 overflow-y-auto no-scrollbar">
            {/* 탭 */}
            <div className="bg-white dark:bg-[#111111] border-b border-toss-gray-100 dark:border-gray-800 shrink-0">
                <div className="flex px-5 gap-2 py-3">
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setSelectedItem(null); }}
                                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[14px] font-semibold transition-all border ${isActive
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white dark:bg-[#1a1a1a] text-toss-gray-700 dark:text-gray-300 border-toss-gray-200 dark:border-gray-700'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 상태 바 */}
            <div className="px-5 pt-3 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    {(activeTab !== 'kr' && isLive) && (
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    )}
                    <p className="text-[13px] text-toss-gray-600 dark:text-gray-400">
                        {activeTab === 'kr'
                            ? '매일 자동 업데이트'
                            : lastUpdated
                                ? `실시간 · ${lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                                : '연결 중...'
                        }
                    </p>
                </div>
                <div className="flex items-center gap-1 text-[12px] text-toss-gray-400 dark:text-gray-600">
                    <span className="material-symbols-outlined text-[14px]">
                        {activeTab === 'kr' ? 'schedule' : 'sensors'}
                    </span>
                    {activeTab === 'kr' ? '매일 정각' : '10초마다 갱신'}
                </div>
            </div>

            {/* 로딩 */}
            {currentData.length === 0 && (activeTab === 'us' || activeTab === 'crypto') && (
                <div className="px-5 py-4 space-y-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 py-4 animate-pulse">
                            <div className="w-4 h-5 bg-gray-200 dark:bg-gray-800 rounded" />
                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
                                <div className="h-3 bg-gray-100 dark:bg-gray-900 rounded w-1/3" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 리스트 */}
            {currentData.length > 0 && (
                <div className="px-5 py-2 space-y-0.5 pb-32">
                    {currentData.slice(0, 10).map((item, idx) => {
                        const changeVal = Number(item.change) || 0;
                        const isUp = changeVal > 0;
                        const isDown = changeVal < 0;

                        return (
                            <div
                                key={item.symbol || item.id || idx}
                                onClick={() => { setSelectedItem(item); setNewsData(null); fetchNews(item); }}
                                className="flex items-center gap-4 py-4 active:bg-gray-50 dark:active:bg-white/5 transition-colors cursor-pointer"
                            >
                                <span className={`text-lg font-bold w-4 text-center ${idx < 3 ? 'text-primary' : 'text-toss-gray-400 dark:text-gray-600'}`}>
                                    {idx + 1}
                                </span>

                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-toss-gray-100 dark:bg-gray-800 overflow-hidden shrink-0">
                                    {activeTab === 'crypto' && item.image ? (
                                        <img src={item.image} alt={item.name} className="w-7 h-7" />
                                    ) : (
                                        <span className="text-[14px] font-bold text-toss-gray-600 dark:text-gray-400">
                                            {(item.symbol || '').slice(0, 3)}
                                        </span>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-toss-gray-800 dark:text-white text-[15px] font-semibold truncate">
                                        {item.nameKr || item.name}
                                    </p>
                                    <p className="text-toss-gray-500 dark:text-gray-500 text-[12px]">
                                        {item.symbol} {item.sector ? `· ${item.sector}` : ''}
                                    </p>
                                </div>

                                <div className="flex flex-col items-end shrink-0">
                                    <p className="text-[15px] font-bold text-toss-gray-800 dark:text-white">
                                        {formatPrice(item.price, activeTab)}
                                    </p>
                                    <p className={`text-[13px] font-semibold ${isUp ? 'text-red-500' : isDown ? 'text-blue-500' : 'text-toss-gray-400'}`}>
                                        {isUp ? '▲' : isDown ? '▼' : '-'} {Math.abs(changeVal).toFixed(2)}%
                                    </p>
                                </div>
                            </div>
                        );
                    })}

                    <div className="mt-6 p-4 bg-toss-gray-50 dark:bg-gray-900/50 rounded-2xl">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-[16px] text-primary">
                                {activeTab === 'kr' ? 'smart_toy' : 'sensors'}
                            </span>
                            <span className="text-[12px] font-bold text-primary">
                                {activeTab === 'kr' ? 'AI Powered by Gemini'
                                    : activeTab === 'us' ? 'Powered by Finnhub'
                                        : 'Powered by CoinGecko'}
                            </span>
                        </div>
                        <p className="text-[11px] text-toss-gray-600 dark:text-gray-500 leading-relaxed">
                            {activeTab === 'kr'
                                ? '국내 주식 정보는 매일 정각에 AI가 자동 업데이트합니다. 종목 클릭 시 AI 호재/악재 분석을 볼 수 있습니다.'
                                : '실시간 시세는 10초마다 자동 갱신됩니다. 종목 클릭 시 AI 뉴스 분석을 볼 수 있습니다.'}
                        </p>
                    </div>
                </div>
            )}

            {/* 상세 바텀시트 */}
            {selectedItem && (
                <div
                    className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-[2px]"
                    onClick={() => setSelectedItem(null)}
                >
                    <div
                        className="bg-white dark:bg-[#111111] rounded-t-[32px] p-8 w-full max-w-[430px] mx-auto shadow-[0_-8px_30px_rgb(0,0,0,0.12)] max-h-[85vh] overflow-y-auto no-scrollbar"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-12 h-1.5 bg-toss-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-6 cursor-pointer"
                            onClick={() => setSelectedItem(null)} />

                        <div className="flex justify-between items-start mb-5">
                            <div className="flex-1">
                                <p className="text-primary font-bold text-sm mb-1">
                                    {selectedItem.symbol} · {selectedItem.sector || (activeTab === 'crypto' ? '가상화폐' : '')}
                                </p>
                                <h2 className="text-[26px] font-bold text-toss-gray-800 dark:text-white leading-tight">
                                    {selectedItem.nameKr || selectedItem.name}
                                </h2>
                            </div>
                            <button
                                className="w-10 h-10 flex items-center justify-center bg-toss-gray-100 dark:bg-gray-800 rounded-full"
                                onClick={() => setSelectedItem(null)}
                            >
                                <span className="material-symbols-outlined text-[20px] text-toss-gray-600 dark:text-gray-400">close</span>
                            </button>
                        </div>

                        <div className="bg-toss-gray-50 dark:bg-gray-900/50 rounded-[20px] p-5 mb-5">
                            <p className="text-[28px] font-bold text-toss-gray-800 dark:text-white mb-1">
                                {formatPrice(selectedItem.price, activeTab)}
                            </p>
                            <p className={`text-[16px] font-semibold ${Number(selectedItem.change) > 0 ? 'text-red-500' : Number(selectedItem.change) < 0 ? 'text-blue-500' : 'text-gray-400'}`}>
                                {Number(selectedItem.change) > 0 ? '▲' : Number(selectedItem.change) < 0 ? '▼' : '-'}{' '}
                                {Math.abs(Number(selectedItem.change)).toFixed(2)}% 오늘
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {activeTab === 'us' && (
                                <>
                                    <MiniCard label="시가" value={formatPrice(selectedItem.open, 'us')} />
                                    <MiniCard label="전일 종가" value={formatPrice(selectedItem.prevClose, 'us')} />
                                    <MiniCard label="고가" value={formatPrice(selectedItem.high, 'us')} />
                                    <MiniCard label="저가" value={formatPrice(selectedItem.low, 'us')} />
                                </>
                            )}
                            {activeTab === 'crypto' && (
                                <>
                                    <MiniCard label="24h 고가" value={formatPrice(selectedItem.high24h, 'crypto')} />
                                    <MiniCard label="24h 저가" value={formatPrice(selectedItem.low24h, 'crypto')} />
                                    <MiniCard label="시가총액" value={formatMarketCap(selectedItem.marketCap, 'crypto')} />
                                    <MiniCard label="거래량" value={formatMarketCap(selectedItem.volume, 'crypto')} />
                                </>
                            )}
                            {activeTab === 'kr' && (
                                <>
                                    <MiniCard label="시가총액" value={selectedItem.marketCap || '-'} />
                                    <MiniCard label="거래량" value={selectedItem.volume || '-'} />
                                    <MiniCard label="섹터" value={selectedItem.sector || '-'} />
                                    <MiniCard label="종목코드" value={selectedItem.symbol || '-'} />
                                </>
                            )}
                        </div>

                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="material-symbols-outlined text-primary text-[20px]">smart_toy</span>
                                <h3 className="text-[16px] font-bold text-toss-gray-800 dark:text-white">AI 호재/악재 분석</h3>
                                <span className="text-[11px] text-toss-gray-400 dark:text-gray-600">매일 업데이트</span>
                            </div>

                            {newsLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="animate-pulse bg-toss-gray-100 dark:bg-gray-800 rounded-2xl h-16" />
                                    ))}
                                </div>
                            ) : newsData ? (
                                <div className="space-y-3">
                                    <div className={`p-4 rounded-2xl border ${newsData.sentiment === '긍정' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                                        : newsData.sentiment === '부정' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                                            : 'bg-toss-gray-50 dark:bg-gray-900/50 border-toss-gray-200 dark:border-gray-700'
                                        }`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[13px] font-bold px-2 py-0.5 rounded-full ${newsData.sentiment === '긍정' ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                                                : newsData.sentiment === '부정' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
                                                }`}>
                                                {newsData.sentiment === '긍정' ? '🔥 긍정' : newsData.sentiment === '부정' ? '❄️ 부정' : '➖ 중립'}
                                            </span>
                                        </div>
                                        <p className="text-[14px] font-medium text-toss-gray-700 dark:text-gray-300">
                                            {newsData.summary}
                                        </p>
                                    </div>

                                    {newsData.items?.map((n, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 bg-toss-gray-50 dark:bg-gray-900/50 rounded-xl">
                                            <span className={`text-[12px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${n.type === '호재' ? 'bg-red-100 dark:bg-red-900/20 text-red-500'
                                                : n.type === '악재' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-500'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                                }`}>
                                                {n.type}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-semibold text-toss-gray-800 dark:text-white leading-snug">{n.title}</p>
                                                <p className="text-[12px] text-toss-gray-500 dark:text-gray-400 mt-0.5">{n.detail}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MiniCard({ label, value }) {
    return (
        <div className="bg-toss-gray-50 dark:bg-gray-900/50 p-3.5 rounded-[16px] border border-toss-gray-100 dark:border-gray-800/50">
            <p className="text-[11px] text-toss-gray-500 dark:text-gray-500 mb-1">{label}</p>
            <p className="text-[14px] font-bold text-toss-gray-800 dark:text-white">{value}</p>
        </div>
    );
}
