import React, { useState, useEffect, useCallback } from 'react';
import { geminiRequest, extractJSON, enqueueGeminiRequest } from '../utils/geminiUtils';
import cardData from '../data/popularCards.json';

const { cards: POPULAR_CARDS } = cardData;

// ── 날짜 유틸 ──
function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekLabel() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const weekNum = Math.ceil(now.getDate() / 7);
    return `${year}년 ${month}월 ${weekNum}주차`;
}

function getMonthDay() {
    const now = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${days[now.getDay()]}요일`;
}

// ── 캐시 키 ──
const CACHE_PREFIX = 'ai_weekly_report';
function getCacheKey(type) {
    return `${CACHE_PREFIX}_${type}_${getTodayKey()}`;
}

function hasTodayCache(type) {
    try {
        const cached = localStorage.getItem(getCacheKey(type));
        if (cached) {
            const parsed = JSON.parse(cached);
            return parsed && parsed.data ? true : false;
        }
    } catch (e) { }
    return false;
}

function loadCache(type) {
    try {
        const cached = localStorage.getItem(getCacheKey(type));
        if (cached) {
            const parsed = JSON.parse(cached);
            return parsed.data || null;
        }
    } catch (e) { }
    return null;
}

function saveCache(type, data) {
    try {
        localStorage.setItem(getCacheKey(type), JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.warn('Cache save failed:', e.message);
    }
}

// ── 리포트 탭 정의 ──
const REPORT_TABS = [
    { id: 'card', label: '카드 리포트', icon: 'credit_card', emoji: '💳' },
    { id: 'ai', label: 'AI 동향', icon: 'psychology', emoji: '🤖' },
    { id: 'finance', label: '금융 리포트', icon: 'show_chart', emoji: '💹' },
];

// ══════════════════════════════════════════════════
// 프롬프트 생성 함수들
// ══════════════════════════════════════════════════

function buildCardReportPrompt() {
    const cardContext = POPULAR_CARDS.slice(0, 30).map(c =>
        `${c.issuer} ${c.name}(연회비:${c.annualFee}/실적:${c.previousMonthSpending}):${c.benefits.join(',')}`
    ).join('\n');

    const weekLabel = getWeekLabel();

    return `당신은 한국 신용카드 시장 전문 AI 애널리스트입니다.
오늘 날짜 기준으로 "${weekLabel} AI 카드 리포트"를 작성하세요.

## 보유 카드 데이터
${cardContext}

## 반드시 아래 JSON만 출력하세요. 다른 텍스트 없이 JSON만:
{
  "title": "${weekLabel} AI 카드 리포트",
  "summary": {
    "title": "이번 주 카드 시장 핵심 트렌드 제목 (20자 이내)",
    "body": "이번 주 카드 시장의 핵심 동향을 3~4문장으로 요약. 실제 시즌(여행, 개학, 연말 등)과 연결하여 작성.",
    "mood": "positive 또는 neutral 또는 negative"
  },
  "rankings": [
    {
      "rank": 1,
      "title": "카드명",
      "subtitle": "카드사",
      "badge": "▲5 또는 NEW 또는 →유지",
      "badgeType": "up 또는 down 또는 same 또는 new",
      "highlight": "이 카드가 주목받는 핵심 이유 한 줄",
      "detail": "연회비, 전월실적, 대표 혜택을 포함한 2~3문장 설명",
      "tags": ["태그1", "태그2"]
    }
  ],
  "events": [
    {
      "issuer": "카드사명",
      "title": "이벤트 제목",
      "period": "~3/31",
      "detail": "이벤트 핵심 내용 한 줄"
    }
  ],
  "comboInsight": {
    "card1": "첫번째 추천 카드명",
    "card1Issuer": "카드사",
    "card1Benefits": ["카페 50%", "배달 10%"],
    "card2": "두번째 추천 카드명",
    "card2Issuer": "카드사",
    "card2Benefits": ["마트 10%", "교통 10%"],
    "coveragePercent": 89,
    "monthlySaving": 53200,
    "description": "이 조합을 추천하는 이유 2문장"
  },
  "nextWeek": {
    "preview": "다음 주 카드 시장 전망 3~4문장",
    "keywords": ["키워드1", "키워드2", "키워드3"]
  }
}

rankings는 정확히 3개, events는 6개(카드사별 1개씩), 실제 현재 시즌에 맞는 현실적인 내용으로 작성하세요.`;
}

function buildAITrendReportPrompt() {
    const weekLabel = getWeekLabel();

    return `당신은 AI 산업 전문 애널리스트입니다.
오늘 날짜 기준 최신 AI 뉴스와 동향을 조사하여 "${weekLabel} AI 동향 리포트"를 작성하세요.

## 반드시 아래 JSON만 출력하세요:
{
  "title": "${weekLabel} AI 동향 리포트",
  "summary": {
    "title": "이번 주 AI 업계 핵심 이슈 제목 (20자 이내)",
    "body": "이번 주 AI 업계 핵심 동향을 3~4문장으로 요약",
    "mood": "positive 또는 neutral 또는 negative"
  },
  "topNews": [
    {
      "rank": 1,
      "category": "빅테크 또는 스타트업 또는 규제 또는 제품 또는 오픈소스",
      "title": "뉴스 제목",
      "company": "관련 기업/기관명",
      "date": "2026.02.28",
      "body": "뉴스 핵심 내용 3~4문장",
      "aiComment": "이 뉴스가 시장에 미치는 영향 분석 1~2문장",
      "impact": 10
    }
  ],
  "industryStats": [
    { "label": "글로벌 AI 투자", "value": "$4.2B", "change": "▲18%" },
    { "label": "한국 AI 투자", "value": "₩3,200억", "change": "▲25%" },
    { "label": "신규 AI 스타트업", "value": "47개", "change": "▲12%" },
    { "label": "AI 특허 출원", "value": "1,230건", "change": "▲8%" }
  ],
  "techTrends": [
    {
      "keyword": "#키워드",
      "title": "트렌드 제목",
      "body": "트렌드 설명 2~3문장"
    }
  ],
  "koreaUpdates": [
    {
      "company": "기업명",
      "update": "업데이트 내용 한 줄"
    }
  ],
  "nextWeek": {
    "preview": "다음 주 AI 업계 전망 3~4문장",
    "events": [
      { "date": "3/3", "day": "월", "event": "예정 이벤트명" }
    ]
  }
}

topNews는 정확히 5개, techTrends는 3개, koreaUpdates는 4개 작성.
반드시 현재 실제로 일어나고 있는 최신 뉴스와 동향을 기반으로 작성하세요.`;
}

function buildFinanceReportPrompt() {
    const weekLabel = getWeekLabel();

    return `당신은 글로벌 금융시장 전문 AI 애널리스트입니다.
오늘 날짜 기준 최신 금융 데이터를 조사하여 "${weekLabel} 금융 리포트"를 작성하세요.

## 반드시 아래 JSON만 출력하세요:
{
  "title": "${weekLabel} 금융 리포트",
  "summary": {
    "title": "이번 주 금융시장 핵심 요약 제목 (20자 이내)",
    "body": "이번 주 글로벌 금융시장 핵심 동향 3~4문장 요약",
    "mood": "positive 또는 neutral 또는 negative"
  },
  "marketTable": [
    { "name": "KOSPI", "value": "2,687.45", "change": "+1.8%", "isUp": true },
    { "name": "KOSDAQ", "value": "891.23", "change": "+2.4%", "isUp": true },
    { "name": "S&P 500", "value": "6,142.80", "change": "+1.5%", "isUp": true },
    { "name": "나스닥", "value": "20,456", "change": "+2.3%", "isUp": true },
    { "name": "니케이225", "value": "39,872", "change": "+0.9%", "isUp": true },
    { "name": "비트코인", "value": "$97,450", "change": "+5.2%", "isUp": true },
    { "name": "원/달러", "value": "1,385", "change": "-0.9%", "isUp": false },
    { "name": "금(온스)", "value": "$2,945", "change": "+1.1%", "isUp": true }
  ],
  "hotStocks": {
    "korea": [
      {
        "name": "종목명",
        "code": "005930",
        "price": "72,400원",
        "change": "+4.2%",
        "isUp": true,
        "reason": "상승/하락 이유 한 줄",
        "foreignFlow": "외국인 순매수 3,200억",
        "aiVerdict": "긍정 또는 부정 또는 중립",
        "aiComment": "AI 판단 근거 한 줄"
      }
    ],
    "overseas": [
      {
        "name": "종목명",
        "symbol": "NVDA",
        "price": "$924.50",
        "change": "+3.8%",
        "isUp": true,
        "reason": "상승/하락 이유 한 줄"
      }
    ]
  },
  "signals": {
    "positive": [
      "긍정 시그널 1",
      "긍정 시그널 2",
      "긍정 시그널 3"
    ],
    "negative": [
      "주의 시그널 1",
      "주의 시그널 2",
      "주의 시그널 3"
    ]
  },
  "crypto": {
    "summary": "가상화폐 시장 동향 요약 2~3문장",
    "top3": [
      { "name": "BTC", "price": "$97,450", "change": "+5.2%", "note": "핵심 포인트 한 줄" },
      { "name": "ETH", "price": "$3,890", "change": "+7.3%", "note": "핵심 포인트 한 줄" },
      { "name": "SOL", "price": "$245", "change": "+12.1%", "note": "핵심 포인트 한 줄" }
    ]
  },
  "nextWeek": {
    "preview": "다음 주 금융시장 전망 3~4문장",
    "events": [
      { "date": "3/3", "day": "월", "event": "주요 경제 일정" }
    ]
  }
}

hotStocks.korea는 3개, hotStocks.overseas는 3개 작성.
반드시 최신 실제 시장 데이터를 기반으로 현실적인 수치를 작성하세요.`;
}

// ══════════════════════════════════════════════════
// 렌더링 서브 컴포넌트들
// ══════════════════════════════════════════════════

function SectionTitle({ icon, title, sub }) {
    return (
        <div className="flex items-center gap-2 mb-4 mt-8 first:mt-0">
            <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
            <h3 className="text-[16px] font-bold text-toss-gray-800 dark:text-white">{title}</h3>
            {sub && <span className="text-[11px] text-toss-gray-400 dark:text-gray-600 ml-auto">{sub}</span>}
        </div>
    );
}

function MoodBadge({ mood }) {
    const config = {
        positive: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-500', label: '🔥 긍정적' },
        negative: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-500', label: '❄️ 부정적' },
        neutral: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500', label: '➖ 중립' },
    };
    const c = config[mood] || config.neutral;
    return (
        <span className={`${c.bg} ${c.text} text-[11px] font-bold px-2 py-1 rounded-lg`}>{c.label}</span>
    );
}

// ── 카드 리포트 렌더 ──
function CardReportView({ data }) {
    if (!data) return null;
    return (
        <div className="space-y-2">
            {/* 요약 */}
            <div className="bg-gradient-to-br from-primary/5 to-blue-50 dark:from-primary/10 dark:to-gray-900 rounded-[20px] p-5 border border-primary/10">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🔥</span>
                    <h3 className="text-[15px] font-bold text-toss-gray-800 dark:text-white">{data.summary?.title}</h3>
                    <MoodBadge mood={data.summary?.mood} />
                </div>
                <p className="text-[14px] text-toss-gray-600 dark:text-gray-300 leading-relaxed">{data.summary?.body}</p>
            </div>

            {/* 인기 급상승 TOP 3 */}
            <SectionTitle icon="trending_up" title="주간 인기 급상승 카드 TOP 3" />
            <div className="space-y-3">
                {data.rankings?.map((item, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#1a1a1a] rounded-[20px] p-5 border border-toss-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3 mb-3">
                            <span className={`text-[20px] font-black ${idx === 0 ? 'text-primary' : 'text-toss-gray-400'}`}>
                                {item.rank}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[16px] font-bold text-toss-gray-800 dark:text-white truncate">{item.title}</p>
                                <p className="text-[12px] text-toss-gray-500 dark:text-gray-500">{item.subtitle}</p>
                            </div>
                            <span className={`text-[12px] font-bold px-2 py-1 rounded-lg ${item.badgeType === 'up' ? 'bg-red-50 dark:bg-red-900/20 text-red-500'
                                : item.badgeType === 'new' ? 'bg-primary/10 text-primary'
                                    : item.badgeType === 'down' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                }`}>
                                {item.badge}
                            </span>
                        </div>
                        <div className="bg-toss-gray-50 dark:bg-gray-900/50 rounded-2xl p-3 mb-3">
                            <p className="text-[13px] font-semibold text-primary">📌 {item.highlight}</p>
                        </div>
                        <p className="text-[13px] text-toss-gray-600 dark:text-gray-400 leading-relaxed">{item.detail}</p>
                        <div className="flex gap-1.5 mt-3">
                            {item.tags?.map((tag, i) => (
                                <span key={i} className="text-[10px] bg-toss-gray-100 dark:bg-gray-800 text-toss-gray-500 dark:text-gray-500 px-2 py-0.5 rounded-md">#{tag}</span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* 카드사별 이벤트 */}
            <SectionTitle icon="celebration" title="카드사별 핫 이벤트" />
            <div className="space-y-2">
                {data.events?.map((evt, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-white dark:bg-[#1a1a1a] rounded-[16px] border border-toss-gray-100 dark:border-gray-800">
                        <span className="text-[12px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg shrink-0">{evt.issuer}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-toss-gray-800 dark:text-white">{evt.title}</p>
                            <p className="text-[12px] text-toss-gray-500 dark:text-gray-500 mt-0.5">{evt.detail}</p>
                        </div>
                        <span className="text-[11px] text-toss-gray-400 dark:text-gray-600 shrink-0">{evt.period}</span>
                    </div>
                ))}
            </div>

            {/* 숨은 카드 조합 */}
            {data.comboInsight && (
                <>
                    <SectionTitle icon="auto_awesome" title="AI가 발견한 숨은 카드 조합" />
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 rounded-[20px] p-5 border border-yellow-200/50 dark:border-yellow-800/30">
                        <p className="text-[12px] font-bold text-orange-600 dark:text-orange-400 mb-4">💡 이번 주 최적 2장 조합</p>
                        <div className="flex items-stretch gap-3 mb-5">
                            <div className="flex-1 bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-toss-gray-100 dark:border-gray-800">
                                <p className="text-[11px] text-toss-gray-500 dark:text-gray-500 mb-1">{data.comboInsight.card1Issuer}</p>
                                <p className="text-[14px] font-bold text-toss-gray-800 dark:text-white mb-2">{data.comboInsight.card1}</p>
                                {data.comboInsight.card1Benefits?.map((b, i) => (
                                    <p key={i} className="text-[12px] text-toss-gray-600 dark:text-gray-400">• {b}</p>
                                ))}
                            </div>
                            <div className="flex items-center">
                                <span className="text-xl font-black text-orange-400">+</span>
                            </div>
                            <div className="flex-1 bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-toss-gray-100 dark:border-gray-800">
                                <p className="text-[11px] text-toss-gray-500 dark:text-gray-500 mb-1">{data.comboInsight.card2Issuer}</p>
                                <p className="text-[14px] font-bold text-toss-gray-800 dark:text-white mb-2">{data.comboInsight.card2}</p>
                                {data.comboInsight.card2Benefits?.map((b, i) => (
                                    <p key={i} className="text-[12px] text-toss-gray-600 dark:text-gray-400">• {b}</p>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            <div className="text-center bg-white dark:bg-[#1a1a1a] rounded-xl p-3 border border-toss-gray-100 dark:border-gray-800">
                                <p className="text-[10px] text-toss-gray-500 dark:text-gray-500">커버리지</p>
                                <p className="text-[16px] font-bold text-primary">{data.comboInsight.coveragePercent}%</p>
                            </div>
                            <div className="text-center bg-white dark:bg-[#1a1a1a] rounded-xl p-3 border border-toss-gray-100 dark:border-gray-800">
                                <p className="text-[10px] text-toss-gray-500 dark:text-gray-500">월 절약</p>
                                <p className="text-[16px] font-bold text-red-500">₩{(data.comboInsight.monthlySaving || 0).toLocaleString()}</p>
                            </div>
                            <div className="text-center bg-white dark:bg-[#1a1a1a] rounded-xl p-3 border border-toss-gray-100 dark:border-gray-800">
                                <p className="text-[10px] text-toss-gray-500 dark:text-gray-500">연 순이익</p>
                                <p className="text-[16px] font-bold text-red-500">₩{((data.comboInsight.monthlySaving || 0) * 12).toLocaleString()}</p>
                            </div>
                        </div>
                        <p className="text-[12px] text-toss-gray-600 dark:text-gray-400 leading-relaxed">{data.comboInsight.description}</p>
                    </div>
                </>
            )}

            {/* 다음 주 전망 */}
            {data.nextWeek && (
                <>
                    <SectionTitle icon="calendar_month" title="다음 주 미리보기" />
                    <div className="bg-toss-gray-50 dark:bg-gray-900/50 rounded-[20px] p-5 border border-toss-gray-100 dark:border-gray-800">
                        <p className="text-[14px] text-toss-gray-700 dark:text-gray-300 leading-relaxed mb-3">{data.nextWeek.preview}</p>
                        <div className="flex gap-2 flex-wrap">
                            {data.nextWeek.keywords?.map((kw, i) => (
                                <span key={i} className="text-[11px] bg-primary/10 text-primary px-2.5 py-1 rounded-lg font-semibold">#{kw}</span>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ── AI 동향 리포트 렌더 ──
function AITrendReportView({ data }) {
    if (!data) return null;
    return (
        <div className="space-y-2">
            {/* 요약 */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 rounded-[20px] p-5 border border-purple-200/50 dark:border-purple-800/30">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">⚡</span>
                    <h3 className="text-[15px] font-bold text-toss-gray-800 dark:text-white">{data.summary?.title}</h3>
                    <MoodBadge mood={data.summary?.mood} />
                </div>
                <p className="text-[14px] text-toss-gray-600 dark:text-gray-300 leading-relaxed">{data.summary?.body}</p>
            </div>

            {/* TOP 5 뉴스 */}
            <SectionTitle icon="newspaper" title="이번 주 AI 핵심 뉴스 TOP 5" />
            <div className="space-y-3">
                {data.topNews?.map((news, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#1a1a1a] rounded-[20px] p-5 border border-toss-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-[18px] font-black text-primary">{news.rank}</span>
                            <span className="text-[11px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-lg">{news.category}</span>
                            <span className="text-[11px] text-toss-gray-400 dark:text-gray-600 ml-auto">{news.date}</span>
                        </div>
                        <p className="text-[15px] font-bold text-toss-gray-800 dark:text-white mb-1">{news.title}</p>
                        <p className="text-[12px] text-toss-gray-500 dark:text-gray-500 mb-3">🏢 {news.company}</p>
                        <p className="text-[13px] text-toss-gray-600 dark:text-gray-400 leading-relaxed mb-3">{news.body}</p>
                        <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-3 mb-3">
                            <p className="text-[12px] text-primary font-semibold">💬 AI 분석: {news.aiComment}</p>
                        </div>
                        {/* 임팩트 바 */}
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-toss-gray-500 dark:text-gray-500">임팩트</span>
                            <div className="flex-1 h-2 bg-toss-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all"
                                    style={{ width: `${(news.impact || 5) * 10}%` }}
                                />
                            </div>
                            <span className="text-[11px] font-bold text-primary">{news.impact}/10</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* 산업 지표 */}
            <SectionTitle icon="analytics" title="주간 AI 산업 지표" />
            <div className="grid grid-cols-2 gap-3">
                {data.industryStats?.map((stat, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#1a1a1a] rounded-[16px] p-4 border border-toss-gray-100 dark:border-gray-800">
                        <p className="text-[11px] text-toss-gray-500 dark:text-gray-500 mb-1">{stat.label}</p>
                        <p className="text-[16px] font-bold text-toss-gray-800 dark:text-white">{stat.value}</p>
                        <p className={`text-[12px] font-semibold ${stat.change?.includes('▲') || stat.change?.includes('+') ? 'text-red-500' : 'text-blue-500'}`}>
                            {stat.change}
                        </p>
                    </div>
                ))}
            </div>

            {/* 기술 트렌드 */}
            <SectionTitle icon="science" title="주목할 AI 기술 트렌드" />
            <div className="space-y-3">
                {data.techTrends?.map((trend, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#1a1a1a] rounded-[16px] p-4 border border-toss-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[11px] font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg">{trend.keyword}</span>
                        </div>
                        <p className="text-[14px] font-bold text-toss-gray-800 dark:text-white mb-1">{trend.title}</p>
                        <p className="text-[13px] text-toss-gray-600 dark:text-gray-400 leading-relaxed">{trend.body}</p>
                    </div>
                ))}
            </div>

            {/* 국내 동향 */}
            <SectionTitle icon="flag" title="국내 AI 동향" sub="🇰🇷" />
            <div className="space-y-2">
                {data.koreaUpdates?.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-white dark:bg-[#1a1a1a] rounded-[16px] border border-toss-gray-100 dark:border-gray-800">
                        <span className="text-[12px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg shrink-0">{item.company}</span>
                        <p className="text-[13px] text-toss-gray-700 dark:text-gray-300 leading-snug">{item.update}</p>
                    </div>
                ))}
            </div>

            {/* 다음 주 전망 */}
            {data.nextWeek && (
                <>
                    <SectionTitle icon="calendar_month" title="다음 주 AI 전망" />
                    <div className="bg-toss-gray-50 dark:bg-gray-900/50 rounded-[20px] p-5 border border-toss-gray-100 dark:border-gray-800">
                        <p className="text-[14px] text-toss-gray-700 dark:text-gray-300 leading-relaxed mb-4">{data.nextWeek.preview}</p>
                        {data.nextWeek.events?.length > 0 && (
                            <div className="space-y-2">
                                {data.nextWeek.events.map((evt, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg shrink-0">{evt.date} ({evt.day})</span>
                                        <p className="text-[12px] text-toss-gray-600 dark:text-gray-400">{evt.event}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ── 금융 리포트 렌더 ──
function FinanceReportView({ data }) {
    if (!data) return null;
    return (
        <div className="space-y-2">
            {/* 요약 */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-[20px] p-5 border border-green-200/50 dark:border-green-800/30">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">📍</span>
                    <h3 className="text-[15px] font-bold text-toss-gray-800 dark:text-white">{data.summary?.title}</h3>
                    <MoodBadge mood={data.summary?.mood} />
                </div>
                <p className="text-[14px] text-toss-gray-600 dark:text-gray-300 leading-relaxed">{data.summary?.body}</p>
            </div>

            {/* 시장 테이블 */}
            <SectionTitle icon="table_chart" title="주요 지수 주간 성적표" />
            <div className="bg-white dark:bg-[#1a1a1a] rounded-[20px] border border-toss-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="grid grid-cols-3 bg-toss-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-toss-gray-100 dark:border-gray-800">
                    <p className="text-[11px] font-bold text-toss-gray-500 dark:text-gray-500">지수</p>
                    <p className="text-[11px] font-bold text-toss-gray-500 dark:text-gray-500 text-right">종가</p>
                    <p className="text-[11px] font-bold text-toss-gray-500 dark:text-gray-500 text-right">주간등락</p>
                </div>
                {data.marketTable?.map((row, idx) => (
                    <div key={idx} className={`grid grid-cols-3 px-4 py-3 ${idx < data.marketTable.length - 1 ? 'border-b border-toss-gray-50 dark:border-gray-800/50' : ''}`}>
                        <p className="text-[13px] font-semibold text-toss-gray-800 dark:text-white">{row.name}</p>
                        <p className="text-[13px] font-bold text-toss-gray-800 dark:text-white text-right">{row.value}</p>
                        <p className={`text-[13px] font-bold text-right ${row.isUp ? 'text-red-500' : 'text-blue-500'}`}>
                            {row.isUp ? '▲' : '▼'} {row.change?.replace(/[+-]/, '')}
                        </p>
                    </div>
                ))}
            </div>

            {/* 핫 종목 - 국내 */}
            <SectionTitle icon="local_fire_department" title="이번 주 핫 종목" sub="🇰🇷 국내" />
            <div className="space-y-3">
                {data.hotStocks?.korea?.map((stock, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#1a1a1a] rounded-[20px] p-5 border border-toss-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <p className="text-[15px] font-bold text-toss-gray-800 dark:text-white">{stock.name}</p>
                                <p className="text-[11px] text-toss-gray-500 dark:text-gray-500">{stock.code}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[15px] font-bold text-toss-gray-800 dark:text-white">{stock.price}</p>
                                <p className={`text-[13px] font-bold ${stock.isUp ? 'text-red-500' : 'text-blue-500'}`}>
                                    {stock.isUp ? '▲' : '▼'} {stock.change?.replace(/[+-]/, '')}
                                </p>
                            </div>
                        </div>
                        <p className="text-[13px] text-toss-gray-600 dark:text-gray-400 mb-2">{stock.reason}</p>
                        <p className="text-[12px] text-toss-gray-500 dark:text-gray-500 mb-2">📊 {stock.foreignFlow}</p>
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold ${stock.aiVerdict === '긍정' ? 'bg-red-50 dark:bg-red-900/20 text-red-500'
                            : stock.aiVerdict === '부정' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                            }`}>
                            <span className="material-symbols-outlined text-[14px]">smart_toy</span>
                            AI: {stock.aiVerdict} — {stock.aiComment}
                        </div>
                    </div>
                ))}
            </div>

            {/* 핫 종목 - 해외 */}
            <SectionTitle icon="public" title="해외 핫 종목" sub="🇺🇸" />
            <div className="space-y-2">
                {data.hotStocks?.overseas?.map((stock, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-white dark:bg-[#1a1a1a] rounded-[16px] border border-toss-gray-100 dark:border-gray-800">
                        <div className="w-10 h-10 rounded-full bg-toss-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <span className="text-[12px] font-bold text-toss-gray-600 dark:text-gray-400">{stock.symbol}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-bold text-toss-gray-800 dark:text-white">{stock.name}</p>
                            <p className="text-[12px] text-toss-gray-500 dark:text-gray-500 truncate">{stock.reason}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-[14px] font-bold text-toss-gray-800 dark:text-white">{stock.price}</p>
                            <p className={`text-[12px] font-bold ${stock.isUp ? 'text-red-500' : 'text-blue-500'}`}>
                                {stock.isUp ? '▲' : '▼'} {stock.change?.replace(/[+-]/, '')}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* AI 시그널 */}
            <SectionTitle icon="sensors" title="주간 AI 투자 인사이트" />
            <div className="grid grid-cols-1 gap-3">
                <div className="bg-red-50 dark:bg-red-900/10 rounded-[16px] p-4 border border-red-200/50 dark:border-red-800/30">
                    <p className="text-[12px] font-bold text-red-500 mb-2">🟢 긍정 시그널</p>
                    {data.signals?.positive?.map((s, i) => (
                        <p key={i} className="text-[13px] text-toss-gray-700 dark:text-gray-300 leading-relaxed">• {s}</p>
                    ))}
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-[16px] p-4 border border-blue-200/50 dark:border-blue-800/30">
                    <p className="text-[12px] font-bold text-blue-500 mb-2">🔴 주의 시그널</p>
                    {data.signals?.negative?.map((s, i) => (
                        <p key={i} className="text-[13px] text-toss-gray-700 dark:text-gray-300 leading-relaxed">• {s}</p>
                    ))}
                </div>
            </div>

            {/* 가상화폐 */}
            <SectionTitle icon="currency_bitcoin" title="가상화폐 주간 동향" sub="₿" />
            <div className="bg-white dark:bg-[#1a1a1a] rounded-[20px] p-5 border border-toss-gray-100 dark:border-gray-800">
                <p className="text-[13px] text-toss-gray-600 dark:text-gray-400 leading-relaxed mb-4">{data.crypto?.summary}</p>
                <div className="space-y-3">
                    {data.crypto?.top3?.map((coin, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            <span className={`text-[14px] font-black ${idx === 0 ? 'text-primary' : 'text-toss-gray-400'}`}>{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-[14px] font-bold text-toss-gray-800 dark:text-white">{coin.name}</p>
                                    <p className="text-[14px] font-bold text-toss-gray-800 dark:text-white">{coin.price}</p>
                                    <p className={`text-[12px] font-bold ${coin.change?.includes('+') ? 'text-red-500' : 'text-blue-500'}`}>{coin.change}</p>
                                </div>
                                <p className="text-[12px] text-toss-gray-500 dark:text-gray-500">{coin.note}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 다음 주 */}
            {data.nextWeek && (
                <>
                    <SectionTitle icon="calendar_month" title="다음 주 주요 일정" />
                    <div className="bg-toss-gray-50 dark:bg-gray-900/50 rounded-[20px] p-5 border border-toss-gray-100 dark:border-gray-800">
                        <p className="text-[14px] text-toss-gray-700 dark:text-gray-300 leading-relaxed mb-4">{data.nextWeek.preview}</p>
                        <div className="space-y-2">
                            {data.nextWeek.events?.map((evt, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg shrink-0 min-w-[70px] text-center">{evt.date} ({evt.day})</span>
                                    <p className="text-[12px] text-toss-gray-600 dark:text-gray-400">{evt.event}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════

export default function AIWeeklyReport() {
    const [activeTab, setActiveTab] = useState('card');
    const [reports, setReports] = useState({ card: null, ai: null, finance: null });
    const [generating, setGenerating] = useState({ card: false, ai: false, finance: false });
    const [progress, setProgress] = useState({ card: 0, ai: 0, finance: 0 });

    // 초기 로드 — 캐시에서 가져오기
    useEffect(() => {
        setReports({
            card: loadCache('card'),
            ai: loadCache('ai'),
            finance: loadCache('finance'),
        });
    }, []);

    // 리포트 생성
    const generateReport = useCallback(async (type) => {
        if (generating[type] || hasTodayCache(type)) return;

        setGenerating(prev => ({ ...prev, [type]: true }));
        setProgress(prev => ({ ...prev, [type]: 0 }));

        // 프로그레스 시뮬레이션
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                const current = prev[type];
                if (current >= 90) return prev;
                const increment = Math.random() * 15 + 5;
                return { ...prev, [type]: Math.min(90, current + increment) };
            });
        }, 800);

        try {
            let prompt;
            switch (type) {
                case 'card': prompt = buildCardReportPrompt(); break;
                case 'ai': prompt = buildAITrendReportPrompt(); break;
                case 'finance': prompt = buildFinanceReportPrompt(); break;
                default: return;
            }

            const raw = await enqueueGeminiRequest(() =>
                geminiRequest(prompt, { useSearch: true })
            );

            const parsed = extractJSON(raw);

            // 캐시 저장
            saveCache(type, parsed);

            // 프로그레스 100%
            setProgress(prev => ({ ...prev, [type]: 100 }));

            // 약간의 딜레이 후 결과 반영
            setTimeout(() => {
                setReports(prev => ({ ...prev, [type]: parsed }));
                setGenerating(prev => ({ ...prev, [type]: false }));
                setProgress(prev => ({ ...prev, [type]: 0 }));
            }, 500);

        } catch (error) {
            console.error(`Report generation error (${type}):`, error);
            setGenerating(prev => ({ ...prev, [type]: false }));
            setProgress(prev => ({ ...prev, [type]: 0 }));
        } finally {
            clearInterval(progressInterval);
        }
    }, [generating]);

    const currentTab = REPORT_TABS.find(t => t.id === activeTab);
    const currentReport = reports[activeTab];
    const isGenerating = generating[activeTab];
    const hasToday = hasTodayCache(activeTab);
    const currentProgress = progress[activeTab];

    return (
        <div className="flex-1 overflow-y-auto no-scrollbar">
            {/* 서브 탭 */}
            <div className="bg-white dark:bg-[#111111] border-b border-toss-gray-100 dark:border-gray-800 shrink-0">
                <div className="flex px-5 gap-2 py-3">
                    {REPORT_TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        const hasData = reports[tab.id] !== null;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-semibold transition-all border ${isActive
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white dark:bg-[#1a1a1a] text-toss-gray-700 dark:text-gray-300 border-toss-gray-200 dark:border-gray-700'
                                    }`}
                            >
                                <span>{tab.emoji}</span>
                                {tab.label}
                                {hasData && (
                                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-green-400'}`} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 상태 바 */}
            <div className="px-5 pt-3 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">{currentTab?.icon}</span>
                    <p className="text-[13px] text-toss-gray-600 dark:text-gray-400">
                        {getWeekLabel()} · {hasToday ? '오늘 생성 완료' : '미생성'}
                    </p>
                </div>
                <p className="text-[11px] text-toss-gray-400 dark:text-gray-600">{getMonthDay()}</p>
            </div>

            {/* 콘텐츠 영역 */}
            <div className="px-5 pb-32">

                {/* ── 생성 중 ── */}
                {isGenerating && (
                    <div className="mt-8">
                        <div className="bg-white dark:bg-[#1a1a1a] rounded-[24px] p-8 border border-toss-gray-100 dark:border-gray-800 text-center">
                            <div className="w-16 h-16 mx-auto mb-5 relative">
                                <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
                                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute inset-0" />
                                <span className="material-symbols-outlined text-primary text-[24px] absolute inset-0 flex items-center justify-center">
                                    {currentTab?.icon}
                                </span>
                            </div>
                            <h3 className="text-[17px] font-bold text-toss-gray-800 dark:text-white mb-2">
                                AI가 리포트를 생성하고 있습니다
                            </h3>
                            <p className="text-[13px] text-toss-gray-500 dark:text-gray-400 mb-6">
                                Google Search + Gemini AI로 최신 데이터를 수집·분석 중...
                            </p>

                            {/* 프로그레스 바 */}
                            <div className="w-full bg-toss-gray-100 dark:bg-gray-800 rounded-full h-2 mb-3 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-700 ease-out"
                                    style={{ width: `${currentProgress}%` }}
                                />
                            </div>
                            <p className="text-[12px] text-toss-gray-400 dark:text-gray-600">
                                {currentProgress < 30 ? '데이터 수집 중...' :
                                    currentProgress < 60 ? '정보 분석 중...' :
                                        currentProgress < 90 ? '리포트 작성 중...' :
                                            '마무리 중...'}
                            </p>
                        </div>
                    </div>
                )}

                {/* ── 리포트 없음 → 생성 버튼 ── */}
                {!isGenerating && !currentReport && (
                    <div className="mt-8">
                        <div className="bg-white dark:bg-[#1a1a1a] rounded-[24px] p-8 border border-toss-gray-100 dark:border-gray-800 text-center">
                            <span className="text-5xl block mb-4">{currentTab?.emoji}</span>
                            <h3 className="text-[18px] font-bold text-toss-gray-800 dark:text-white mb-2">
                                {currentTab?.label}
                            </h3>
                            <p className="text-[14px] text-toss-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                                {activeTab === 'card' && 'AI가 이번 주 카드 시장 트렌드, 인기 카드, 이벤트, 최적 카드 조합을 분석합니다.'}
                                {activeTab === 'ai' && 'AI가 이번 주 글로벌 AI 산업 핵심 뉴스, 기술 트렌드, 투자 동향을 분석합니다.'}
                                {activeTab === 'finance' && 'AI가 이번 주 글로벌 금융시장 동향, 핫 종목, 투자 시그널을 분석합니다.'}
                            </p>
                            <button
                                onClick={() => generateReport(activeTab)}
                                className="w-full bg-primary text-white py-[16px] rounded-[18px] font-bold text-[16px] shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                                AI 리포트 생성하기
                            </button>
                            <p className="text-[11px] text-toss-gray-400 dark:text-gray-600 mt-3">
                                Gemini AI + Google Search 기반 · 1일 1회 생성 가능
                            </p>
                        </div>
                    </div>
                )}

                {/* ── 리포트 있음 → 렌더링 ── */}
                {!isGenerating && currentReport && (
                    <div className="mt-4">
                        {/* 리포트 헤더 */}
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-[18px] font-bold text-toss-gray-800 dark:text-white">
                                {currentReport.title || `${getWeekLabel()} ${currentTab?.label}`}
                            </h2>
                        </div>

                        {/* 리포트 본문 */}
                        {activeTab === 'card' && <CardReportView data={currentReport} />}
                        {activeTab === 'ai' && <AITrendReportView data={currentReport} />}
                        {activeTab === 'finance' && <FinanceReportView data={currentReport} />}

                        {/* 푸터 */}
                        <div className="mt-8 p-4 bg-toss-gray-50 dark:bg-gray-900/50 rounded-2xl">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="material-symbols-outlined text-[16px] text-primary">smart_toy</span>
                                <span className="text-[12px] font-bold text-primary">AI Generated Report</span>
                            </div>
                            <p className="text-[11px] text-toss-gray-500 dark:text-gray-500 leading-relaxed">
                                본 리포트는 Gemini AI + Google Search 기반으로 자동 생성되었습니다.
                                투자 결정의 참고자료이며, 실제 투자에 대한 책임은 사용자에게 있습니다.
                            </p>
                            <p className="text-[10px] text-toss-gray-400 dark:text-gray-600 mt-1">
                                📅 {getMonthDay()} 생성 · 다음 생성 가능: 내일
                            </p>
                        </div>

                        {/* 이미 오늘 생성된 경우 비활성 버튼 */}
                        <button
                            disabled
                            className="w-full mt-4 bg-toss-gray-100 dark:bg-gray-800 text-toss-gray-400 dark:text-gray-600 py-[14px] rounded-[18px] font-bold text-[14px] cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            오늘의 리포트가 이미 생성되었습니다
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
