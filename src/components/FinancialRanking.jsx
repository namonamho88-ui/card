import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MOCK_KR_STOCKS, US_STOCK_SYMBOLS, CRYPTO_IDS } from '../data/mockFinancialData';
import { geminiRequest, extractJSON, enqueueGeminiRequest, isOverloadAlertShown, markOverloadAlertAsShown } from '../utils/geminiUtils';
import OverloadModal from './OverloadModal';

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const NEWS_CACHE_KEY = 'financial_news_cache';

function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getYesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
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
    const [krTimer, setKrTimer] = useState(0);     // ✅ 신규: 국장 타이머
    const [newsTimer, setNewsTimer] = useState(0); // ✅ 신규: 뉴스 타이머
    const [serverOverload, setServerOverload] = useState(false); // ✅ 서버 과부하
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
                if (data?.length > 0 && Date.now() - timestamp < 12 * 60 * 60 * 1000) {
                    setKrStocks(data);
                    return;
                }
            }
        } catch (e) { }

        // ✅ 1단계: 사전 생성된 주가 JSON fetch 시도
        try {
            const res = await fetch(`${import.meta.env.BASE_URL}reports/kr-stocks.json?t=${Date.now()}`);
            if (res.ok) {
                const json = await res.json();
                const today = getTodayKey();
                const yesterday = getYesterdayKey();
                // 오늘 또는 어제 데이터면 수용 (01시 생성 고려)
                if ((json?.date === today || json?.date === yesterday) && json?.data?.length > 0) {
                    setKrStocks(json.data);
                    setIsLive(true);
                    setLastUpdated(new Date(json.generatedAt));
                    localStorage.setItem(cacheKey, JSON.stringify({ data: json.data, timestamp: Date.now() }));
                    console.log('✅ 국내주식: 사전 생성 데이터 로드 완료');
                    return;
                }
            }
        } catch (e) {
            console.warn('사전 생성 주가 데이터 없음, Gemini fallback 시도');
        }

        // ✅ 2단계: Fallback — Gemini API 호출
        if (!GEMINI_KEY) return;
        setKrTimer(20);
        setServerOverload(false);
        let krSeconds = 0;
        const tInt = setInterval(() => {
            krSeconds += 1;
            if (krSeconds >= 20) setServerOverload(true);
            setKrTimer(p => p <= 1 ? p : p - 1);
        }, 1000);

        try {
            const raw = await enqueueGeminiRequest(() =>
                geminiRequest(
                    `오늘 한국 주식시장(KOSPI, KOSDAQ) 시가총액 상위 10개 종목의 정보를 JSON 배열 형식으로 제공하세요.
각 객체는 다음 필드를 반드시 포함해야 합니다: [{"symbol":"6자리코드", "name":"종목명", "price":숫자, "change":숫자, "volume":"거래량", "marketCap":"시총", "sector":"업종"}]
다른 텍스트 없이 유효한 JSON 배열만 출력하세요.`,
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
            if (e.message.includes('과부하')) {
                setServerOverload(true);
            }
        } finally {
            clearInterval(tInt);
            setKrTimer(0);
            setServerOverload(false);
        }
    }, []);

    // ══════════════════════════════════════════
    // 4. 뉴스/호재 분석 - ✅ 사전 생성 데이터 우선 + Gemini Fallback
    // ══════════════════════════════════════════
    const fetchNews = useCallback(async (item, category) => {
        const key = `${NEWS_CACHE_KEY}_${item.symbol || item.id}_${getTodayKey()}`;

        // ✅ 캐시 확인 (하루 단위) + 구조 검증
        try {
            const cached = localStorage.getItem(key);
            if (cached) {
                const parsedCache = JSON.parse(cached);
                // 유효한 구조인지 확인
                if (parsedCache && typeof parsedCache === 'object' && parsedCache.summary && parsedCache.sentiment) {
                    setNewsLoading(false);
                    setNewsData(parsedCache);
                    return;
                } else {
                    // 잘못된 캐시 제거
                    localStorage.removeItem(key);
                }
            }
        } catch (e) {
            localStorage.removeItem(key);
        }

        // ✅ 1단계: 사전 생성된 통합 분석 JSON fetch 시도
        try {
            const res = await fetch(`${import.meta.env.BASE_URL}reports/financial-analysis.json?t=${Date.now()}`);
            if (res.ok) {
                const json = await res.json();
                const today = getTodayKey();
                const yesterday = getYesterdayKey();
                // 오늘 또는 어제 데이터면 수용
                if (json?.date === today || json?.date === yesterday) {
                    // 해당 카테고리(kr, us, crypto)에서 종목 찾기
                    const catData = json[category];
                    const preGenerated = catData?.find(d => d.id === (item.symbol || item.id) || d.symbol === (item.symbol || item.id));

                    if (preGenerated) {
                        const normalizedData = {
                            summary: preGenerated.summary,
                            sentiment: preGenerated.sentiment,
                            items: preGenerated.items || [],
                            isPreGenerated: true
                        };
                        setNewsData(normalizedData);
                        setNewsLoading(false);
                        localStorage.setItem(key, JSON.stringify(normalizedData));
                        console.log(`✅ [${category}] ${item.name} 사전 분석 로드 완료`);
                        return;
                    }
                }
            }
        } catch (e) {
            console.warn('사전 분석 데이터 로드 실패, Gemini fallback 시도');
        }

        if (!GEMINI_KEY) {
            setNewsData({ summary: 'API 키가 설정되지 않았습니다.', sentiment: '중립', items: [] });
            return;
        }

        setNewsTimer(15); // 뉴스 분석은 약 15초
        setServerOverload(false);
        let newsSeconds = 0;
        const tInt = setInterval(() => {
            newsSeconds += 1;
            if (newsSeconds >= 20) setServerOverload(true);
            setNewsTimer(p => p <= 1 ? p : p - 1);
        }, 1000);

        try {
            const stockName = item.nameKr || item.name;

            // ✅ Fallback 프롬프트도 더 상세하게 강화
            const fullText = await enqueueGeminiRequest(() =>
                geminiRequest(
                    `"${stockName}" (${item.symbol || item.id})의 최신 동향과 뉴스(호재/악재)를 상세히 분석하여 JSON으로 반환하세요.
{
  "summary": "현재 상황에 대한 4~5문장 분량의 상세 요약",
  "sentiment": "긍정/부정/중립",
  "items": [
    {"title": "이슈 제목", "type": "호재/악재/중립", "detail": "해당 이슈에 대한 3~4문장 분량의 심층 분석 및 전망"}
  ]
}
최소 3개 이상의 아이템을 포함하세요. 답변에 JSON 외 다른 텍스트는 절대 포함하지 마세요.`,
                    { useSearch: true }
                )
            );

            const parsed = extractJSON(fullText);
            // ✅ 파싱된 데이터를 정규화: 구조가 다를 경우 대비
            let normalizedData;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                normalizedData = {
                    summary: parsed.summary || '분석 결과를 확인하세요.',
                    sentiment: parsed.sentiment || '중립',
                    items: Array.isArray(parsed.items) ? parsed.items : [],
                };
            } else if (Array.isArray(parsed)) {
                // 배열로 반환된 경우 items로 변환
                normalizedData = {
                    summary: '뉴스 분석 결과입니다.',
                    sentiment: '중립',
                    items: parsed.map(p => ({
                        title: p.title || p.headline || '뉴스',
                        type: p.type || p.sentiment || '중립',
                        detail: p.detail || p.description || p.summary || '',
                    })),
                };
            } else {
                normalizedData = {
                    summary: String(parsed || '분석 완료'),
                    sentiment: '중립',
                    items: [],
                };
            }
            localStorage.setItem(key, JSON.stringify(normalizedData));
            setNewsData(normalizedData);
        } catch (e) {
            console.warn('News fetch error:', e.message);
            if (e.message.includes('과부하')) {
                if (!isOverloadAlertShown()) {
                    setServerOverload(true);
                    markOverloadAlertAsShown();
                }
            }
            const errorMsg = e.message.includes('과부하')
                ? '⚠️ Google AI 서버가 과부하 상태입니다. 잠시 후 다시 시도해 주세요.'
                : '분석 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
            setNewsData({
                summary: errorMsg,
                sentiment: '중립',
                items: [
                    {
                        title: e.message.includes('과부하') ? '서버 과부하' : 'API 요청 제한',
                        type: '중립',
                        detail: e.message.includes('과부하')
                            ? '현재 Google AI 서버가 과부하 상태입니다. 잠시 후에 다시 시도해 주세요.'
                            : '일일 무료 할당량을 초과했습니다. 캐시된 데이터가 없어 표시할 수 없습니다.'
                    }
                ]
            });
        } finally {
            setNewsLoading(false);
            clearInterval(tInt);
            setNewsTimer(0);
            setServerOverload(false);
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
                                : krTimer > 0 ? `AI 분석 중... ${krTimer}초 남음` : '연결 중...'
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
                                onClick={() => {
                                    setSelectedItem(item);
                                    setNewsData(null);
                                    setNewsLoading(true); // ✅ 즉시 로딩 시작
                                    fetchNews(item, activeTab);
                                }}
                                className="flex items-center gap-4 py-4 px-1 rounded-2xl active:bg-toss-gray-50 dark:active:bg-gray-900 transition-colors cursor-pointer group"
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
                                {newsData?.isPreGenerated && (
                                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">Pre-analysis</span>
                                )}
                                <span className="text-[11px] text-toss-gray-400 dark:text-gray-600">매일 01:00 기준</span>
                            </div>

                            {newsLoading ? (
                                <div className="space-y-3">
                                    {/* 로딩 상태 헤더 */}
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-primary text-[24px] animate-spin">progress_activity</span>
                                        <span className="text-[14px] font-semibold text-toss-gray-600 dark:text-gray-400">
                                            {serverOverload
                                                ? '⚠️ 서버 응답 지연 중... 잠시만 기다려주세요'
                                                : `AI가 분석 중입니다 (약 ${newsTimer}초 남음)`
                                            }
                                        </span>
                                    </div>

                                    {/* 스켈레톤 카드 */}
                                    {[1, 2].map(i => (
                                        <div key={i}
                                            className="relative overflow-hidden bg-toss-gray-100 dark:bg-gray-800 rounded-2xl h-16"
                                        >
                                            <div className="flex items-center gap-3 p-4 h-full opacity-50">
                                                <div className="w-10 h-5 bg-toss-gray-200/60 dark:bg-gray-700 rounded-md" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-3.5 bg-toss-gray-200/60 dark:bg-gray-700 rounded w-3/4" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : newsData ? (
                                <div className="space-y-3">
                                    <div className={`p-4 rounded-2xl border mb-3 ${newsData.sentiment === '긍정' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                                        : newsData.sentiment === '부정' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                                            : 'bg-toss-gray-50 dark:bg-gray-900/50 border-toss-gray-200 dark:border-gray-700'
                                        }`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${newsData.sentiment === '긍정' ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                                                : newsData.sentiment === '부정' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
                                                }`}>
                                                {newsData.sentiment === '긍정' ? '🔥 긍정' : newsData.sentiment === '부정' ? '❄️ 부정' : '➖ 중립'}
                                            </span>
                                        </div>
                                        <p className="text-[14px] font-medium text-toss-gray-700 dark:text-gray-300 leading-snug">
                                            {newsData.summary}
                                        </p>
                                    </div>

                                    {/* 뉴스 아이템 리스트 (세로 배열) */}
                                    <div className="flex flex-col gap-3">
                                        {newsData.items?.map((n, i) => (
                                            <div key={i} className="p-5 bg-toss-gray-50 dark:bg-gray-900/50 rounded-[24px] border border-toss-gray-100 dark:border-gray-800 shadow-sm">
                                                <div className="flex items-center gap-2 mb-2.5">
                                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${n.type === '호재' ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                                                        : n.type === '악재' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                                        }`}>
                                                        {n.type}
                                                    </span>
                                                </div>
                                                <h4 className="text-[15px] font-bold text-toss-gray-800 dark:text-white leading-tight mb-2">{n.title}</h4>
                                                <p className="text-[13px] text-toss-gray-600 dark:text-gray-400 leading-[1.6] whitespace-pre-wrap">{n.detail}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ 서버 과부하 안내창 */}
            <OverloadModal
                isOpen={serverOverload}
                onClose={() => setServerOverload(false)}
            />
        </div>
    );
}

function MiniCard({ label, value }) {
    return (
        <div className="bg-toss-gray-50 dark:bg-gray-900/50 p-3 rounded-[18px] border border-toss-gray-100 dark:border-gray-800/50">
            <p className="text-[11px] text-toss-gray-500 dark:text-gray-500 mb-0.5">{label}</p>
            <p className="text-[13px] font-bold text-toss-gray-800 dark:text-white">{value}</p>
        </div>
    );
}
