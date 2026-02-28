// src/components/TodayFood.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MOCK_RESTAURANTS, FOOD_CATEGORIES } from '../data/mockFoodData';
import { geminiRequest, extractJSON, enqueueGeminiRequest } from '../utils/geminiUtils';

// ──────────────────────────────────────────
// 기존 유틸 재사용 (캐시, 아이콘, 컬러)
// ──────────────────────────────────────────
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

// ──────────────────────────────────────────
// 지역 목록
// ──────────────────────────────────────────
const AREAS = ['을지로', '성수동', '망원동', '연남동', '익선동'];

// ──────────────────────────────────────────
// 룰렛 필터 옵션
// ──────────────────────────────────────────
const PEOPLE_OPTIONS = ['혼밥', '2명', '3~4명', '5명+'];
const BUDGET_OPTIONS = ['1만원 이하', '1~2만원', '2~3만원', '3만원+', '상관없음'];
const MOOD_OPTIONS = [
  { id: 'casual', label: '가볍게', icon: '🍃' },
  { id: 'hearty', label: '든든하게', icon: '🍖' },
  { id: 'special', label: '특별하게', icon: '✨' },
  { id: 'sweet', label: '달달하게', icon: '🍰' },
  { id: 'drink', label: '한잔하며', icon: '🍺' },
  { id: 'any', label: '아무거나', icon: '🎲' },
];

