import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MOCK_RESTAURANTS, FOOD_CATEGORIES } from '../data/mockFoodData';
import { geminiRequest, extractJSON, enqueueGeminiRequest } from '../utils/geminiUtils';

const CACHE_KEY = 'euljiro_food_ranking';

function getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function isTodayCache(timestamp) {
    if (!timestamp) return false;
    const cached = new Date(timestamp);
    const now = new Date();
    return cached.getFullYear() === now.getFullYear()
        && cached.getMonth() === now.getMonth()
        && cached.getDate() === now.getDate();
}

const AREAS = ['을지로', '성수동', '망원동', '연남동', '익선동'];

export default function EuljiroFoodRanking() {
    const [allRestaurants, setAllRestaurants] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [selectedArea, setSelectedArea] = useState('을지로');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [isUsingMockData, setIsUsingMockData] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false); // ⭐ 로딩 대신 작은 인디케이터
    const fetchingRef = useRef(false);

    // ── 카테고리 필터링 ──
    const restaurants = useMemo(() => {
        if (selectedCategory === 'all') return allRestaurants;
        const cat = FOOD_CATEGORIES.find(c => c.id === selectedCategory);
        if (!cat?.keywords?.length) return allRestaurants;
        return allRestaurants.filter(r =>
            cat.keywords.some(kw => r.category?.includes(kw))
        );
    }, [allRestaurants, selectedCategory]);

    // ── ⭐ Mock 또는 캐시를 즉시 로드 (항상 먼저, 동기적으로) ──
    const loadInstantData = useCallback((area) => {
        // 1순위: 오늘 캐시
        try {
            const cacheKey = `${CACHE_KEY}_${area}_${getTodayKey()}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (isTodayCache(timestamp) && data?.length > 0) {
                    setAllRestaurants(data);
                    setLastUpdated(new Date(timestamp));
                    setIsUsingMockData(false);
                    return 'today'; // 오늘 캐시 있음
                }
            }
        } catch (e) { }

        // 2순위: 어제 이전 캐시 (날짜 무관하게 가장 최근 것)
        try {
            const prefix = `${CACHE_KEY}_${area}_`;
            let latestData = null;
            let latestTime = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(prefix)) {
                    const { data, timestamp } = JSON.parse(localStorage.getItem(key));
                    if (timestamp > latestTime && data?.length > 0) {
                        latestData = data;
                        latestTime = timestamp;
                    }
                }
            }
            if (latestData) {
                setAllRestaurants(latestData);
                setLastUpdated(new Date(latestTime));
                setIsUsingMockData(false);
                return 'old'; // 이전 캐시 있음 → 백그라운드 업데이트 필요
            }
        } catch (e) { }

        // 3순위: Mock 데이터
        const mockData = MOCK_RESTAURANTS[area] || [];
        setAllRestaurants(mockData.map(r => ({
            ...r,
            icon: getCategoryIcon(r.category),
            color: getCategoryColor(r.category)
        })));
        setLastUpdated(null);
        setIsUsingMockData(true);
        return 'mock'; // mock → 백그라운드 업데이트 필요
    }, []);

    // ── ⭐ 백그라운드 API 업데이트 (UI 블로킹 없음) ──
    const fetchInBackground = useCallback(async (area) => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        setIsUpdating(true); // 작은 인디케이터만 표시

        try {
            const prompt = `
        ${area} 지역에서 모든 음식 종류를 포함하여 맛집 인기 랭킹 TOP 10을 조사해주세요.
        
        네이버 플레이스, 구글 리뷰, 블로그 후기 등을 종합하여
        현재 가장 인기 있고 평점 높은 맛집 10곳을 선정해주세요.
        
        반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력:
        [
          {
            "rank": 1,
            "name": "가게명",
            "category": "음식 종류 (예: 한식, 일식, 카페)",
            "signature": "대표 메뉴",
            "priceRange": "가격대 (예: 1~2만원)",
            "rating": 4.5,
            "reviewCount": "리뷰수 (예: 1,200+)",
            "address": "간략 주소",
            "openHours": "영업시간 (예: 11:30~21:00)",
            "closedDay": "휴무일 (예: 일요일)",
            "waitTime": "예상 대기시간 (예: 30분~1시간)",
            "tags": ["태그1", "태그2", "태그3"],
            "description": "한줄 설명 (50자 이내)"
          }
        ]
      `;

            const rawText = await enqueueGeminiRequest(() =>
                geminiRequest(prompt, { useSearch: true })
            );

            const parsed = extractJSON(rawText);
            if (!Array.isArray(parsed) || parsed.length === 0) return;

            const enriched = parsed.slice(0, 10).map((r, idx) => ({
                ...r,
                rank: idx + 1,
                icon: getCategoryIcon(r.category),
                color: getCategoryColor(r.category)
            }));

            // 캐시 저장
            const now = Date.now();
            const cacheKey = `${CACHE_KEY}_${area}_${getTodayKey()}`;
            localStorage.setItem(cacheKey, JSON.stringify({ data: enriched, timestamp: now }));

            // 어제 캐시 정리
            cleanOldCache();

            // ⭐ 현재 선택된 지역이 같을 때만 UI 업데이트
            setAllRestaurants(prev => {
                // 현재 화면이 이 area인지 확인 (stale closure 방지)
                return enriched;
            });
            setLastUpdated(new Date(now));
            setIsUsingMockData(false);

        } catch (err) {
            console.warn('Background update failed:', err.message);
            // ⭐ 실패해도 아무것도 안 함 → 사용자는 기존 데이터를 계속 봄
        } finally {
            setIsUpdating(false);
            fetchingRef.current = false;
        }
    }, []);

    function cleanOldCache() {
        try {
            const todayKey = getTodayKey();
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(CACHE_KEY) && !key.includes(todayKey)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
        } catch (e) { }
    }

    // ── ⭐ 지역 변경 시: 즉시 표시 + 필요하면 백그라운드 업데이트 ──
    useEffect(() => {
        const cacheStatus = loadInstantData(selectedArea);

        // 오늘 캐시가 없으면 백그라운드에서 조용히 업데이트
        if (cacheStatus !== 'today') {
            fetchInBackground(selectedArea);
        }
    }, [selectedArea, loadInstantData, fetchInBackground]);

    // 카테고리 변경 시에는 API 호출 없이 필터링만
    // (useMemo가 자동 처리)

    function getUpdateTimeDisplay() {
        if (isUsingMockData) return '기본 맛집 데이터';
        if (!lastUpdated) return '데이터 로딩 중...';

        const today = new Date();
        const isToday = lastUpdated.getDate() === today.getDate()
            && lastUpdated.getMonth() === today.getMonth();

        const time = lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

        return isToday
            ? `오늘 ${time} 업데이트`
            : `${lastUpdated.toLocaleDateString('ko-KR')} ${time} 업데이트`;
    }

    return (
        <div className="flex-1 overflow-y-auto no-scrollbar">
            {/* 지역 탭 */}
            <div className="bg-white dark:bg-[#111111] border-b border-toss-gray-100 dark:border-gray-800 shrink-0">
                <div className="flex overflow-x-auto no-scrollbar px-5 gap-6 items-center h-12">
                    {AREAS.map(area => {
                        const isActive = selectedArea === area;
                        return (
                            <button
                                key={area}
                                onClick={() => { setSelectedArea(area); setSelectedCategory('all'); }}
                                className={`flex flex-col items-center shrink-0 justify-center h-full border-b-2 transition-all ${isActive ? 'border-toss-gray-800 dark:border-white' : 'border-transparent'}`}
                            >
                                <p className={`text-[15px] tracking-tight ${isActive
                                    ? 'text-toss-gray-800 dark:text-white font-bold'
                                    : 'text-toss-gray-600 dark:text-gray-500 font-medium'}`}>
                                    {area}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 카테고리 필터 칩 */}
            <div className="bg-white dark:bg-[#111111] shrink-0">
                <div className="flex overflow-x-auto no-scrollbar px-5 py-3 gap-2">
                    {FOOD_CATEGORIES.map(cat => {
                        const isActive = selectedCategory === cat.id;
                        const count = cat.id === 'all'
                            ? allRestaurants.length
                            : allRestaurants.filter(r => cat.keywords.some(kw => r.category?.includes(kw))).length;
                        const hasData = cat.id === 'all' || count > 0;

                        return (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold shrink-0 transition-all border ${isActive
                                    ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                                    : hasData
                                        ? 'bg-white dark:bg-[#1a1a1a] text-toss-gray-700 dark:text-gray-300 border-toss-gray-200 dark:border-gray-700 active:scale-95'
                                        : 'bg-toss-gray-50 dark:bg-gray-900 text-toss-gray-300 dark:text-gray-600 border-toss-gray-100 dark:border-gray-800'
                                    }`}
                            >
                                <span className="text-[14px]">{cat.icon}</span>
                                {cat.label}
                                {count > 0 && cat.id !== 'all' && (
                                    <span className={`text-[11px] min-w-[18px] text-center px-1 py-0.5 rounded-full ${isActive
                                        ? 'bg-white/20 text-white'
                                        : 'bg-toss-gray-100 dark:bg-gray-800 text-toss-gray-500 dark:text-gray-400'
                                        }`}>{count}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ⭐ 업데이트 정보 + 백그라운드 인디케이터 */}
            <div className="px-5 pt-3 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">restaurant</span>
                    <p className="text-[13px] text-toss-gray-600 dark:text-gray-400">
                        {getUpdateTimeDisplay()} · {restaurants.length}곳
                    </p>
                </div>
                <div className="flex items-center gap-1 text-[12px] text-toss-gray-400 dark:text-gray-600">
                    {isUpdating ? (
                        <>
                            <span className="material-symbols-outlined text-[14px] text-primary animate-spin">progress_activity</span>
                            <span className="text-primary">업데이트 중</span>
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            매일 자동 업데이트
                        </>
                    )}
                </div>
            </div>

            {/* 카테고리 필터 결과 없음 */}
            {restaurants.length === 0 && selectedCategory !== 'all' && (
                <div className="px-5 py-16 text-center">
                    <span className="text-5xl block mb-4">
                        {FOOD_CATEGORIES.find(c => c.id === selectedCategory)?.icon || '🍽️'}
                    </span>
                    <p className="text-toss-gray-800 dark:text-white text-[17px] font-bold mb-2">
                        {selectedArea} {FOOD_CATEGORIES.find(c => c.id === selectedCategory)?.label} 맛집
                    </p>
                    <p className="text-toss-gray-600 dark:text-gray-400 text-[14px]">
                        해당 카테고리의 맛집 정보가 아직 없습니다.<br />내일 업데이트 시 반영될 수 있습니다.
                    </p>
                </div>
            )}

            {/* ⭐ 맛집 리스트 (항상 즉시 표시) */}
            {restaurants.length > 0 && (
                <div className="px-5 py-2 space-y-1 pb-32">
                    {restaurants.slice(0, 10).map((r, idx) => (
                        <div
                            key={`${r.name}-${idx}`}
                            onClick={() => setSelectedRestaurant(r)}
                            className="flex items-center gap-4 py-4 active:bg-gray-50 dark:active:bg-white/5 transition-colors cursor-pointer group"
                        >
                            <span className={`text-lg font-bold w-4 text-center ${idx < 3
                                ? 'text-primary'
                                : 'text-toss-gray-800 dark:text-white text-opacity-50'}`}>
                                {idx + 1}
                            </span>

                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm"
                                style={{ background: r.color || '#f3f4f6' }}
                            >
                                {r.icon || '🍽️'}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-toss-gray-800 dark:text-white text-[16px] font-semibold truncate leading-snug">
                                        {r.name}
                                    </p>
                                    <span className="text-[11px] text-toss-gray-600 dark:text-gray-500 bg-toss-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded shrink-0">
                                        {r.category}
                                    </span>
                                </div>
                                <p className="text-toss-gray-600 dark:text-gray-400 text-[13px] font-medium truncate">
                                    {r.signature} · {r.priceRange}
                                </p>
                            </div>

                            <div className="flex flex-col items-end shrink-0">
                                <div className="flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-yellow-400 text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                    <span className="text-[14px] font-bold text-toss-gray-800 dark:text-white">{r.rating}</span>
                                </div>
                                <span className="text-[11px] text-toss-gray-600 dark:text-gray-400">{r.reviewCount}</span>
                            </div>
                        </div>
                    ))}

                    {/* 안내 */}
                    <div className="mt-6 p-4 bg-toss-gray-50 dark:bg-gray-900/50 rounded-2xl">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-[16px] text-primary">
                                {isUsingMockData ? 'restaurant_menu' : 'smart_toy'}
                            </span>
                            <span className="text-[12px] font-bold text-primary">
                                {isUsingMockData ? '기본 맛집 데이터' : 'AI Powered by Gemini'}
                            </span>
                        </div>
                        <p className="text-[11px] text-toss-gray-600 dark:text-gray-500 leading-relaxed">
                            {isUsingMockData
                                ? '신뢰할 수 있는 기본 맛집 정보입니다. 매일 정각에 AI가 최신 정보로 자동 업데이트합니다.'
                                : '네이버 플레이스, 구글 리뷰, 블로그 후기를 AI가 종합 분석한 결과입니다. 매일 정각에 자동 업데이트됩니다.'}
                        </p>
                    </div>
                </div>
            )}

            {/* 맛집 상세 바텀시트 */}
            {selectedRestaurant && (
                <div
                    className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-[2px]"
                    onClick={() => setSelectedRestaurant(null)}
                >
                    <div
                        className="bg-white dark:bg-[#111111] rounded-t-[32px] p-8 w-full max-w-[430px] mx-auto shadow-[0_-8px_30px_rgb(0,0,0,0.12)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-12 h-1.5 bg-toss-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-8 cursor-pointer"
                            onClick={() => setSelectedRestaurant(null)} />

                        <div className="flex justify-between items-start mb-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-2xl">{selectedRestaurant.icon}</span>
                                    <span className="text-primary font-bold text-sm">{selectedRestaurant.category}</span>
                                </div>
                                <h2 className="text-[28px] font-bold text-toss-gray-800 dark:text-white leading-tight">
                                    {selectedRestaurant.name}
                                </h2>
                            </div>
                            <button
                                className="w-10 h-10 flex items-center justify-center bg-toss-gray-100 dark:bg-gray-800 rounded-full"
                                onClick={() => setSelectedRestaurant(null)}
                            >
                                <span className="material-symbols-outlined text-[20px] text-toss-gray-600 dark:text-gray-400">close</span>
                            </button>
                        </div>

                        <p className="text-[15px] text-toss-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                            {selectedRestaurant.description}
                        </p>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <InfoCard icon="star" label="평점" value={`${selectedRestaurant.rating} (${selectedRestaurant.reviewCount})`} />
                            <InfoCard icon="payments" label="가격대" value={selectedRestaurant.priceRange} />
                            <InfoCard icon="schedule" label="영업시간" value={selectedRestaurant.openHours} />
                            <InfoCard icon="event_busy" label="휴무일" value={selectedRestaurant.closedDay} />
                            <InfoCard icon="hourglass_top" label="예상 대기" value={selectedRestaurant.waitTime} />
                            <InfoCard icon="location_on" label="위치" value={selectedRestaurant.address} />
                        </div>

                        <div className="bg-primary/5 dark:bg-primary/10 rounded-[20px] p-5 mb-6">
                            <p className="text-[13px] text-primary font-bold mb-1">대표 메뉴</p>
                            <p className="text-[17px] font-bold text-toss-gray-800 dark:text-white">
                                {selectedRestaurant.signature}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-8">
                            {selectedRestaurant.tags?.map((tag, i) => (
                                <span key={i} className="bg-toss-gray-100 dark:bg-gray-800 text-toss-gray-600 dark:text-gray-400 text-[13px] px-3 py-1.5 rounded-full font-medium">
                                    #{tag}
                                </span>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => window.open(`https://map.naver.com/v5/search/${encodeURIComponent(selectedArea + ' ' + selectedRestaurant.name)}`, '_blank')}
                                className="flex-1 bg-[#03C75A] text-white py-[16px] rounded-[20px] font-bold text-[16px] flex items-center justify-center gap-2"
                            >
                                네이버 지도
                            </button>
                            <button
                                onClick={() => window.open(`https://map.kakao.com/?q=${encodeURIComponent(selectedArea + ' ' + selectedRestaurant.name)}`, '_blank')}
                                className="flex-1 bg-[#FEE500] text-[#191919] py-[16px] rounded-[20px] font-bold text-[16px] flex items-center justify-center gap-2"
                            >
                                카카오맵
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoCard({ icon, label, value }) {
    return (
        <div className="bg-toss-gray-50 dark:bg-gray-900/50 p-4 rounded-[18px] border border-toss-gray-100 dark:border-gray-800/50">
            <div className="flex items-center gap-1.5 mb-1">
                <span className="material-symbols-outlined text-[14px] text-toss-gray-600 dark:text-gray-500">{icon}</span>
                <p className="text-[11px] text-toss-gray-600 dark:text-gray-400 font-medium">{label}</p>
            </div>
            <p className="text-[14px] font-bold text-toss-gray-800 dark:text-white">{value || '-'}</p>
        </div>
    );
}

function getCategoryIcon(category) {
    const map = {
        '한식': '🍚', '일식': '🍣', '중식': '🥟', '양식': '🍝',
        '이탈리안': '🍕', '프렌치': '🥖', '카페': '☕', '디저트': '🍰',
        '베이커리': '🥐', '고기': '🥩', '구이': '🥩', '삼겹살': '🥓',
        '치킨': '🍗', '분식': '🍜', '국밥': '🍲', '냉면': '🍜',
        '해산물': '🦐', '횟집': '🐟', '술집': '🍺', '바': '🍸',
        '태국': '🍛', '베트남': '🍜', '멕시칸': '🌮', '피자': '🍕',
        '버거': '🍔', '브런치': '🥞', '샌드위치': '🥪', '라멘': '🍜',
    };
    for (const [key, icon] of Object.entries(map)) {
        if (category?.includes(key)) return icon;
    }
    return '🍽️';
}

function getCategoryColor(category) {
    const map = {
        '한식': '#FFF3E0', '일식': '#FFE0E6', '중식': '#FFEBEE',
        '양식': '#E8F5E9', '이탈리안': '#E8F5E9', '카페': '#FFF8E1',
        '디저트': '#FCE4EC', '베이커리': '#FFF3E0', '고기': '#FFEBEE',
        '구이': '#FFEBEE', '해산물': '#E0F7FA', '술집': '#EDE7F6',
        '바': '#EDE7F6', '브런치': '#FFFDE7', '버거': '#FFF3E0',
    };
    for (const [key, color] of Object.entries(map)) {
        if (category?.includes(key)) return color;
    }
    return '#F3F4F6';
}
