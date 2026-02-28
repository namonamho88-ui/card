import React, { useState, useEffect, useCallback, useRef } from 'react';
import { geminiRequest, extractJSON, enqueueGeminiRequest } from '../utils/geminiUtils';
import cardData from '../data/popularCards.json';
import html2canvas from 'html2canvas';

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
    { id: 'shinhan', label: '신한 리포트', icon: 'account_balance', emoji: '🏦' },
    { id: 'ai', label: 'AI 동향', icon: 'psychology', emoji: '🤖' },
    { id: 'card', label: '카드 리포트', icon: 'credit_card', emoji: '💳' },
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

// ── ✅ 신한금융그룹 위클리 리포트 프롬프트 (구 finance) ──
function buildShinhanReportPrompt() {
    const weekLabel = getWeekLabel();

    return `당신은 신한금융그룹 전문 리서치 애널리스트입니다.
오늘 날짜 기준 최신 뉴스와 공시를 기반으로 "${weekLabel} 신한금융그룹 위클리 리포트"를 작성하세요.

신한금융그룹의 주요 계열사는 다음과 같습니다:
- 신한지주 (005930 → 055550): 그룹 지배구조, 배당, IR, ESG, 주가
- 신한은행: 여·수신 금리, 기업·가계 대출, 디지털 뱅킹, 해외법인
- 신한카드: 카드 승인액, 마케팅 이벤트, BNPL, 디지털 카드
- 신한투자증권: 시황, 주요 리포트, IB딜, 자산관리
- 신한라이프: 보험 신상품, 보험료, 실적 및 계약 건수
- 신한캐피탈: 리스·할부, 기업금융, 자동차금융
- 제주은행: 제주 지역 특화 이슈
- 신한DS: IT 시스템, 디지털 전환 인프라
- 신한벤처투자: 스타트업 투자, 펀드 결성

## 반드시 아래 JSON만 출력하세요. 다른 텍스트 없이 JSON만:
{
  "title": "${weekLabel} 신한금융그룹 위클리 리포트",
  "summary": {
    "title": "이번 주 신한금융그룹 핵심 이슈 제목 (20자 이내)",
    "body": "이번 주 신한금융그룹 전반의 핵심 동향을 3~4문장으로 요약. 지주사 전략, 계열사 이슈, 시장 반응을 포함하여 작성.",
    "mood": "positive 또는 neutral 또는 negative",
    "stockPrice": "신한지주 현재가 (예: 52,300원)",
    "stockChange": "주간 등락 (예: +2.3%)",
    "stockIsUp": true
  },
  "holdingIssues": [
    {
      "category": "배당 또는 IR 또는 ESG 또는 지배구조 또는 실적 또는 인사",
      "title": "지주사 이슈 제목",
      "body": "이슈 핵심 내용 2~3문장",
      "importance": "high 또는 medium 또는 low"
    }
  ],
  "subsidiaryUpdates": [
    {
      "company": "신한은행",
      "icon": "account_balance",
      "color": "blue",
      "headline": "계열사 주간 핵심 헤드라인 한 줄",
      "details": ["세부 이슈 1", "세부 이슈 2"],
      "sentiment": "positive 또는 neutral 또는 negative"
    },
    {
      "company": "신한카드",
      "icon": "credit_card",
      "color": "red",
      "headline": "계열사 주간 핵심 헤드라인 한 줄",
      "details": ["세부 이슈 1", "세부 이슈 2"],
      "sentiment": "positive 또는 neutral 또는 negative"
    },
    {
      "company": "신한투자증권",
      "icon": "show_chart",
      "color": "green",
      "headline": "계열사 주간 핵심 헤드라인 한 줄",
      "details": ["세부 이슈 1", "세부 이슈 2"],
      "sentiment": "positive 또는 neutral 또는 negative"
    },
    {
      "company": "신한라이프",
      "icon": "favorite",
      "color": "pink",
      "headline": "계열사 주간 핵심 헤드라인 한 줄",
      "details": ["세부 이슈 1", "세부 이슈 2"],
      "sentiment": "positive 또는 neutral 또는 negative"
    },
    {
      "company": "신한캐피탈",
      "icon": "directions_car",
      "color": "orange",
      "headline": "계열사 주간 핵심 헤드라인 한 줄",
      "details": ["세부 이슈 1"],
      "sentiment": "positive 또는 neutral 또는 negative"
    }
  ],
  "keyMetrics": [
    { "label": "신한지주 시가총액", "value": "약 26조원", "change": "▲1.2%" },
    { "label": "신한은행 NIM", "value": "1.68%", "change": "▼0.02%p" },
    { "label": "신한카드 승인액", "value": "월 12.3조원", "change": "▲3.5%" },
    { "label": "그룹 ROE", "value": "10.2%", "change": "▲0.3%p" }
  ],
  "analystView": {
    "consensus": "매수 또는 중립 또는 매도",
    "targetPrice": "목표주가 (예: 62,000원)",
    "currentPrice": "현재가 (예: 52,300원)",
    "upside": "상승여력 (예: +18.5%)",
    "comment": "애널리스트 종합 의견 2~3문장. 밸류에이션, 배당수익률, 리스크 요인을 포함."
  },
  "globalPeerComparison": [
    { "name": "KB금융", "change": "+1.8%", "isUp": true, "note": "한 줄 코멘트" },
    { "name": "하나금융", "change": "+0.9%", "isUp": true, "note": "한 줄 코멘트" },
    { "name": "우리금융", "change": "-0.3%", "isUp": false, "note": "한 줄 코멘트" },
    { "name": "카카오뱅크", "change": "+2.1%", "isUp": true, "note": "한 줄 코멘트" }
  ],
  "riskFactors": [
    { "factor": "리스크 항목", "description": "리스크 설명 한 줄", "level": "high 또는 medium 또는 low" }
  ],
  "nextWeek": {
    "preview": "다음 주 신한금융그룹 관련 주요 전망 및 일정 3~4문장",
    "events": [
      { "date": "3/3", "day": "월", "event": "예정 이벤트 또는 공시 또는 IR 일정" }
    ]
  }
}

holdingIssues는 정확히 3개, subsidiaryUpdates는 5개(위 계열사 순서 그대로), keyMetrics는 4개, riskFactors는 3개, nextWeek.events는 3~4개 작성.
반드시 최신 실제 뉴스·공시·시장 데이터를 기반으로 현실적인 내용을 작성하세요.`;
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

// ── 카드 리포트 렌더 (변경 없음) ──
function CardReportView({ data }) {
    if (!data) return null;
    return (
        <div className="space-y-2">
            <div className="bg-gradient-to-br from-primary/5 to-blue-50 dark:from-primary/10 dark:to-gray-900 rounded-[20px] p-5 border border-primary/10">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🔥</span>
                    <h3 className="text-[15px] font-bold text-toss-gray-800 dark:text-white">{data.summary?.title}</h3>
                    <MoodBadge mood={data.summary?.mood} />
                </div>
                <p className="text-[14px] text-toss-gray-600 dark:text-gray-300 leading-relaxed">{data.summary?.body}</p>
            </div>

            <SectionTitle icon="trending_up" title="주간 인기 급상승 카드 TOP 3" />
            <div className="space-y-3">
                {data.rankings?.map((item, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#1a1a1a] rounded-[20px] p-5 border border-toss-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3 mb-3">
                            <span className={`text-[20px] font-black ${idx === 0 ? 'text-primary' : 'text-toss-gray-400'}`}>{item.rank}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[16px] font-bold text-toss-gray-800 dark:text-white truncate">{item.title}</p>
                                <p className="text-[12px] text-toss-gray-500 dark:text-gray-500">{item.subtitle}</p>
                            </div>
                            <span className={`text-[12px] font-bold px-2 py-1 rounded-lg ${item.badgeType === 'up' ? 'bg-red-50 dark:bg-red-900/20 text-red-500'
                                : item.badgeType === 'new' ? 'bg-primary/10 text-primary'
                                    : item.badgeType === 'down' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                }`}>{item.badge}</span>
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

// ── AI 동향 리포트 렌더 (변경 없음) ──
function AITrendReportView({ data }) {
    if (!data) return null;
    return (
        <div className="space-y-2">
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 rounded-[20px] p-5 border border-purple-200/50 dark:border-purple-800/30">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">⚡</span>
                    <h3 className="text-[15px] font-bold text-toss-gray-800 dark:text-white">{data.summary?.title}</h3>
                    <MoodBadge mood={data.summary?.mood} />
                </div>
                <p className="text-[14px] text-toss-gray-600 dark:text-gray-300 leading-relaxed">{data.summary?.body}</p>
            </div>

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

            <SectionTitle icon="flag" title="국내 AI 동향" sub="🇰🇷" />
            <div className="space-y-2">
                {data.koreaUpdates?.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-white dark:bg-[#1a1a1a] rounded-[16px] border border-toss-gray-100 dark:border-gray-800">
                        <span className="text-[12px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg shrink-0">{item.company}</span>
                        <p className="text-[13px] text-toss-gray-700 dark:text-gray-300 leading-snug">{item.update}</p>
                    </div>
                ))}
            </div>

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

// ── ✅ 신한금융그룹 리포트 렌더 (신규) ──

// 계열사별 색상/아이콘 팔레트
const SUBSIDIARY_STYLE = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/10', border: 'border-blue-200/50 dark:border-blue-800/30', badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', dot: 'bg-blue-400' },
    red: { bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-200/50 dark:border-red-800/30', badge: 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400', dot: 'bg-red-400' },
    green: { bg: 'bg-green-50 dark:bg-green-900/10', border: 'border-green-200/50 dark:border-green-800/30', badge: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400', dot: 'bg-green-400' },
    pink: { bg: 'bg-pink-50 dark:bg-pink-900/10', border: 'border-pink-200/50 dark:border-pink-800/30', badge: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400', dot: 'bg-pink-400' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-900/10', border: 'border-orange-200/50 dark:border-orange-800/30', badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400', dot: 'bg-orange-400' },
};

const IMPORTANCE_CONFIG = {
    high: { bg: 'bg-red-50 dark:bg-red-900/20 border-red-200/50 dark:border-red-800/30', label: 'bg-red-100 dark:bg-red-900/40 text-red-500', text: '🔴 핵심' },
    medium: { bg: 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200/50 dark:border-yellow-800/30', label: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600', text: '🟡 주목' },
    low: { bg: 'bg-gray-50 dark:bg-gray-900/50 border-toss-gray-100 dark:border-gray-800', label: 'bg-gray-100 dark:bg-gray-800 text-gray-500', text: '⚪ 일반' },
};

const RISK_LEVEL_CONFIG = {
    high: { bar: 'w-full bg-red-400', text: 'text-red-500', label: '높음' },
    medium: { bar: 'w-2/3 bg-yellow-400', text: 'text-yellow-500', label: '중간' },
    low: { bar: 'w-1/3 bg-green-400', text: 'text-green-500', label: '낮음' },
};

function ShinhanReportView({ data }) {
    if (!data) return null;

    const { summary, holdingIssues, subsidiaryUpdates, keyMetrics, analystView, globalPeerComparison, riskFactors, nextWeek } = data;

    return (
        <div className="space-y-2">

            {/* ── 요약 + 신한지주 주가 ── */}
            <div className="bg-gradient-to-br from-[#0046FF]/5 to-blue-50 dark:from-[#0046FF]/10 dark:to-gray-900 rounded-[20px] p-5 border border-[#0046FF]/10">
                {/* 신한 브랜드 헤더 */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-[#0046FF] rounded-xl flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-white text-[16px]">account_balance</span>
                    </div>
                    <span className="text-[13px] font-bold text-[#0046FF]">신한금융그룹</span>
                    <MoodBadge mood={summary?.mood} />
                </div>

                {/* 신한지주 주가 인라인 */}
                {summary?.stockPrice && (
                    <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-[22px] font-black text-toss-gray-800 dark:text-white">{summary.stockPrice}</span>
                        <span className={`text-[14px] font-bold ${summary.stockIsUp ? 'text-red-500' : 'text-blue-500'}`}>
                            {summary.stockIsUp ? '▲' : '▼'} {summary.stockChange?.replace(/[+-]/, '')}
                        </span>
                        <span className="text-[11px] text-toss-gray-400 dark:text-gray-600">신한지주 (055550)</span>
                    </div>
                )}

                <h3 className="text-[15px] font-bold text-toss-gray-800 dark:text-white mb-2">{summary?.title}</h3>
                <p className="text-[14px] text-toss-gray-600 dark:text-gray-300 leading-relaxed">{summary?.body}</p>
            </div>

            {/* ── 핵심 지표 4종 ── */}
            <SectionTitle icon="monitoring" title="주요 그룹 지표" />
            <div className="grid grid-cols-2 gap-3">
                {keyMetrics?.map((metric, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#1a1a1a] rounded-[16px] p-4 border border-toss-gray-100 dark:border-gray-800">
                        <p className="text-[11px] text-toss-gray-500 dark:text-gray-500 mb-1">{metric.label}</p>
                        <p className="text-[16px] font-bold text-toss-gray-800 dark:text-white">{metric.value}</p>
                        <p className={`text-[12px] font-semibold mt-0.5 ${metric.change?.includes('▲') || metric.change?.includes('+') ? 'text-red-500' : 'text-blue-500'
                            }`}>{metric.change}</p>
                    </div>
                ))}
            </div>

            {/* ── 지주사 핵심 이슈 ── */}
            <SectionTitle icon="corporate_fare" title="신한지주 주간 핵심 이슈" />
            <div className="space-y-3">
                {holdingIssues?.map((issue, idx) => {
                    const cfg = IMPORTANCE_CONFIG[issue.importance] || IMPORTANCE_CONFIG.low;
                    return (
                        <div key={idx} className={`rounded-[16px] p-4 border ${cfg.bg}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cfg.label}`}>{cfg.text}</span>
                                <span className="text-[11px] font-semibold text-toss-gray-500 dark:text-gray-400 bg-white dark:bg-[#1a1a1a] px-2 py-0.5 rounded-md border border-toss-gray-100 dark:border-gray-700">
                                    {issue.category}
                                </span>
                            </div>
                            <p className="text-[14px] font-bold text-toss-gray-800 dark:text-white mb-1.5">{issue.title}</p>
                            <p className="text-[13px] text-toss-gray-600 dark:text-gray-400 leading-relaxed">{issue.body}</p>
                        </div>
                    );
                })}
            </div>

            {/* ── 계열사별 위클리 업데이트 ── */}
            <SectionTitle icon="business" title="계열사 위클리 업데이트" />
            <div className="space-y-3">
                {subsidiaryUpdates?.map((sub, idx) => {
                    const style = SUBSIDIARY_STYLE[sub.color] || SUBSIDIARY_STYLE.blue;
                    const sentimentText = sub.sentiment === 'positive' ? '▲ 긍정' : sub.sentiment === 'negative' ? '▼ 부정' : '→ 중립';
                    const sentimentColor = sub.sentiment === 'positive' ? 'text-red-500' : sub.sentiment === 'negative' ? 'text-blue-500' : 'text-gray-500';

                    return (
                        <div key={idx} className={`rounded-[20px] p-5 border ${style.bg} ${style.border}`}>
                            {/* 계열사 헤더 */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className={`material-symbols-outlined text-[18px] ${style.badge.split(' ').find(c => c.startsWith('text-'))}`}>
                                        {sub.icon}
                                    </span>
                                    <span className={`text-[12px] font-bold px-2.5 py-1 rounded-lg ${style.badge}`}>
                                        {sub.company}
                                    </span>
                                </div>
                                <span className={`text-[11px] font-bold ${sentimentColor}`}>{sentimentText}</span>
                            </div>
                            {/* 헤드라인 */}
                            <p className="text-[14px] font-bold text-toss-gray-800 dark:text-white mb-2.5">{sub.headline}</p>
                            {/* 세부 이슈 */}
                            <div className="space-y-1.5">
                                {sub.details?.map((d, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
                                        <p className="text-[12px] text-toss-gray-600 dark:text-gray-400 leading-snug">{d}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── 애널리스트 뷰 ── */}
            {analystView && (
                <>
                    <SectionTitle icon="manage_search" title="애널리스트 컨센서스" />
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-[20px] p-5 border border-toss-gray-100 dark:border-gray-800">
                        {/* 투자의견 + 목표가 */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`px-4 py-2 rounded-xl text-[14px] font-black ${analystView.consensus === '매수' ? 'bg-red-50 dark:bg-red-900/20 text-red-500'
                                : analystView.consensus === '매도' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                }`}>
                                {analystView.consensus}
                            </div>
                            <div className="flex-1">
                                <p className="text-[11px] text-toss-gray-500 dark:text-gray-500">목표주가</p>
                                <p className="text-[16px] font-bold text-toss-gray-800 dark:text-white">{analystView.targetPrice}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[11px] text-toss-gray-500 dark:text-gray-500">상승여력</p>
                                <p className="text-[16px] font-bold text-red-500">{analystView.upside}</p>
                            </div>
                        </div>
                        {/* 의견 */}
                        <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-3">
                            <p className="text-[12px] font-semibold text-primary mb-1">💬 애널리스트 코멘트</p>
                            <p className="text-[13px] text-toss-gray-600 dark:text-gray-400 leading-relaxed">{analystView.comment}</p>
                        </div>
                    </div>
                </>
            )}

            {/* ── 금융지주 비교 ── */}
            {globalPeerComparison?.length > 0 && (
                <>
                    <SectionTitle icon="compare" title="4대 금융지주 주간 비교" />
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-[20px] border border-toss-gray-100 dark:border-gray-800 overflow-hidden">
                        <div className="grid grid-cols-3 bg-toss-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-toss-gray-100 dark:border-gray-800">
                            <p className="text-[11px] font-bold text-toss-gray-500 dark:text-gray-500">금융지주</p>
                            <p className="text-[11px] font-bold text-toss-gray-500 dark:text-gray-500 text-right">주간 등락</p>
                            <p className="text-[11px] font-bold text-toss-gray-500 dark:text-gray-500 text-right">비고</p>
                        </div>
                        {globalPeerComparison?.map((peer, idx) => (
                            <div key={idx} className={`grid grid-cols-3 px-4 py-3 items-center ${idx < globalPeerComparison.length - 1 ? 'border-b border-toss-gray-50 dark:border-gray-800/50' : ''}`}>
                                <p className="text-[13px] font-semibold text-toss-gray-800 dark:text-white">{peer.name}</p>
                                <p className={`text-[13px] font-bold text-right ${peer.isUp ? 'text-red-500' : 'text-blue-500'}`}>
                                    {peer.isUp ? '▲' : '▼'} {peer.change?.replace(/[+-]/, '')}
                                </p>
                                <p className="text-[11px] text-toss-gray-500 dark:text-gray-500 text-right truncate">{peer.note}</p>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* ── 리스크 요인 ── */}
            {riskFactors?.length > 0 && (
                <>
                    <SectionTitle icon="warning" title="주요 리스크 요인" />
                    <div className="space-y-2">
                        {riskFactors?.map((risk, idx) => {
                            const lvl = RISK_LEVEL_CONFIG[risk.level] || RISK_LEVEL_CONFIG.medium;
                            return (
                                <div key={idx} className="bg-white dark:bg-[#1a1a1a] rounded-[16px] p-4 border border-toss-gray-100 dark:border-gray-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[13px] font-bold text-toss-gray-800 dark:text-white">{risk.factor}</p>
                                        <span className={`text-[11px] font-bold ${lvl.text}`}>리스크 {lvl.label}</span>
                                    </div>
                                    <p className="text-[12px] text-toss-gray-500 dark:text-gray-500 mb-2">{risk.description}</p>
                                    <div className="h-1.5 bg-toss-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${lvl.bar}`} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* ── 다음 주 전망 ── */}
            {nextWeek && (
                <>
                    <SectionTitle icon="calendar_month" title="다음 주 주요 일정 및 전망" />
                    <div className="bg-toss-gray-50 dark:bg-gray-900/50 rounded-[20px] p-5 border border-toss-gray-100 dark:border-gray-800">
                        <p className="text-[14px] text-toss-gray-700 dark:text-gray-300 leading-relaxed mb-4">{nextWeek.preview}</p>
                        <div className="space-y-2">
                            {nextWeek.events?.map((evt, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="text-[11px] font-bold text-[#0046FF] bg-[#0046FF]/10 px-2 py-1 rounded-lg shrink-0 min-w-[70px] text-center">
                                        {evt.date} ({evt.day})
                                    </span>
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
// 공유 관련 컴포넌트 & 유틸
// ══════════════════════════════════════════════════

// ── 리포트 텍스트 요약 생성 ──
function buildShareText(report, tabLabel) {
    if (!report) return '';
    const lines = [];
    lines.push(`📊 ${report.title || tabLabel}`);
    lines.push('');
    if (report.summary) {
        lines.push(`📌 ${report.summary.title || ''}`);
        lines.push(report.summary.body || '');
        lines.push('');
    }
    // 카드 리포트
    if (report.rankings) {
        lines.push('🔥 주간 인기 카드 TOP 3');
        report.rankings.forEach(r => lines.push(`  ${r.rank}. ${r.title} — ${r.highlight || ''}`));
        lines.push('');
    }
    // AI 동향
    if (report.topNews) {
        lines.push('⚡ AI 핵심 뉴스');
        report.topNews.forEach(n => lines.push(`  ${n.rank}. ${n.title} (${n.company})`));
        lines.push('');
    }
    // 신한 리포트
    if (report.holdingIssues) {
        lines.push('🏦 신한지주 핵심 이슈');
        report.holdingIssues.forEach(i => lines.push(`  • ${i.title}`));
        lines.push('');
    }
    if (report.subsidiaryUpdates) {
        lines.push('📋 계열사 업데이트');
        report.subsidiaryUpdates.forEach(s => lines.push(`  • ${s.company}: ${s.headline}`));
        lines.push('');
    }
    lines.push(`📅 ${getMonthDay()} 생성 · AI Generated Report`);
    return lines.join('\n');
}

// ── 토스트 컴포넌트 ──
function Toast({ message, icon, visible }) {
    return (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}>
            <div className="bg-toss-gray-800 dark:bg-white text-white dark:text-toss-gray-800 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-[14px] font-semibold">
                <span className="material-symbols-outlined text-[18px]">{icon || 'check_circle'}</span>
                {message}
            </div>
        </div>
    );
}

// ── 공유 패널 컴포넌트 ──
function SharePanel({ visible, onClose, onCopyText, onEmail, onSaveImage, onNativeShare, canNativeShare }) {
    return (
        <>
            {/* 오버레이 */}
            <div
                className={`fixed inset-0 bg-black/40 z-[90] transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />
            {/* 패널 */}
            <div className={`fixed bottom-0 left-0 right-0 z-[95] transition-transform duration-300 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'
                }`}>
                <div className="bg-white dark:bg-[#1a1a1a] rounded-t-[28px] px-6 pt-4 pb-8 shadow-2xl max-w-lg mx-auto">
                    {/* 핸들 바 */}
                    <div className="w-10 h-1 bg-toss-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />
                    <h3 className="text-[17px] font-bold text-toss-gray-800 dark:text-white mb-5">리포트 공유하기</h3>

                    <div className={`grid ${canNativeShare ? 'grid-cols-4' : 'grid-cols-3'} gap-3`}>
                        {/* 텍스트 복사 */}
                        <button
                            onClick={onCopyText}
                            className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-toss-gray-50 dark:bg-gray-900 hover:bg-toss-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all border border-toss-gray-100 dark:border-gray-800"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-400/20">
                                <span className="material-symbols-outlined text-white text-[22px]">content_copy</span>
                            </div>
                            <span className="text-[12px] font-semibold text-toss-gray-700 dark:text-gray-300">텍스트 복사</span>
                        </button>

                        {/* 이메일 */}
                        <button
                            onClick={onEmail}
                            className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-toss-gray-50 dark:bg-gray-900 hover:bg-toss-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all border border-toss-gray-100 dark:border-gray-800"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-400/20">
                                <span className="material-symbols-outlined text-white text-[22px]">mail</span>
                            </div>
                            <span className="text-[12px] font-semibold text-toss-gray-700 dark:text-gray-300">이메일</span>
                        </button>

                        {/* 이미지 저장 */}
                        <button
                            onClick={onSaveImage}
                            className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-toss-gray-50 dark:bg-gray-900 hover:bg-toss-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all border border-toss-gray-100 dark:border-gray-800"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-400/20">
                                <span className="material-symbols-outlined text-white text-[22px]">image</span>
                            </div>
                            <span className="text-[12px] font-semibold text-toss-gray-700 dark:text-gray-300">이미지 저장</span>
                        </button>

                        {/* 네이티브 공유 (지원 시에만) */}
                        {canNativeShare && (
                            <button
                                onClick={onNativeShare}
                                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-toss-gray-50 dark:bg-gray-900 hover:bg-toss-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all border border-toss-gray-100 dark:border-gray-800"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center shadow-lg shadow-purple-400/20">
                                    <span className="material-symbols-outlined text-white text-[22px]">share</span>
                                </div>
                                <span className="text-[12px] font-semibold text-toss-gray-700 dark:text-gray-300">공유하기</span>
                            </button>
                        )}
                    </div>

                    {/* 닫기 */}
                    <button
                        onClick={onClose}
                        className="w-full mt-4 py-3.5 rounded-2xl bg-toss-gray-100 dark:bg-gray-800 text-[14px] font-semibold text-toss-gray-600 dark:text-gray-400 hover:bg-toss-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] transition-all"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </>
    );
}

// ══════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════

export default function AIWeeklyReport() {
    const [activeTab, setActiveTab] = useState('shinhan');
    const [reports, setReports] = useState({ card: null, ai: null, shinhan: null });
    const [generating, setGenerating] = useState({ card: false, ai: false, shinhan: false });
    const [progress, setProgress] = useState({ card: 0, ai: 0, shinhan: 0 });

    // ── 공유 관련 state ──
    const [showSharePanel, setShowSharePanel] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: '', icon: '' });
    const reportRef = useRef(null);
    const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

    const showToast = useCallback((message, icon = 'check_circle') => {
        setToast({ visible: true, message, icon });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
    }, []);

    // ── 공유 핸들러 ──
    const handleCopyText = useCallback(() => {
        const currentTab = REPORT_TABS.find(t => t.id === activeTab);
        const text = buildShareText(reports[activeTab], currentTab?.label || '');
        navigator.clipboard.writeText(text).then(() => {
            showToast('리포트가 클립보드에 복사되었습니다');
            setShowSharePanel(false);
        }).catch(() => {
            showToast('복사에 실패했습니다', 'error');
        });
    }, [activeTab, reports, showToast]);

    const handleEmailShare = useCallback(() => {
        const currentTab = REPORT_TABS.find(t => t.id === activeTab);
        const report = reports[activeTab];
        const subject = encodeURIComponent(report?.title || `${getWeekLabel()} ${currentTab?.label}`);
        const body = encodeURIComponent(buildShareText(report, currentTab?.label || ''));
        window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
        setShowSharePanel(false);
    }, [activeTab, reports]);

    const handleSaveImage = useCallback(async () => {
        if (!reportRef.current) return;
        setShowSharePanel(false);
        showToast('이미지 생성 중...', 'hourglass_top');
        try {
            const canvas = await html2canvas(reportRef.current, {
                backgroundColor: document.documentElement.classList.contains('dark') ? '#111111' : '#f9fafb',
                scale: 2,
                useCORS: true,
                logging: false,
            });
            const link = document.createElement('a');
            const currentTab = REPORT_TABS.find(t => t.id === activeTab);
            link.download = `${getWeekLabel()}_${currentTab?.label || 'report'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast('이미지가 저장되었습니다', 'download_done');
        } catch (e) {
            console.error('Image save error:', e);
            showToast('이미지 저장에 실패했습니다', 'error');
        }
    }, [activeTab, showToast]);

    const handleNativeShare = useCallback(async () => {
        const currentTab = REPORT_TABS.find(t => t.id === activeTab);
        const report = reports[activeTab];
        try {
            await navigator.share({
                title: report?.title || `${getWeekLabel()} ${currentTab?.label}`,
                text: buildShareText(report, currentTab?.label || ''),
            });
            setShowSharePanel(false);
        } catch (e) {
            if (e.name !== 'AbortError') {
                showToast('공유에 실패했습니다', 'error');
            }
        }
    }, [activeTab, reports, showToast]);

    // 초기 로드 — 캐시에서 가져오기
    useEffect(() => {
        setReports({
            card: loadCache('card'),
            ai: loadCache('ai'),
            shinhan: loadCache('shinhan'),
        });
    }, []);

    // 리포트 생성
    const generateReport = useCallback(async (type) => {
        if (generating[type] || hasTodayCache(type)) return;

        setGenerating(prev => ({ ...prev, [type]: true }));
        setProgress(prev => ({ ...prev, [type]: 0 }));

        const progressInterval = setInterval(() => {
            setProgress(prev => {
                const current = prev[type];
                if (current >= 90) return prev;
                return { ...prev, [type]: Math.min(90, current + Math.random() * 15 + 5) };
            });
        }, 800);

        try {
            let prompt;
            switch (type) {
                case 'card': prompt = buildCardReportPrompt(); break;
                case 'ai': prompt = buildAITrendReportPrompt(); break;
                case 'shinhan': prompt = buildShinhanReportPrompt(); break;
                default: return;
            }

            const raw = await enqueueGeminiRequest(() =>
                geminiRequest(prompt, { useSearch: true })
            );

            const parsed = extractJSON(raw);
            saveCache(type, parsed);

            setProgress(prev => ({ ...prev, [type]: 100 }));

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
        <div className="flex-1 flex flex-col overflow-hidden h-full">

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
            <div className="px-5 pt-3 pb-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">{currentTab?.icon}</span>
                    <p className="text-[13px] text-toss-gray-600 dark:text-gray-400">
                        {getWeekLabel()} · {hasToday ? '오늘 생성 완료' : '미생성'}
                    </p>
                </div>
                <p className="text-[11px] text-toss-gray-400 dark:text-gray-600">{getMonthDay()}</p>
            </div>

            {/* 콘텐츠 영역 */}
            <div className="flex-1 overflow-y-auto h-full px-5 pb-32">

                {/* 생성 중 */}
                {isGenerating && (
                    <div className="mt-4">
                        <div className="bg-white dark:bg-[#1a1a1a] rounded-[24px] p-6 border border-toss-gray-100 dark:border-gray-800 text-center">
                            <div className="w-12 h-12 mx-auto mb-4 relative">
                                <div className="w-12 h-12 border-3 border-primary/20 rounded-full" />
                                <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin absolute inset-0" />
                                <span className="material-symbols-outlined text-primary text-[20px] absolute inset-0 flex items-center justify-center">
                                    {currentTab?.icon}
                                </span>
                            </div>
                            <h3 className="text-[16px] font-bold text-toss-gray-800 dark:text-white mb-1">
                                AI가 리포트를 생성 중입니다
                            </h3>
                            <p className="text-[12px] text-toss-gray-500 dark:text-gray-400 mb-4">
                                Google Search + Gemini AI 분석...
                            </p>
                            <div className="w-full bg-toss-gray-100 dark:bg-gray-800 rounded-full h-2 mb-3 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-700 ease-out"
                                    style={{ width: `${currentProgress}%` }}
                                />
                            </div>
                            <p className="text-[12px] text-toss-gray-400 dark:text-gray-600">
                                {currentProgress < 30 ? '데이터 수집 중...' :
                                    currentProgress < 60 ? '정보 분석 중...' :
                                        currentProgress < 90 ? '리포트 작성 중...' : '마무리 중...'}
                            </p>
                        </div>
                    </div>
                )}

                {/* 리포트 없음 → 생성 버튼 */}
                {!isGenerating && !currentReport && (
                    <div className="mt-4">
                        <div className="bg-white dark:bg-[#1a1a1a] rounded-[24px] p-6 border border-toss-gray-100 dark:border-gray-800 text-center">
                            <span className="text-4xl block mb-3">{currentTab?.emoji}</span>
                            <h3 className="text-[17px] font-bold text-toss-gray-800 dark:text-white mb-2">
                                {currentTab?.label}
                            </h3>
                            <p className="text-[13px] text-toss-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
                                {activeTab === 'card' && 'AI가 이번 주 카드 트렌드와 최적 조합을 분석합니다.'}
                                {activeTab === 'ai' && 'AI가 이번 주 글로벌 AI 산업 핵심 동향을 분석합니다.'}
                                {activeTab === 'shinhan' && '신한금융그룹 지주사 이슈부터 계열사별 위클리 동향까지 AI가 분석합니다.'}
                            </p>
                            <button
                                onClick={() => generateReport(activeTab)}
                                className="w-full bg-primary text-white py-[14px] rounded-[16px] font-bold text-[15px] shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                                AI 리포트 생성하기
                            </button>
                            <p className="text-[10px] text-toss-gray-400 dark:text-gray-600 mt-3">
                                최신 데이터 기반 하루 한 번 생성 가능
                            </p>
                        </div>
                    </div>
                )}

                {/* 리포트 있음 → 렌더링 */}
                {!isGenerating && currentReport && (
                    <div className="mt-4" ref={reportRef}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-[18px] font-bold text-toss-gray-800 dark:text-white">
                                {currentReport.title || `${getWeekLabel()} ${currentTab?.label}`}
                            </h2>
                            <button
                                onClick={() => setShowSharePanel(true)}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 active:scale-95 transition-all"
                            >
                                <span className="material-symbols-outlined text-primary text-[18px]">ios_share</span>
                                <span className="text-[12px] font-bold text-primary">공유</span>
                            </button>
                        </div>

                        {activeTab === 'card' && <CardReportView data={currentReport} />}
                        {activeTab === 'ai' && <AITrendReportView data={currentReport} />}
                        {activeTab === 'shinhan' && <ShinhanReportView data={currentReport} />}

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

            {/* 공유 패널 */}
            <SharePanel
                visible={showSharePanel}
                onClose={() => setShowSharePanel(false)}
                onCopyText={handleCopyText}
                onEmail={handleEmailShare}
                onSaveImage={handleSaveImage}
                onNativeShare={handleNativeShare}
                canNativeShare={canNativeShare}
            />

            {/* 토스트 */}
            <Toast message={toast.message} icon={toast.icon} visible={toast.visible} />
        </div>
    );
}