// ──────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────
export default function TodayFood() {
  // ── 공통 상태 ──
  const [activeTab, setActiveTab] = useState('roulette'); // 'roulette' | 'course'
  const [selectedArea, setSelectedArea] = useState('을지로');
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const fetchingRef = useRef(false);

  // ── 룰렛 상태 ──
  const [roulettePeople, setRoulettePeople] = useState(null);
  const [rouletteBudget, setRouletteBudget] = useState(null);
  const [rouletteMood, setRouletteMood] = useState(null);
  const [rouletteExclude, setRouletteExclude] = useState([]);
  const [rouletteResult, setRouletteResult] = useState(null);
  const [rouletteLoading, setRouletteLoading] = useState(false);
  const [rouletteAnimation, setRouletteAnimation] = useState(false);
  const [rouletteHistory, setRouletteHistory] = useState([]);

  // ── 코스 플래너 상태 ──
  const [courseScenario, setCourseScenario] = useState('');
  const [courseResult, setCourseResult] = useState(null);
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseProgress, setCourseProgress] = useState(0);

  // ── 코스 예시 시나리오 ──
  const SCENARIO_EXAMPLES = [
    { icon: '💑', text: '성수동 저녁 데이트 2명' },
    { icon: '👨‍👩‍👧‍👦', text: '망원동 가족 브런치 4명' },
    { icon: '🍻', text: '을지로 친구들과 회식 5명' },
    { icon: '🧑‍💻', text: '연남동 혼자 카페 투어' },
    { icon: '🎂', text: '익선동 생일 파티 3명' },
  ];

  // ──────────────────────────────────────────
  // 캐시에서 맛집 데이터 로드 (기존 로직 재사용)
  // ──────────────────────────────────────────
  const loadRestaurantData = useCallback((area) => {
    // 1순위: 오늘 캐시
    try {
      const cacheKey = `${CACHE_KEY}_${area}_${getTodayKey()}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (isTodayCache(timestamp) && data?.length > 0) {
          setAllRestaurants(data);
          return 'today';
        }
      }
    } catch (e) { }

    // 2순위: 이전 캐시
    try {
      const prefix = `${CACHE_KEY}_${area}_`;
      let latestData = null;
      let latestTime = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          const cachedItem = localStorage.getItem(key);
          if (cachedItem) {
            const { data, timestamp } = JSON.parse(cachedItem);
            if (timestamp > latestTime && data?.length > 0) {
              latestData = data;
              latestTime = timestamp;
            }
          }
        }
      }
      if (latestData) {
        setAllRestaurants(latestData);
        return 'old';
      }
    } catch (e) { }

    // 3순위: Mock 데이터
    const areaKey = Object.keys(MOCK_RESTAURANTS).find(k => area.includes(k) || k.includes(area)) || area;
    const mockData = MOCK_RESTAURANTS[areaKey] || MOCK_RESTAURANTS['을지로'] || [];
    setAllRestaurants(mockData.map(r => ({
      ...r,
      icon: getCategoryIcon(r.category),
      color: getCategoryColor(r.category)
    })));
    return 'mock';
  }, []);

  // 백그라운드 API 업데이트 (기존 로직 재사용)
  const fetchInBackground = useCallback(async (area) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const prompt = `
${area} 지역에서 모든 음식 종류를 포함하여 현재 가장 인기 있고 평점 높은 맛집 10곳을 조사하여 다음 구조의 JSON 배열로 응답하세요:
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
다른 텍스트 없이 유효한 JSON 배열만 출력하세요.
      `;
      const rawText = await enqueueGeminiRequest(() =>
        geminiRequest(prompt, { useSearch: true })
      );
      const parsed = extractJSON(rawText);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Invalid data');

      const enriched = parsed.slice(0, 10).map((r, idx) => ({
        ...r,
        rank: idx + 1,
        icon: getCategoryIcon(r.category),
        color: getCategoryColor(r.category)
      }));

      const now = Date.now();
      const cacheKey = `${CACHE_KEY}_${area}_${getTodayKey()}`;
      localStorage.setItem(cacheKey, JSON.stringify({ data: enriched, timestamp: now }));

      setAllRestaurants(enriched);
    } catch (err) {
      console.warn('Background food update failed:', err.message);
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const cacheStatus = loadRestaurantData(selectedArea);
    if (cacheStatus !== 'today') {
      fetchInBackground(selectedArea);
    }
  }, [selectedArea, loadRestaurantData, fetchInBackground]);

  // ──────────────────────────────────────────
  // 🎰 룰렛 기능
  // ──────────────────────────────────────────
  const excludeCategories = useMemo(() => {
    return FOOD_CATEGORIES.filter(c => c.id !== 'all').map(c => ({
      ...c,
      selected: rouletteExclude.includes(c.id)
    }));
  }, [rouletteExclude]);

  const toggleExclude = (id) => {
    setRouletteExclude(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleRoulette = async () => {
    setRouletteLoading(true);
    setRouletteAnimation(true);
    setRouletteResult(null);

    // Build excluded keywords
    const excludedKeywords = rouletteExclude.flatMap(id => {
      const cat = FOOD_CATEGORIES.find(c => c.id === id);
      return cat?.keywords || [];
    });

    // Build context from loaded restaurants
    const restaurantContext = allRestaurants.map(r =>
      `${r.name}|${r.category}|${r.signature}|${r.priceRange}|${r.rating}|${r.waitTime}|${r.openHours}|${r.closedDay}`
    ).join('\n');

    const prompt = `You are a fun food recommendation AI named "오늘 뭐 먹지?" (What to eat today?).
The user is in the ${selectedArea} area of Seoul and needs ONE restaurant recommendation.

USER CONDITIONS:
- Number of people: ${roulettePeople || 'not specified'}
- Budget per person: ${rouletteBudget || 'not specified'}
- Mood: ${MOOD_OPTIONS.find(m => m.id === rouletteMood)?.label || 'not specified'}
- Excluded food types: ${excludedKeywords.length > 0 ? excludedKeywords.join(', ') : 'none'}

AVAILABLE RESTAURANTS IN ${selectedArea}:
${restaurantContext}

INSTRUCTIONS:
1. Pick exactly ONE restaurant from the list above that best matches the conditions.
2. If the user excluded certain categories, do NOT pick restaurants of those types.
3. Consider budget, number of people (solo-friendly vs group), and mood.
4. Respond ONLY with a valid JSON object (no other text):
{
  "name": "restaurant name (must match exactly from list)",
  "category": "food category",
  "signature": "signature dish",
  "priceRange": "price range",
  "rating": 4.5,
  "reason": "A fun, engaging Korean explanation (2-3 sentences) why this is perfect for the user's situation today. Be specific and enthusiastic. Mention the weather, time of day, or mood where relevant.",
  "tip": "One practical tip in Korean (e.g., best time to avoid waiting, must-try side dish, seating preference)",
  "pairingDrink": "Recommended drink pairing in Korean (optional, can be null)"
}`;

    try {
      // Animate for at least 2 seconds for dramatic effect
      const animationPromise = new Promise(r => setTimeout(r, 2000));

      const [rawText] = await Promise.all([
        enqueueGeminiRequest(() => geminiRequest(prompt)),
        animationPromise
      ]);

      const result = extractJSON(rawText);

      // Match with full restaurant data
      const matched = allRestaurants.find(r => r.name === result.name);
      const enrichedResult = {
        ...result,
        ...(matched || {}),
        reason: result.reason,
        tip: result.tip,
        pairingDrink: result.pairingDrink,
        icon: matched?.icon || getCategoryIcon(result.category),
        color: matched?.color || getCategoryColor(result.category),
      };

      setRouletteResult(enrichedResult);

      // Save to history
      setRouletteHistory(prev => [{
        ...enrichedResult,
        timestamp: Date.now(),
        area: selectedArea
      }, ...prev].slice(0, 10));

    } catch (err) {
      console.error('Roulette error:', err);
      // Fallback: random pick from filtered restaurants
      const filtered = allRestaurants.filter(r =>
        !excludedKeywords.some(kw => r.category?.includes(kw))
      );
      if (filtered.length > 0) {
        const pick = filtered[Math.floor(Math.random() * filtered.length)];
        setRouletteResult({
          ...pick,
          reason: `${selectedArea}에서 ${pick.category} 맛집을 찾으신다면 ${pick.name}이 딱이에요! ${pick.description}`,
          tip: `대표 메뉴 "${pick.signature}"를 꼭 드셔보세요.`,
          pairingDrink: null
        });
      }
    } finally {
      setRouletteLoading(false);
      setRouletteAnimation(false);
    }
  };

  const resetRoulette = () => {
    setRouletteResult(null);
    setRoulettePeople(null);
    setRouletteBudget(null);
    setRouletteMood(null);
    setRouletteExclude([]);
  };

  // ──────────────────────────────────────────
  // 🗺️ 코스 플래너 기능
  // ──────────────────────────────────────────
  const handleCoursePlan = async () => {
    if (!courseScenario.trim()) return;
    setCourseLoading(true);
    setCourseResult(null);
    setCourseProgress(0);

    // Progress simulation
    const progressInterval = setInterval(() => {
      setCourseProgress(prev => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + Math.random() * 15;
      });
    }, 400);

    // Build restaurant context
    const restaurantContext = allRestaurants.map(r =>
      `${r.name}|${r.category}|${r.signature}|${r.priceRange}|${r.rating}|${r.waitTime}|${r.openHours}|${r.closedDay}`
    ).join('\n');

    const prompt = `You are "AI Course Planner", a Seoul food-course planning expert.
The user wants a food course plan based on their scenario.

USER SCENARIO: "${courseScenario}"
AREA DATA (${selectedArea} restaurants):
${restaurantContext}

INSTRUCTIONS:
1. Create a timed course plan with 2~4 stops.
2. Use restaurants from the provided data when possible. If the scenario requires a type not in the data, you may suggest a realistic restaurant name for that area.
3. Each stop must include a realistic time, travel time to next stop, and estimated cost.
4. Respond ONLY with valid JSON (no other text):
{
  "title": "Course title in Korean (fun and descriptive, e.g., '성수동 감성 데이트 코스')",
  "subtitle": "One-line subtitle in Korean describing the vibe",
  "totalTime": "Total estimated duration (e.g., '약 3시간')",
  "totalBudget": "Total estimated cost per person (e.g., '약 4.5만원')",
  "numberOfPeople": "Number of people inferred from scenario",
  "stops": [
    {
      "order": 1,
      "time": "18:00",
      "name": "Restaurant name",
      "category": "Food category",
      "signature": "What to order",
      "estimatedCost": "Cost per person (e.g., '1.5만원')",
      "duration": "Time spent here (e.g., '1시간')",
      "travelToNext": "Travel time to next stop (e.g., '도보 5분')",
      "reason": "Why this stop fits the course (1 sentence in Korean)",
      "icon": "single emoji representing this stop"
    }
  ],
  "tips": [
    "Practical tip 1 in Korean",
    "Practical tip 2 in Korean"
  ],
  "alternativePlan": "Brief 1-sentence alternative if a place is closed, in Korean"
}`;

    try {
      const rawText = await enqueueGeminiRequest(() =>
        geminiRequest(prompt, { useSearch: true })
      );
      const result = extractJSON(rawText);

      clearInterval(progressInterval);
      setCourseProgress(100);

      // Enrich stops with cached restaurant data
      if (result.stops) {
        result.stops = result.stops.map(stop => {
          const matched = allRestaurants.find(r => r.name === stop.name);
          return {
            ...stop,
            matched,
            icon: stop.icon || (matched ? getCategoryIcon(matched.category) : getCategoryIcon(stop.category)),
            color: matched?.color || getCategoryColor(stop.category),
            rating: matched?.rating || null,
          };
        });
      }

      setTimeout(() => setCourseResult(result), 300);
    } catch (err) {
      console.error('Course planner error:', err);
      clearInterval(progressInterval);
      setCourseProgress(0);
      setCourseResult({ error: 'AI 코스 생성에 실패했습니다. 다시 시도해주세요.' });
    } finally {
      setCourseLoading(false);
    }
  };

  // ──────────────────────────────────────────
  // 렌더링
  // ──────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto no-scrollbar">
      {/* ─── 헤더 영역: 타이틀 + 지역 선택 ─── */}
      <div className="bg-white dark:bg-[#111111] px-5 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🍽️</span>
          <div>
            <h2 className="text-[22px] font-bold text-toss-gray-800 dark:text-white leading-tight">
              오늘 뭐 먹지?
            </h2>
            <p className="text-[13px] text-toss-gray-500 dark:text-gray-400">
              AI가 오늘 당신의 한 끼를 책임집니다
            </p>
          </div>
        </div>

        {/* 지역 탭 */}
        <div className="flex overflow-x-auto no-scrollbar gap-2">
          {AREAS.map(area => {
            const isActive = selectedArea === area;
            return (
              <button
                key={area}
                onClick={() => {
                  setSelectedArea(area);
                  setRouletteResult(null);
                  setCourseResult(null);
                }}
                className={`px-4 py-2 rounded-full text-[13px] font-semibold shrink-0 transition-all border ${isActive
                  ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                  : 'bg-white dark:bg-[#1a1a1a] text-toss-gray-600 dark:text-gray-400 border-toss-gray-200 dark:border-gray-700 active:scale-95'
                  }`}
              >
                {area}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 기능 탭 전환 ─── */}
      <div className="bg-white dark:bg-[#111111] border-b border-toss-gray-100 dark:border-gray-800 shrink-0">
        <div className="flex px-5 gap-1">
          <button
            onClick={() => setActiveTab('roulette')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 border-b-2 transition-all ${activeTab === 'roulette'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-toss-gray-500 dark:text-gray-500'
              }`}
          >
            <span className="text-[16px]">🎰</span>
            <span className="text-[14px]">오늘의 한 끼</span>
          </button>
          <button
            onClick={() => setActiveTab('course')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 border-b-2 transition-all ${activeTab === 'course'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-toss-gray-500 dark:text-gray-500'
              }`}
          >
            <span className="text-[16px]">🗺️</span>
            <span className="text-[14px]">AI 코스 플래너</span>
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────── */}
      {/* 🎰 오늘의 한 끼 (룰렛) 탭 */}
      {/* ──────────────────────────────────────── */}
      {activeTab === 'roulette' && (
        <div className="px-5 py-6 pb-36">
          {!rouletteResult ? (
            <>
              {/* 인원 선택 */}
              <div className="mb-6">
                <p className="text-[15px] font-bold text-toss-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">group</span>
                  몇 명이서 먹나요?
                </p>
                <div className="flex gap-2 flex-wrap">
                  {PEOPLE_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setRoulettePeople(roulettePeople === opt ? null : opt)}
                      className={`px-4 py-2.5 rounded-2xl text-[13px] font-semibold transition-all border ${roulettePeople === opt
                        ? 'bg-primary text-white border-primary'
                        : 'bg-toss-gray-50 dark:bg-gray-900 text-toss-gray-700 dark:text-gray-300 border-toss-gray-200 dark:border-gray-700 active:scale-95'
                        }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 예산 선택 */}
              <div className="mb-6">
                <p className="text-[15px] font-bold text-toss-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">payments</span>
                  1인 예산은?
                </p>
                <div className="flex gap-2 flex-wrap">
                  {BUDGET_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setRouletteBudget(rouletteBudget === opt ? null : opt)}
                      className={`px-4 py-2.5 rounded-2xl text-[13px] font-semibold transition-all border ${rouletteBudget === opt
                        ? 'bg-primary text-white border-primary'
                        : 'bg-toss-gray-50 dark:bg-gray-900 text-toss-gray-700 dark:text-gray-300 border-toss-gray-200 dark:border-gray-700 active:scale-95'
                        }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 분위기 선택 */}
              <div className="mb-6">
                <p className="text-[15px] font-bold text-toss-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">mood</span>
                  오늘 기분은?
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {MOOD_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setRouletteMood(rouletteMood === opt.id ? null : opt.id)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-2xl text-[13px] font-semibold transition-all border ${rouletteMood === opt.id
                        ? 'bg-primary/10 text-primary border-primary dark:bg-primary/20'
                        : 'bg-toss-gray-50 dark:bg-gray-900 text-toss-gray-700 dark:text-gray-300 border-toss-gray-200 dark:border-gray-700 active:scale-95'
                        }`}
                    >
                      <span className="text-[20px]">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 제외 음식 */}
              <div className="mb-8">
                <p className="text-[15px] font-bold text-toss-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">block</span>
                  오늘은 빼고 싶은 음식
                  <span className="text-[12px] font-normal text-toss-gray-400">(선택)</span>
                </p>
                <div className="flex gap-2 flex-wrap">
                  {excludeCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => toggleExclude(cat.id)}
                      className={`flex items-center gap-1 px-3 py-2 rounded-full text-[12px] font-semibold transition-all border ${cat.selected
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-500 border-red-200 dark:border-red-800 line-through'
                        : 'bg-toss-gray-50 dark:bg-gray-900 text-toss-gray-600 dark:text-gray-400 border-toss-gray-200 dark:border-gray-700'
                        }`}
                    >
                      <span className="text-[14px]">{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 룰렛 버튼 */}
              <button
                onClick={handleRoulette}
                disabled={rouletteLoading}
                className={`w-full py-5 rounded-[22px] font-bold text-[18px] transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${rouletteLoading
                  ? 'bg-toss-gray-200 dark:bg-gray-700 text-toss-gray-400 cursor-not-allowed'
                  : 'bg-primary text-white shadow-lg shadow-primary/30 hover:brightness-105'
                  }`}
              >
                {rouletteLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                    AI가 고르는 중...
                  </>
                ) : (
                  <>
                    <span className="text-[24px]">🎲</span>
                    오늘의 한 끼 추천받기
                  </>
                )}
              </button>

              {/* 룰렛 애니메이션 오버레이 */}
              {rouletteAnimation && (
                <div className="mt-6 bg-toss-gray-50 dark:bg-gray-900 rounded-[24px] p-8 text-center">
                  <div className="text-5xl mb-4 animate-bounce">
                    {['🍚', '🍣', '🍝', '🍔', '🍜', '🍰', '🥩', '🍕'][Math.floor(Math.random() * 8)]}
                  </div>
                  <p className="text-[16px] font-bold text-toss-gray-800 dark:text-white mb-2">
                    AI가 메뉴를 고르고 있어요
                  </p>
                  <p className="text-[13px] text-toss-gray-500 dark:text-gray-400">
                    {selectedArea}의 맛집 데이터를 분석 중...
                  </p>
                  <div className="mt-4 w-full bg-toss-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                </div>
              )}

              {/* 이전 추천 히스토리 */}
              {rouletteHistory.length > 0 && !rouletteLoading && (
                <div className="mt-8">
                  <p className="text-[14px] font-bold text-toss-gray-600 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">history</span>
                    최근 추천
                  </p>
                  <div className="space-y-2">
                    {rouletteHistory.slice(0, 3).map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          const matched = allRestaurants.find(r => r.name === item.name);
                          if (matched) setSelectedRestaurant(matched);
                        }}
                        className="flex items-center gap-3 p-3 bg-toss-gray-50 dark:bg-gray-900/50 rounded-2xl cursor-pointer active:bg-toss-gray-100 dark:active:bg-gray-800 transition-colors"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                          style={{ background: item.color || '#f3f4f6' }}
                        >
                          {item.icon || '🍽️'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-toss-gray-800 dark:text-white truncate">{item.name}</p>
                          <p className="text-[11px] text-toss-gray-500 dark:text-gray-400">{item.area} · {item.category}</p>
                        </div>
                        <span className="text-[11px] text-toss-gray-400 dark:text-gray-600 shrink-0">
                          {new Date(item.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ─── 룰렛 결과 화면 ─── */
            <div>
              {/* 결과 카드 */}
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-[28px] p-6 mb-6 border border-primary/10">
                <div className="text-center mb-5">
                  <p className="text-[13px] font-bold text-primary mb-2">AI 추천 결과</p>
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-3 shadow-sm"
                    style={{ background: rouletteResult.color || '#f3f4f6' }}
                  >
                    {rouletteResult.icon || '🍽️'}
                  </div>
                  <h3 className="text-[24px] font-bold text-toss-gray-800 dark:text-white mb-1">
                    {rouletteResult.name}
                  </h3>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[12px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                      {rouletteResult.category}
                    </span>
                    {rouletteResult.rating && (
                      <span className="flex items-center gap-0.5 text-[13px]">
                        <span className="material-symbols-outlined text-yellow-400 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span className="font-bold text-toss-gray-800 dark:text-white">{rouletteResult.rating}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* AI 추천 이유 */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="material-symbols-outlined text-primary text-[16px]">smart_toy</span>
                    <span className="text-[12px] font-bold text-primary">AI가 이 곳을 추천한 이유</span>
                  </div>
                  <p className="text-[14px] text-toss-gray-700 dark:text-gray-300 leading-relaxed">
                    {rouletteResult.reason}
                  </p>
                </div>

                {/* 정보 그리드 */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <InfoCard icon="restaurant_menu" label="대표 메뉴" value={rouletteResult.signature} />
                  <InfoCard icon="payments" label="가격대" value={rouletteResult.priceRange} />
                  <InfoCard icon="schedule" label="영업시간" value={rouletteResult.openHours} />
                  <InfoCard icon="hourglass_top" label="예상 대기" value={rouletteResult.waitTime} />
                </div>

                {/* 팁 */}
                {rouletteResult.tip && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 mb-4 border border-amber-100 dark:border-amber-800/30">
                    <div className="flex items-start gap-2">
                      <span className="text-[16px] shrink-0">💡</span>
                      <p className="text-[13px] text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
                        {rouletteResult.tip}
                      </p>
                    </div>
                  </div>
                )}

                {/* 페어링 음료 */}
                {rouletteResult.pairingDrink && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800/30">
                    <div className="flex items-start gap-2">
                      <span className="text-[16px] shrink-0">🥂</span>
                      <p className="text-[13px] text-blue-800 dark:text-blue-200 leading-relaxed font-medium">
                        추천 음료: {rouletteResult.pairingDrink}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 지도 버튼 */}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => window.open(`https://map.naver.com/v5/search/${encodeURIComponent(selectedArea + ' ' + rouletteResult.name)}`, '_blank')}
                  className="flex-1 bg-[#03C75A] text-white py-[14px] rounded-[18px] font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  네이버 지도
                </button>
                <button
                  onClick={() => window.open(`https://map.kakao.com/?q=${encodeURIComponent(selectedArea + ' ' + rouletteResult.name)}`, '_blank')}
                  className="flex-1 bg-[#FEE500] text-[#191919] py-[14px] rounded-[18px] font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  카카오맵
                </button>
              </div>

              {/* 다시 하기 / 다른 추천 */}
              <div className="flex gap-3">
                <button
                  onClick={resetRoulette}
                  className="flex-1 bg-toss-gray-100 dark:bg-gray-800 text-toss-gray-700 dark:text-gray-300 py-[14px] rounded-[18px] font-bold text-[14px] active:scale-[0.98] transition-all"
                >
                  처음부터 다시
                </button>
                <button
                  onClick={handleRoulette}
                  disabled={rouletteLoading}
                  className="flex-1 bg-primary text-white py-[14px] rounded-[18px] font-bold text-[14px] active:scale-[0.98] transition-all shadow-sm shadow-primary/20"
                >
                  🎲 다른 곳 추천
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────── */}
      {/* 🗺️ AI 코스 플래너 탭 */}
      {/* ──────────────────────────────────────── */}
      {activeTab === 'course' && (
        <div className="px-5 py-6 pb-36">
          {!courseResult ? (
            <>
              {/* 시나리오 입력 */}
              <div className="mb-6">
                <p className="text-[15px] font-bold text-toss-gray-800 dark:text-white mb-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">edit_note</span>
                  어떤 코스를 원하세요?
                </p>
                <p className="text-[12px] text-toss-gray-500 dark:text-gray-400 mb-3 ml-[26px]">
                  상황, 인원, 분위기를 자유롭게 적어주세요
                </p>
                <textarea
                  value={courseScenario}
                  onChange={(e) => setCourseScenario(e.target.value)}
                  placeholder={`예: ${selectedArea} 저녁 데이트 코스, 2명, 분위기 좋은 곳 위주로`}
                  className="w-full bg-toss-gray-50 dark:bg-gray-900 border border-toss-gray-200 dark:border-gray-700 rounded-2xl px-4 py-4 text-[14px] dark:text-white outline-none focus:ring-2 focus:ring-primary resize-none h-[100px] placeholder:text-toss-gray-400"
                />
              </div>

              {/* 예시 시나리오 칩 */}
              <div className="mb-8">
                <p className="text-[13px] font-semibold text-toss-gray-500 dark:text-gray-400 mb-3">
                  이런 코스는 어때요?
                </p>
                <div className="flex flex-wrap gap-2">
                  {SCENARIO_EXAMPLES.map((ex, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCourseScenario(ex.text)}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 bg-toss-gray-50 dark:bg-gray-900 border border-toss-gray-200 dark:border-gray-700 rounded-2xl text-[12px] font-medium text-toss-gray-700 dark:text-gray-300 active:scale-95 transition-all"
                    >
                      <span>{ex.icon}</span>
                      {ex.text}
                    </button>
                  ))}
                </div>
              </div>

              {/* 생성 버튼 */}
              <button
                onClick={handleCoursePlan}
                disabled={courseLoading || !courseScenario.trim()}
                className={`w-full py-5 rounded-[22px] font-bold text-[18px] transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${courseLoading || !courseScenario.trim()
                  ? 'bg-toss-gray-200 dark:bg-gray-700 text-toss-gray-400 cursor-not-allowed'
                  : 'bg-primary text-white shadow-lg shadow-primary/30 hover:brightness-105'
                  }`}
              >
                {courseLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                    AI 코스 만드는 중...
                  </>
                ) : (
                  <>
                    <span className="text-[24px]">🗺️</span>
                    AI 코스 생성하기
                  </>
                )}
              </button>

              {/* 로딩 프로그레스 */}
              {courseLoading && (
                <div className="mt-6 bg-toss-gray-50 dark:bg-gray-900 rounded-[24px] p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-[18px] animate-spin">progress_activity</span>
                    <span className="text-[14px] font-bold text-toss-gray-800 dark:text-white">코스를 설계하고 있어요</span>
                  </div>
                  <div className="w-full bg-toss-gray-200 dark:bg-gray-800 rounded-full h-2 mb-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(courseProgress, 100)}%` }}
                    />
                  </div>
                  <p className="text-[12px] text-toss-gray-500 dark:text-gray-400">
                    {courseProgress < 30 ? `${selectedArea} 맛집 데이터 분석 중...`
                      : courseProgress < 60 ? '동선 최적화 중...'
                        : courseProgress < 90 ? '코스 시간표 작성 중...'
                          : '마무리 중...'}
                  </p>
                </div>
              )}
            </>
          ) : courseResult.error ? (
            /* ─── 에러 상태 ─── */
            <div className="text-center py-10">
              <span className="text-5xl block mb-4">😥</span>
              <p className="text-[16px] font-bold text-toss-gray-800 dark:text-white mb-2">{courseResult.error}</p>
              <button
                onClick={() => setCourseResult(null)}
                className="mt-4 px-6 py-3 bg-primary text-white rounded-2xl font-bold text-[14px]"
              >
                다시 시도
              </button>
            </div>
          ) : (
            /* ─── 코스 결과 화면 ─── */
            <div>
              {/* 코스 헤더 */}
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-[28px] p-6 mb-6 border border-primary/10">
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="material-symbols-outlined text-primary text-[16px]">smart_toy</span>
                  <span className="text-[12px] font-bold text-primary">AI Generated Course</span>
                </div>
                <h3 className="text-[22px] font-bold text-toss-gray-800 dark:text-white mb-1 leading-tight">
                  {courseResult.title}
                </h3>
                <p className="text-[14px] text-toss-gray-600 dark:text-gray-400 mb-4">
                  {courseResult.subtitle}
                </p>
                <div className="flex gap-3">
                  <div className="flex items-center gap-1.5 bg-white dark:bg-[#1a1a1a] px-3 py-1.5 rounded-full">
                    <span className="material-symbols-outlined text-primary text-[14px]">schedule</span>
                    <span className="text-[12px] font-bold text-toss-gray-800 dark:text-white">{courseResult.totalTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white dark:bg-[#1a1a1a] px-3 py-1.5 rounded-full">
                    <span className="material-symbols-outlined text-primary text-[14px]">payments</span>
                    <span className="text-[12px] font-bold text-toss-gray-800 dark:text-white">{courseResult.totalBudget}/인</span>
                  </div>
                  {courseResult.numberOfPeople && (
                    <div className="flex items-center gap-1.5 bg-white dark:bg-[#1a1a1a] px-3 py-1.5 rounded-full">
                      <span className="material-symbols-outlined text-primary text-[14px]">group</span>
                      <span className="text-[12px] font-bold text-toss-gray-800 dark:text-white">{courseResult.numberOfPeople}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 코스 타임라인 */}
              <div className="relative mb-6">
                {courseResult.stops?.map((stop, idx) => {
                  const isLast = idx === courseResult.stops.length - 1;
                  return (
                    <div key={idx} className="relative">
                      {/* 타임라인 연결선 */}
                      {!isLast && (
                        <div className="absolute left-[19px] top-[52px] bottom-0 w-[2px] bg-toss-gray-200 dark:bg-gray-700" />
                      )}

                      {/* 스톱 카드 */}
                      <div
                        className="flex gap-4 mb-2 cursor-pointer"
                        onClick={() => {
                          if (stop.matched) setSelectedRestaurant(stop.matched);
                        }}
                      >
                        {/* 순서 번호 + 아이콘 */}
                        <div className="flex flex-col items-center shrink-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl z-10 shadow-sm"
                            style={{ background: stop.color || '#f3f4f6' }}
                          >
                            {stop.icon}
                          </div>
                        </div>

                        {/* 정보 */}
                        <div className="flex-1 bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-toss-gray-100 dark:border-gray-800 mb-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] bg-primary text-white px-2 py-0.5 rounded-full font-bold">
                                {stop.time}
                              </span>
                              <span className="text-[11px] text-toss-gray-500 dark:text-gray-400 font-medium">
                                {stop.duration}
                              </span>
                            </div>
                            <span className="text-[12px] font-bold text-primary">
                              {stop.estimatedCost}
                            </span>
                          </div>
                          <h4 className="text-[16px] font-bold text-toss-gray-800 dark:text-white mb-0.5">
                            {stop.name}
                          </h4>
                          <p className="text-[12px] text-toss-gray-500 dark:text-gray-400 mb-2">
                            {stop.category} · {stop.signature}
                          </p>
                          <p className="text-[13px] text-toss-gray-600 dark:text-gray-300 leading-relaxed">
                            {stop.reason}
                          </p>
                          {stop.rating && (
                            <div className="flex items-center gap-0.5 mt-2">
                              <span className="material-symbols-outlined text-yellow-400 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                              <span className="text-[12px] font-bold text-toss-gray-800 dark:text-white">{stop.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 이동 시간 */}
                      {!isLast && stop.travelToNext && (
                        <div className="flex items-center gap-2 ml-[14px] mb-2 py-1.5">
                          <span className="material-symbols-outlined text-toss-gray-400 dark:text-gray-600 text-[14px]">directions_walk</span>
                          <span className="text-[11px] text-toss-gray-400 dark:text-gray-600 font-medium">
                            {stop.travelToNext}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 팁 섹션 */}
              {courseResult.tips?.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 mb-4 border border-amber-100 dark:border-amber-800/30">
                  <p className="text-[13px] font-bold text-amber-800 dark:text-amber-200 mb-3 flex items-center gap-1.5">
                    <span className="text-[16px]">💡</span> 코스 팁
                  </p>
                  {courseResult.tips.map((tip, idx) => (
                    <p key={idx} className="text-[13px] text-amber-700 dark:text-amber-300 leading-relaxed mb-1.5 last:mb-0 flex items-start gap-2">
                      <span className="shrink-0 text-amber-500">•</span>
                      {tip}
                    </p>
                  ))}
                </div>
              )}

              {/* 대안 플랜 */}
              {courseResult.alternativePlan && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 mb-6 border border-blue-100 dark:border-blue-800/30">
                  <div className="flex items-start gap-2">
                    <span className="text-[14px] shrink-0">🔄</span>
                    <p className="text-[13px] text-blue-700 dark:text-blue-300 leading-relaxed font-medium">
                      {courseResult.alternativePlan}
                    </p>
                  </div>
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setCourseResult(null); setCourseScenario(''); setCourseProgress(0); }}
                  className="flex-1 bg-toss-gray-100 dark:bg-gray-800 text-toss-gray-700 dark:text-gray-300 py-[14px] rounded-[18px] font-bold text-[14px] active:scale-[0.98] transition-all"
                >
                  새 코스 만들기
                </button>
                <button
                  onClick={() => {
                    const text = `[${courseResult.title}]\n${courseResult.stops?.map(s => `${s.time} ${s.name} (${s.signature})`).join('\n')}\n총 ${courseResult.totalTime} / ${courseResult.totalBudget}`;
                    if (navigator.share) {
                      navigator.share({ title: courseResult.title, text });
                    } else {
                      navigator.clipboard.writeText(text);
                      alert('코스 정보가 클립보드에 복사되었습니다!');
                    }
                  }}
                  className="flex-1 bg-primary text-white py-[14px] rounded-[18px] font-bold text-[14px] active:scale-[0.98] transition-all shadow-sm shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">share</span>
                  공유하기
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────── */}
      {/* 맛집 상세 바텀시트 (기존 재사용) */}
      {/* ──────────────────────────────────────── */}
      {selectedRestaurant && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-[2px]"
          onClick={() => setSelectedRestaurant(null)}
        >
          <div
            className="bg-white dark:bg-[#111111] rounded-t-[32px] p-8 w-full max-w-[430px] mx-auto shadow-[0_-8px_30px_rgb(0,0,0,0.12)] max-h-[85vh] overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-toss-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-8 cursor-pointer"
              onClick={() => setSelectedRestaurant(null)} />

            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{selectedRestaurant.icon || getCategoryIcon(selectedRestaurant.category)}</span>
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
