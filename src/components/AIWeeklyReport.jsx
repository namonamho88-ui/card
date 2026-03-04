import React, { useState, useEffect, useCallback, useRef } from 'react';
import { geminiRequest, extractJSON, enqueueGeminiRequest } from '../utils/geminiUtils';
import cardData from '../data/popularCards.json';
import insightData from '../data/aiInsights.json'; // ✅ 신규 추가
import { toPng } from 'html-to-image';

const { cards: POPULAR_CARDS } = cardData;
const { FINANCIAL_INSIGHTS } = insightData; // ✅ 파일에서 1000개 가져옴

// ── 날짜 유틸 ──
function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getWeekLabel() {
    const now = new Date();
    return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${Math.ceil(now.getDate() / 7)}주차`;
}
function getMonthDay() {
    const now = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${days[now.getDay()]}요일`;
}

// ── 캐시 ──
const CACHE_PREFIX = 'ai_weekly_report';
function getCacheKey(type) { return `${CACHE_PREFIX}_${type}_${getTodayKey()}`; }
function hasTodayCache(type) {
    try { const p = JSON.parse(localStorage.getItem(getCacheKey(type))); return !!(p?.data); } catch { return false; }
}
function loadCache(type) {
    try { return JSON.parse(localStorage.getItem(getCacheKey(type)))?.data || null; } catch { return null; }
}
function saveCache(type, data) {
    try { localStorage.setItem(getCacheKey(type), JSON.stringify({ data, timestamp: Date.now() })); }
    catch (e) { console.warn('Cache save failed:', e.message); }
}

// ══════════════════════════════════════════════════
// ✅ 탭 정의 — competitor 추가
// ══════════════════════════════════════════════════
const REPORT_TABS = [
    { id: 'shinhan', label: '신한 리포트', icon: 'account_balance', emoji: '🏦' },
    { id: 'competitor', label: '경쟁 인텔리전스', icon: 'radar', emoji: '🏆' }, // ✅ 신규
    { id: 'ai', label: 'AI 동향', icon: 'psychology', emoji: '🤖' },
    { id: 'card', label: '카드 리포트', icon: 'credit_card', emoji: '💳' },
];

// 💡 금융 및 카드 인사이트 카드 데이터 (JSON 파일에서 가져오므로 여기서는 삭제)
// ──────────────────────────────────────────

const REPORT_LOADING_STEPS = {
    shinhan: ["신한지주 실시간 주가 및 거래량 분석 중...", "금융위원회 및 금감원 공시 자료 확인 중...", "신한은행/카드/증권 계열사별 뉴스 필터링 중...", "주요 재무 지표(NIM, ROE) 계산 및 예측 중...", "마켓 애널리스트 의견 종합 및 리포트 구성 중..."],
    competitor: ["KB·하나·우리 금융 주가 데이터 수집 중...", "3대 금융지주 경쟁 이슈 분석 중...", "경쟁사별 신상품 및 마케팅 행보 추적 중...", "신한금융 대비 영역별 우위/열위 분석 중...", "전략적 시사점 도출 및 대응 가이드 작성 중..."],
    ai: ["글로벌 빅테크(OpenAI, Google, MS) 동향 수집 중...", "주요 AI 논문 및 기술 트렌드 키워드 추출 중...", "국내 AI 스타트업 및 대기업 관련 소식 필터링 중...", "AI 기업별 투자 유치 및 실적 임팩트 계산 중...", "산업 전반의 인사이트 요약 및 다음 주 전망 작성 중..."],
    card: ["인기 신용카드 혜택 명세서 실시간 비교 중...", "사용자 소비 패턴 기반 카드 콤보 시뮬레이션 중...", "주요 카드사 월간 이벤트 및 혜택 한도 분석 중...", "주간 MZ세대 인기 카드 순위 집계 중...", "최종 추천 조합 및 절약 금액 산정 중..."]
};

// ══════════════════════════════════════════════════
// 프롬프트 함수들
// ══════════════════════════════════════════════════

function buildCardReportPrompt(today) {
    const cardsText = POPULAR_CARDS.map(c =>
        `${c.issuer} ${c.name}(연회비:${c.annualFee}/실적:${c.previousMonthSpending}):${c.benefits.join(',')}`
    ).join('\n');
    const weekLabel = getWeekLabel();
    return `당신은 한국 신용카드 시장 전문 AI 애널리스트입니다.
오늘 날짜(${today}) 기준으로 "${weekLabel} AI 카드 리포트"를 작성하세요.

## 보유 카드 데이터
${cardsText}

## 반드시 아래 JSON만 출력하세요. 다른 텍스트 없이 JSON만:
{
  "title": "${weekLabel} AI 카드 리포트",
  "summary": { "title": "이번 주 카드 시장 핵심 트렌드 제목 (20자 이내)", "body": "이번 주 카드 시장의 핵심 동향을 3~4문장으로 요약.", "mood": "positive 또는 neutral 또는 negative" },
  "rankings": [{ "rank": 1, "title": "카드명", "subtitle": "카드사", "badge": "▲5 또는 NEW 또는 →유지", "badgeType": "up 또는 down 또는 same 또는 new", "highlight": "핵심 이유 한 줄", "detail": "2~3문장 설명", "tags": ["태그1"] }],
  "events": [{ "issuer": "카드사명", "title": "이벤트 제목", "period": "~3/31", "detail": "핵심 내용 한 줄" }],
  "comboInsight": { "card1": "카드명", "card1Issuer": "카드사", "card1Benefits": ["혜택1"], "card2": "카드명", "card2Issuer": "카드사", "card2Benefits": ["혜택1"], "coveragePercent": 89, "monthlySaving": 53200, "description": "추천 이유 2문장" },
  "nextWeek": { "preview": "전망 3~4문장", "keywords": ["키워드1"] }
}
rankings는 정확히 3개, events는 6개(카드사별 1개씩).`;
}

function buildAITrendReportPrompt(today) {
    const weekLabel = getWeekLabel();
    return `당신은 AI 산업 전문 애널리스트입니다.
오늘 날짜(${today}) 기준 최신 AI 뉴스와 동향을 조사하여 "${weekLabel} AI 동향 리포트"를 작성하세요.

## 반드시 아래 JSON만 출력하세요:
{
  "title": "${weekLabel} AI 동향 리포트",
  "summary": { "title": "핵심 이슈 제목 (20자 이내)", "body": "3~4문장 요약", "mood": "positive 또는 neutral 또는 negative" },
  "topNews": [{ "rank": 1, "category": "빅테크 또는 스타트업 또는 규제 또는 제품 또는 오픈소스", "title": "뉴스 제목", "company": "기업명", "date": "2026.02.28", "body": "3~4문장", "aiComment": "영향 분석 1~2문장", "impact": 10 }],
  "industryStats": [{ "label": "글로벌 AI 투자", "value": "$4.2B", "change": "▲18%" }],
  "techTrends": [{ "keyword": "#키워드", "title": "트렌드 제목", "body": "2~3문장" }],
  "koreaUpdates": [{ "company": "기업명", "update": "한 줄" }],
  "nextWeek": { "preview": "3~4문장", "events": [{ "date": "3/3", "day": "월", "event": "이벤트명" }] }
}
topNews 정확히 5개, techTrends 3개, koreaUpdates 4개. 반드시 최신 실제 뉴스 기반.`;
}

function buildShinhanReportPrompt(today) {
    const weekLabel = getWeekLabel();
    return `당신은 신한금융그룹 전문 리서치 애널리스트입니다.
반드시 구글 검색(Google Search)을 사용하여 **신한지주(055550)**의 가장 최근 거래일(기준일: ${today}) 종가와 주간 등락률, 시가총액, 주요 재무 지표(NIM, ROE 등)를 확인하여 리포트를 작성하세요.

## 반드시 아래 JSON만 출력하세요 (다른 텍스트 없이):
{
  "title": "${weekLabel} 신한금융그룹 위클리 리포트",
  "summary": { 
    "title": "이슈 제목 (20자 이내)", 
    "body": "3~4문장 요약", 
    "mood": "positive/neutral/negative", 
    "stockPrice": "검색된 실제 현재가 (예: 56,200원)", 
    "stockChange": "검색된 실제 등락률 (예: +1.5%)", 
    "stockIsUp": true 
  },
  "holdingIssues": [{ "category": "배당/IR/ESG/지배구조/실적/인사", "title": "이슈 제목", "body": "2~3문장", "importance": "high/medium/low" }],
  "subsidiaryUpdates": [
    { "company": "신한은행", "icon": "account_balance", "color": "blue", "headline": "헤드라인", "details": ["이슈1"], "sentiment": "positive" },
    { "company": "신한카드", "icon": "credit_card", "color": "red", "headline": "헤드라인", "details": ["이슈1"], "sentiment": "neutral" },
    { "company": "신한투자증권", "icon": "show_chart", "color": "green", "headline": "헤드라인", "details": ["이 이슈1"], "sentiment": "positive" },
    { "company": "신한라이프", "icon": "favorite", "color": "pink", "headline": "헤드라인", "details": ["이슈1"], "sentiment": "neutral" },
    { "company": "신한캐피탈", "icon": "directions_car", "color": "orange", "headline": "헤드라인", "details": ["이슈1"], "sentiment": "positive" }
  ],
  "keyMetrics": [
    { "label": "신한지주 시가총액", "value": "검색된 실제 값", "change": "검색된 실제 등락" },
    { "label": "신한은행 NIM", "value": "검색된 최신 수치", "change": "변동폭" },
    { "label": "그룹 ROE", "value": "검색된 최신 수치", "change": "변동폭" }
  ],
  "analystView": { 
    "consensus": "매수/중립/매도", 
    "targetPrice": "최신 목표주가", 
    "currentPrice": "현재가", 
    "upside": "상승여력", 
    "comment": "애널리스트 의견 2~3문장" 
  },
  "globalPeerComparison": [
    { "name": "KB금융", "change": "검색된 실제 등락", "isUp": true, "note": "코멘트" },
    { "name": "하나금융", "change": "검색된 실제 등락", "isUp": true, "note": "코멘트" },
    { "name": "우리금융", "change": "검색된 실제 등락", "isUp": false, "note": "코멘트" }
  ],
  "riskFactors": [{ "factor": "리스크 항목", "description": "설명", "level": "high/medium/low" }],
  "nextWeek": { "preview": "전망", "events": [{ "date": "일자", "day": "요일", "event": "내용" }] }
}`;
}

// ✅ 경쟁 인텔리전스 프롬프트 — KB, 하나, 우리 3사로 축소
function buildCompetitorReportPrompt(today) {
    const weekLabel = getWeekLabel();
    return `당신은 한국 금융권 경쟁 분석 전문 AI 애널리스트입니다.
반드시 구글 검색(Google Search)을 사용하여 다음 티커들의 가장 최근 거래일(기준일: ${today}) 종가와 주간 변동률, PBR, PER를 정확히 확인하여 리포트를 작성하세요:
- 신한지주 (055550)
- KB금융 (105560)
- 하나금융 (086790)
- 우리금융 (316140)

## 반드시 아래 JSON만 출력하세요:
{
  "title": "${weekLabel} 금융권 경쟁 인텔리전스 리포트",
  "summary": {
    "title": "경쟁 구도 핵심 (20자 이내)",
    "body": "이번 주 경쟁 요약 3~4문장",
    "hotGroup": "가장 공격적인 금융사",
    "hotReason": "이유 한 줄",
    "mood": "positive/neutral/negative"
  },
  "stockComparison": [
    { "name": "신한지주", "ticker": "055550", "price": "검색된 실제 현재가", "weekChange": "검색된 실제 변동률", "isUp": true, "per": "검색된 실제 PER", "pbr": "검색된 실제 PBR", "isOurGroup": true },
    { "name": "KB금융", "ticker": "105560", "price": "검색된 실제 현재가", "weekChange": "검색된 실제 변동률", "isUp": true, "per": "실제 PER", "pbr": "실제 PBR", "isOurGroup": false },
    { "name": "하나금융", "ticker": "086790", "price": "실제", "weekChange": "실제", "isUp": true, "per": "실제", "pbr": "실제", "isOurGroup": false },
    { "name": "우리금융", "ticker": "316140", "price": "실제", "weekChange": "실제", "isUp": false, "per": "실제", "pbr": "실제", "isOurGroup": false }
  ],
  "competitorMoves": [
    { "group": "KB금융", "category": "카테고리", "title": "이슈 제목", "body": "2~3문장", "threatLevel": "high/medium/low", "ourAction": "신한 대응 방안" },
    { "group": "하나금융", "category": "카테고리", "title": "이슈 제목", "body": "2~3문장", "threatLevel": "high/medium/low", "ourAction": "신한 대응 방안" },
    { "group": "우리금융", "category": "카테고리", "title": "이슈 제목", "body": "2~3문장", "threatLevel": "high/medium/low", "ourAction": "신한 대응 방안" }
  ],
  "productBattle": [
    { "domain": "수신", "leader": "리드사", "leaderProduct": "상품명", "leaderRate": "금리", "shinhanProduct": "신한 상품", "shinhanRate": "신한 금리", "shinhanStatus": "우위/동등/열위", "comment": "코멘트" },
    { "domain": "대출", "leader": "리드사", "leaderProduct": "상품명", "leaderRate": "금리", "shinhanProduct": "신한 상품", "shinhanRate": "신한 금리", "shinhanStatus": "우위/동등/열위", "comment": "코멘트" }
  ],
  "industryTopics": [{ "topic": "주제", "body": "내용", "affectedGroups": ["신한", "KB"], "shinhanImpact": "영향" }],
  "swotSignals": { "opportunities": ["기회"], "threats": ["위협"] },
  "weeklyVerdict": { "winner": "금융사", "winnerReason": "이유", "shinhanScore": 75, "shinhanComment": "평가", "nextFocus": "전략" },
  "nextWeek": { "preview": "전망", "watchList": [{ "group": "사명", "watchPoint": "관전포인트" }] }
}`;
}

// ══════════════════════════════════════════════════
// 공유 텍스트 빌더 — competitor 섹션 추가
// ══════════════════════════════════════════════════
function buildShareText(report, tabLabel) {
    if (!report) return '';
    const lines = [];
    lines.push(`📊 ${report.title || tabLabel}`);
    lines.push('');

    if (report.summary) {
        lines.push(`📌 ${report.summary.title || ''}`);
        lines.push(report.summary.body || '');
        if (report.summary.stockPrice) lines.push(`💹 신한지주: ${report.summary.stockPrice} (${report.summary.stockChange || ''})`);
        if (report.summary.hotGroup) lines.push(`🔥 이번 주 HOT: ${report.summary.hotGroup} — ${report.summary.hotReason || ''}`);
        lines.push('');
    }

    // 카드
    if (report.rankings) {
        lines.push('🔥 주간 인기 카드 TOP 3');
        report.rankings.forEach(r => {
            lines.push(`  ${r.rank}. ${r.title} (${r.subtitle || ''})`);
            if (r.highlight) lines.push(`     📌 ${r.highlight}`);
        });
        lines.push('');
    }
    if (report.events) {
        lines.push('🎉 카드사별 핫 이벤트');
        report.events.forEach(e => lines.push(`  • [${e.issuer}] ${e.title} (${e.period || ''})`));
        lines.push('');
    }
    if (report.comboInsight) {
        lines.push('💡 AI 추천 카드 조합');
        lines.push(`  ${report.comboInsight.card1} + ${report.comboInsight.card2}`);
        lines.push(`  커버리지 ${report.comboInsight.coveragePercent}% · 월 절약 ₩${(report.comboInsight.monthlySaving || 0).toLocaleString()}`);
        lines.push('');
    }

    // AI 동향
    if (report.topNews) {
        lines.push('⚡ AI 핵심 뉴스');
        report.topNews.forEach(n => {
            lines.push(`  ${n.rank}. ${n.title} (${n.company})`);
            if (n.aiComment) lines.push(`     💬 ${n.aiComment}`);
        });
        lines.push('');
    }
    if (report.techTrends) {
        lines.push('🔬 AI 기술 트렌드');
        report.techTrends.forEach(t => lines.push(`  • [${t.keyword}] ${t.title}`));
        lines.push('');
    }

    // 신한
    if (report.keyMetrics) {
        lines.push('📈 주요 그룹 지표');
        report.keyMetrics.forEach(m => lines.push(`  • ${m.label}: ${m.value} (${m.change || ''})`));
        lines.push('');
    }
    if (report.holdingIssues) {
        lines.push('🏦 신한지주 핵심 이슈');
        report.holdingIssues.forEach(i => lines.push(`  • [${i.category}] ${i.title}`));
        lines.push('');
    }
    if (report.subsidiaryUpdates) {
        lines.push('📋 계열사 업데이트');
        report.subsidiaryUpdates.forEach(s => lines.push(`  • ${s.company}: ${s.headline}`));
        lines.push('');
    }
    if (report.analystView) {
        const av = report.analystView;
        lines.push(`🔍 컨센서스: ${av.consensus} · 목표가 ${av.targetPrice} · 상승여력 ${av.upside}`);
        lines.push('');
    }

    // ✅ 경쟁 인텔리전스
    if (report.competitorMoves) {
        lines.push('🎯 경쟁사 핵심 무브');
        report.competitorMoves.forEach(m => {
            lines.push(`  • [${m.group}] ${m.title}`);
            lines.push(`    → 신한 대응: ${m.ourAction}`);
        });
        lines.push('');
    }
    if (report.productBattle) {
        lines.push('⚔️ 영역별 경쟁 현황');
        report.productBattle.forEach(b => lines.push(`  • ${b.domain}: 신한 ${b.shinhanStatus} (리더: ${b.leader})`));
        lines.push('');
    }
    if (report.weeklyVerdict) {
        lines.push(`🏆 이번 주 Winner: ${report.weeklyVerdict.winner}`);
        lines.push(`🏦 신한 경쟁력 점수: ${report.weeklyVerdict.shinhanScore}/100`);
        lines.push(`🎯 다음 주 전략: ${report.weeklyVerdict.nextFocus}`);
        lines.push('');
    }

    if (report.nextWeek) {
        lines.push('📅 다음 주 전망');
        if (report.nextWeek.preview) lines.push(`  ${report.nextWeek.preview}`);
        report.nextWeek.events?.forEach(e => lines.push(`  • ${e.date}(${e.day}) ${e.event}`));
        report.nextWeek.watchList?.forEach(w => lines.push(`  👀 ${w.group}: ${w.watchPoint}`));
        report.nextWeek.keywords?.forEach(k => lines.push(`  #${k}`));
        lines.push('');
    }

    lines.push(`📅 ${getMonthDay()} 생성 · AI Generated Report`);
    return lines.join('\n');
}

// ══════════════════════════════════════════════════
// 공통 UI 컴포넌트
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
    return <span className={`${c.bg} ${c.text} text-[11px] font-bold px-2 py-1 rounded-lg`}>{c.label}</span>;
}

function Toast({ message, icon, visible }) {
    return (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            <div className="bg-toss-gray-800 dark:bg-white text-white dark:text-toss-gray-800 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-[14px] font-semibold">
                <span className="material-symbols-outlined text-[18px]">{icon || 'check_circle'}</span>
                {message}
            </div>
        </div>
    );
}

function SharePanel({ visible, onClose, onCopyText, onEmail, onSaveImage, onNativeShare, canNativeShare }) {
    return (
        <>
            <div className={`fixed inset-0 bg-black/40 z-[90] transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
            <div className={`fixed bottom-0 left-0 right-0 z-[95] transition-transform duration-300 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="bg-white dark:bg-[#1a1a1a] rounded-t-[28px] px-6 pt-4 pb-8 shadow-2xl max-w-lg mx-auto">
                    <div className="w-10 h-1 bg-toss-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />
                    <h3 className="text-[17px] font-bold text-toss-gray-800 dark:text-white mb-5">리포트 공유하기</h3>
                    <div className={`grid ${canNativeShare ? 'grid-cols-4' : 'grid-cols-3'} gap-3`}>
                        <button onClick={onCopyText} className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-toss-gray-50 dark:bg-gray-900 hover:bg-toss-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all border border-toss-gray-100 dark:border-gray-800">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-400/20">
                                <span className="material-symbols-outlined text-white text-[22px]">content_copy</span>
                            </div>
                            <span className="text-[12px] font-semibold text-toss-gray-700 dark:text-gray-300">텍스트 복사</span>
                        </button>
                        <button onClick={onEmail} className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-toss-gray-50 dark:bg-gray-900 hover:bg-toss-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all border border-toss-gray-100 dark:border-gray-800">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-400/20">
                                <span className="material-symbols-outlined text-white text-[22px]">mail</span>
                            </div>
                            <span className="text-[12px] font-semibold text-toss-gray-700 dark:text-gray-300">이메일</span>
                        </button>
                        <button onClick={onSaveImage} className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-toss-gray-50 dark:bg-gray-900 hover:bg-toss-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all border border-toss-gray-100 dark:border-gray-800">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-400/20">
                                <span className="material-symbols-outlined text-white text-[22px]">image</span>
                            </div>
                            <span className="text-[12px] font-semibold text-toss-gray-700 dark:text-gray-300">이미지 저장</span>
                        </button>
                        {canNativeShare && (
                            <button onClick={onNativeShare} className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-toss-gray-50 dark:bg-gray-900 hover:bg-toss-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all border border-toss-gray-100 dark:border-gray-800">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center shadow-lg shadow-purple-400/20">
                                    <span className="material-symbols-outlined text-white text-[22px]">share</span>
                                </div>
                                <span className="text-[12px] font-semibold text-toss-gray-700 dark:text-gray-300">공유하기</span>
                            </button>
                        )}
                    </div>
                    <button onClick={onClose} className="w-full mt-4 py-3.5 rounded-2xl bg-toss-gray-100 dark:bg-gray-800 text-[14px] font-semibold text-toss-gray-600 dark:text-gray-400 hover:bg-toss-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] transition-all">
                        닫기
                    </button>
                </div>
            </div>
        </>
    );
}

// ══════════════════════════════════════════════════
// 리포트 렌더 컴포넌트들
// ══════════════════════════════════════════════════

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
                            <span className={`text-[12px] font-bold px-2 py-1 rounded-lg ${item.badgeType === 'up' ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : item.badgeType === 'new' ? 'bg-primary/10 text-primary' : item.badgeType === 'down' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{item.badge}</span>
                        </div>
                        <div className="bg-toss-gray-50 dark:bg-gray-900/50 rounded-2xl p-3 mb-3">
                            <p className="text-[13px] font-semibold text-primary">📌 {item.highlight}</p>
                        </div>
                        <p className="text-[13px] text-toss-gray-600 dark:text-gray-400 leading-relaxed">{item.detail}</p>
                        <div className="flex gap-1.5 mt-3 flex-wrap">
                            {item.tags?.map((tag, i) => <span key={i} className="text-[10px] bg-toss-gray-100 dark:bg-gray-800 text-toss-gray-500 dark:text-gray-500 px-2 py-0.5 rounded-md">#{tag}</span>)}
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
                        <div className="flex items-stretch gap-3 mb-4">
                            <div className="flex-1 bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-toss-gray-100 dark:border-gray-800">
                                <p className="text-[11px] text-toss-gray-500 dark:text-gray-500 mb-1">{data.comboInsight.card1Issuer}</p>
                                <p className="text-[14px] font-bold text-toss-gray-800 dark:text-white mb-2">{data.comboInsight.card1}</p>
                                {data.comboInsight.card1Benefits?.map((b, i) => <p key={i} className="text-[12px] text-toss-gray-600 dark:text-gray-400">• {b}</p>)}
                            </div>
                            <div className="flex items-center"><span className="text-xl font-black text-orange-400">+</span></div>
                            <div className="flex-1 bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-toss-gray-100 dark:border-gray-800">
                                <p className="text-[11px] text-toss-gray-500 dark:text-gray-500 mb-1">{data.comboInsight.card2Issuer}</p>
                                <p className="text-[14px] font-bold text-toss-gray-800 dark:text-white mb-2">{data.comboInsight.card2}</p>
                                {data.comboInsight.card2Benefits?.map((b, i) => <p key={i} className="text-[12px] text-toss-gray-600 dark:text-gray-400">• {b}</p>)}
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
                            {data.nextWeek.keywords?.map((kw, i) => <span key={i} className="text-[11px] bg-primary/10 text-primary px-2.5 py-1 rounded-lg font-semibold">#{kw}</span>)}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

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
                                <div className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full" style={{ width: `${(news.impact || 5) * 10}%` }} />
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
                        <p className={`text-[12px] font-semibold ${stat.change?.includes('▲') || stat.change?.includes('+') ? 'text-red-500' : 'text-blue-500'}`}>{stat.change}</p>
                    </div>
                ))}
            </div>
            <SectionTitle icon="science" title="주목할 AI 기술 트렌드" />
            <div className="space-y-3">
                {data.techTrends?.map((trend, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#1a1a1a] rounded-[16px] p-4 border border-toss-gray-100 dark:border-gray-800">
                        <span className="text-[11px] font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg">{trend.keyword}</span>
                        <p className="text-[14px] font-bold text-toss-gray-800 dark:text-white mt-2 mb-1">{trend.title}</p>
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
                        <div className="space-y-2">
                            {data.nextWeek.events?.map((evt, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg shrink-0">{evt.date} ({evt.day})</span>
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
            <div className="bg-gradient-to-br from-[#0046FF]/5 to-blue-50 dark:from-[#0046FF]/10 dark:to-gray-900 rounded-[20px] p-5 border border-[#0046FF]/10">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-[#0046FF] rounded-xl flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-white text-[16px]">account_balance</span>
                    </div>
                    <span className="text-[13px] font-bold text-[#0046FF]">신한금융그룹</span>
                    <MoodBadge mood={summary?.mood} />
                </div>
                {summary?.stockPrice && (
                    <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-[22px] font-black text-toss-gray-800 dark:text-white">{summary.stockPrice}</span>
                        <span className={`text-[14px] font-bold ${summary.stockIsUp ? 'text-red-500' : 'text-blue-500'}`}>{summary.stockIsUp ? '▲' : '▼'} {summary.stockChange?.replace(/[+-]/, '')}</span>
                        <span className="text-[11px] text-toss-gray-400 dark:text-gray-600">신한지주 (055550)</span>
                    </div>
                )}
                <h3 className="text-[15px] font-bold text-toss-gray-800 dark:text-white mb-2">{summary?.title}</h3>
                <p className="text-[14px] text-toss-gray-600 dark:text-gray-300 leading-relaxed">{summary?.body}</p>
            </div>
            <SectionTitle icon="monitoring" title="주요 그룹 지표" />
            <div className="grid grid-cols-2 gap-3">
                {keyMetrics?.map((metric, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#1a1a1a] rounded-[16px] p-4 border border-toss-gray-100 dark:border-gray-800">
                        <p className="text-[11px] text-toss-gray-500 dark:text-gray-500 mb-1">{metric.label}</p>
                        <p className="text-[16px] font-bold text-toss-gray-800 dark:text-white">{metric.value}</p>
                        <p className={`text-[12px] font-semibold mt-0.5 ${metric.change?.includes('▲') || metric.change?.includes('+') ? 'text-red-500' : 'text-blue-500'}`}>{metric.change}</p>
                    </div>
                ))}
            </div>
            <SectionTitle icon="corporate_fare" title="신한지주 주간 핵심 이슈" />
            <div className="space-y-3">
                {holdingIssues?.map((issue, idx) => {
                    const cfg = IMPORTANCE_CONFIG[issue.importance] || IMPORTANCE_CONFIG.low;
                    return (
                        <div key={idx} className={`rounded-[16px] p-4 border ${cfg.bg}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cfg.label}`}>{cfg.text}</span>
                                <span className="text-[11px] font-semibold text-toss-gray-500 dark:text-gray-400 bg-white dark:bg-[#1a1a1a] px-2 py-0.5 rounded-md border border-toss-gray-100 dark:border-gray-700">{issue.category}</span>
                            </div>
                            <p className="text-[14px] font-bold text-toss-gray-800 dark:text-white mb-1.5">{issue.title}</p>
                            <p className="text-[13px] text-toss-gray-600 dark:text-gray-400 leading-relaxed">{issue.body}</p>
                        </div>
                    );
                })}
            </div>
            <SectionTitle icon="business" title="계열사 위클리 업데이트" />
            <div className="space-y-3">
                {subsidiaryUpdates?.map((sub, idx) => {
                    const style = SUBSIDIARY_STYLE[sub.color] || SUBSIDIARY_STYLE.blue;
                    const sentimentText = sub.sentiment === 'positive' ? '▲ 긍정' : sub.sentiment === 'negative' ? '▼ 부정' : '→ 중립';
                    const sentimentColor = sub.sentiment === 'positive' ? 'text-red-500' : sub.sentiment === 'negative' ? 'text-blue-500' : 'text-gray-500';
                    return (
                        <div key={idx} className={`rounded-[20px] p-5 border ${style.bg} ${style.border}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className={`material-symbols-outlined text-[18px] ${style.badge.split(' ').find(c => c.startsWith('text-'))}`}>{sub.icon}</span>
                                    <span className={`text-[12px] font-bold px-2.5 py-1 rounded-lg ${style.badge}`}>{sub.company}</span>
                                </div>
                                <span className={`text-[11px] font-bold ${sentimentColor}`}>{sentimentText}</span>
                            </div>
                            <p className="text-[14px] font-bold text-toss-gray-800 dark:text-white mb-2.5">{sub.headline}</p>
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
            {analystView && (
                <>
                    <SectionTitle icon="manage_search" title="애널리스트 컨센서스" />
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-[20px] p-5 border border-toss-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`px-4 py-2 rounded-xl text-[14px] font-black ${analystView.consensus === '매수' ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : analystView.consensus === '매도' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{analystView.consensus}</div>
                            <div className="flex-1">
                                <p className="text-[11px] text-toss-gray-500 dark:text-gray-500">목표주가</p>
                                <p className="text-[16px] font-bold text-toss-gray-800 dark:text-white">{analystView.targetPrice}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[11px] text-toss-gray-500 dark:text-gray-500">상승여력</p>
                                <p className="text-[16px] font-bold text-red-500">{analystView.upside}</p>
                            </div>
                        </div>
                        <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-3">
                            <p className="text-[12px] font-semibold text-primary mb-1">💬 애널리스트 코멘트</p>
                            <p className="text-[13px] text-toss-gray-600 dark:text-gray-400 leading-relaxed">{analystView.comment}</p>
                        </div>
                    </div>
                </>
            )}
            {globalPeerComparison?.length > 0 && (
                <>
                    <SectionTitle icon="compare" title="4대 금융지주 주간 비교" />
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-[20px] border border-toss-gray-100 dark:border-gray-800 overflow-hidden">
                        <div className="grid grid-cols-3 bg-toss-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-toss-gray-100 dark:border-gray-800">
                            <p className="text-[11px] font-bold text-toss-gray-500 dark:text-gray-500">금융지주</p>
                            <p className="text-[11px] font-bold text-toss-gray-500 dark:text-gray-500 text-right">주간 등락</p>
                            <p className="text-[11px] font-bold text-toss-gray-500 dark:text-gray-500 text-right">비고</p>
                        </div>
                        {globalPeerComparison.map((peer, idx) => (
                            <div key={idx} className={`grid grid-cols-3 px-4 py-3 items-center ${idx < globalPeerComparison.length - 1 ? 'border-b border-toss-gray-50 dark:border-gray-800/50' : ''}`}>
                                <p className="text-[13px] font-semibold text-toss-gray-800 dark:text-white">{peer.name}</p>
                                <p className={`text-[13px] font-bold text-right ${peer.isUp ? 'text-red-500' : 'text-blue-500'}`}>{peer.isUp ? '▲' : '▼'} {peer.change?.replace(/[+-]/, '')}</p>
                                <p className="text-[11px] text-toss-gray-500 dark:text-gray-500 text-right truncate">{peer.note}</p>
                            </div>
                        ))}
                    </div>
                </>
            )}
            {riskFactors?.length > 0 && (
                <>
                    <SectionTitle icon="warning" title="주요 리스크 요인" />
                    <div className="space-y-2">
                        {riskFactors.map((risk, idx) => {
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
            {nextWeek && (
                <>
                    <SectionTitle icon="calendar_month" title="다음 주 주요 일정 및 전망" />
                    <div className="bg-toss-gray-50 dark:bg-gray-900/50 rounded-[20px] p-5 border border-toss-gray-100 dark:border-gray-800">
                        <p className="text-[14px] text-toss-gray-700 dark:text-gray-300 leading-relaxed mb-4">{nextWeek.preview}</p>
                        <div className="space-y-2">
                            {nextWeek.events?.map((evt, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="text-[11px] font-bold text-[#0046FF] bg-[#0046FF]/10 px-2 py-1 rounded-lg shrink-0 min-w-[70px] text-center">{evt.date} ({evt.day})</span>
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

// ✅ 경쟁 인텔리전스 렌더 — 신규
const COMPETITOR_STYLE = {
    'KB금융': { bg: 'bg-yellow-50 dark:bg-yellow-900/10', border: 'border-yellow-200/50 dark:border-yellow-800/30', badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-400' },
    '하나금융': { bg: 'bg-emerald-50 dark:bg-emerald-900/10', border: 'border-emerald-200/50 dark:border-emerald-800/30', badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-400' },
    '우리금융': { bg: 'bg-sky-50 dark:bg-sky-900/10', border: 'border-sky-200/50 dark:border-sky-800/30', badge: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400', dot: 'bg-sky-400' },
};
const THREAT_CONFIG = {
    high: { label: '🔴 위협 높음', bg: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400', bar: 'w-full bg-red-400' },
    medium: { label: '🟡 위협 중간', bg: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400', bar: 'w-2/3 bg-yellow-400' },
    low: { label: '🟢 위협 낮음', bg: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400', bar: 'w-1/3 bg-green-400' },
};
const STATUS_CONFIG = {
    '우위': { text: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', icon: '▲', label: '우위' },
    '동등': { text: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', icon: '→', label: '동등' },
    '열위': { text: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: '▼', label: '열위' },
};

function CompetitorReportView({ data }) {
    if (!data) return null;
    const { summary, stockComparison, competitorMoves, productBattle, industryTopics, swotSignals, weeklyVerdict, nextWeek } = data;

    return (
        <div className="space-y-2">

            {/* ── 요약 + HOT 그룹 배너 ── */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-900/10 rounded-[20px] p-5 border border-orange-200/50 dark:border-orange-800/30">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🏆</span>
                    <h3 className="text-[15px] font-bold text-toss-gray-800 dark:text-white">{summary?.title}</h3>
                    <MoodBadge mood={summary?.mood} />
                </div>
                <p className="text-[14px] text-toss-gray-600 dark:text-gray-300 leading-relaxed mb-3">{summary?.body}</p>
                {summary?.hotGroup && (
                    <div className="flex items-center gap-3 bg-white dark:bg-[#1a1a1a] rounded-2xl px-4 py-3 border border-orange-200/50 dark:border-orange-800/30">
                        <span className="text-[20px]">🔥</span>
                        <div>
                            <p className="text-[11px] font-bold text-orange-500 mb-0.5">이번 주 가장 공격적인 그룹</p>
                            <p className="text-[14px] font-bold text-toss-gray-800 dark:text-white">
                                {summary.hotGroup}
                                <span className="text-[12px] font-normal text-toss-gray-500 dark:text-gray-400 ml-2">— {summary.hotReason}</span>
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── 주가 비교 테이블 ── */}
            <SectionTitle icon="table_chart" title="금융지주 주간 주가 비교" />
            <div className="bg-white dark:bg-[#1a1a1a] rounded-[20px] border border-toss-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="grid grid-cols-4 bg-toss-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-toss-gray-100 dark:border-gray-800">
                    {['그룹', '주가', '주간', 'PBR'].map((h, i) => (
                        <p key={i} className={`text-[11px] font-bold text-toss-gray-500 dark:text-gray-500 ${i > 0 ? 'text-right' : ''}`}>{h}</p>
                    ))}
                </div>
                {stockComparison?.map((stock, idx) => (
                    <div key={idx} className={`grid grid-cols-4 px-4 py-3 items-center ${stock.isOurGroup ? 'bg-primary/5 dark:bg-primary/10' : ''} ${idx < stockComparison.length - 1 ? 'border-b border-toss-gray-50 dark:border-gray-800/50' : ''}`}>
                        <div className="flex items-center gap-1.5">
                            {stock.isOurGroup && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                            <p className={`text-[13px] font-semibold truncate ${stock.isOurGroup ? 'text-primary' : 'text-toss-gray-800 dark:text-white'}`}>{stock.name}</p>
                        </div>
                        <p className="text-[13px] font-bold text-toss-gray-800 dark:text-white text-right">{stock.price}</p>
                        <p className={`text-[12px] font-bold text-right ${stock.isUp ? 'text-red-500' : 'text-blue-500'}`}>{stock.isUp ? '▲' : '▼'} {stock.weekChange?.replace(/[+-]/, '')}</p>
                        <p className="text-[12px] text-toss-gray-500 dark:text-gray-500 text-right">{stock.pbr}</p>
                    </div>
                ))}
            </div>

            {/* ── 경쟁사 핵심 무브 ── */}
            <SectionTitle icon="radar" title="경쟁사 이번 주 핵심 무브" />
            <div className="space-y-3">
                {competitorMoves?.map((move, idx) => {
                    const style = COMPETITOR_STYLE[move.group] || COMPETITOR_STYLE['KB금융'];
                    const threat = THREAT_CONFIG[move.threatLevel] || THREAT_CONFIG.medium;
                    return (
                        <div key={idx} className={`rounded-[20px] p-5 border ${style.bg} ${style.border}`}>
                            {/* 헤더 행 */}
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <span className={`text-[12px] font-black px-3 py-1 rounded-lg ${style.badge}`}>{move.group}</span>
                                <span className="text-[11px] font-semibold bg-white dark:bg-[#1a1a1a] text-toss-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-md border border-toss-gray-100 dark:border-gray-700">{move.category}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ml-auto ${threat.bg}`}>{threat.label}</span>
                            </div>
                            {/* 이슈 */}
                            <p className="text-[14px] font-bold text-toss-gray-800 dark:text-white mb-1.5">{move.title}</p>
                            <p className="text-[13px] text-toss-gray-600 dark:text-gray-400 leading-relaxed mb-3">{move.body}</p>
                            {/* 위협 바 */}
                            <div className="h-1 bg-toss-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
                                <div className={`h-full rounded-full ${threat.bar}`} />
                            </div>
                            {/* 신한 대응 */}
                            <div className="flex items-start gap-2 bg-white dark:bg-[#1a1a1a] rounded-xl p-3 border border-toss-gray-100 dark:border-gray-700">
                                <span className="text-primary text-[13px] font-black shrink-0">신한 →</span>
                                <p className="text-[12px] text-toss-gray-600 dark:text-gray-400 leading-snug">{move.ourAction}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── 영역별 상품 경쟁 ── */}
            <SectionTitle icon="compare_arrows" title="영역별 상품 경쟁 현황" />
            <div className="space-y-3">
                {productBattle?.map((battle, idx) => {
                    const status = STATUS_CONFIG[battle.shinhanStatus] || STATUS_CONFIG['동등'];
                    return (
                        <div key={idx} className="bg-white dark:bg-[#1a1a1a] rounded-[20px] p-4 border border-toss-gray-100 dark:border-gray-800">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[13px] font-bold text-toss-gray-700 dark:text-gray-300">{battle.domain}</p>
                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${status.bg} ${status.text}`}>{status.icon} 신한 {status.label}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-toss-gray-50 dark:bg-gray-900/50 rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-orange-500 mb-1">👑 리더 · {battle.leader}</p>
                                    <p className="text-[12px] font-bold text-toss-gray-800 dark:text-white truncate">{battle.leaderProduct}</p>
                                    <p className="text-[11px] text-toss-gray-500 dark:text-gray-500 mt-0.5">{battle.leaderRate}</p>
                                </div>
                                <div className={`rounded-xl p-3 border ${status.bg}`}>
                                    <p className="text-[10px] font-bold text-primary mb-1">🏦 신한</p>
                                    <p className="text-[12px] font-bold text-toss-gray-800 dark:text-white truncate">{battle.shinhanProduct}</p>
                                    <p className="text-[11px] text-toss-gray-500 dark:text-gray-500 mt-0.5">{battle.shinhanRate}</p>
                                </div>
                            </div>
                            <p className="text-[12px] text-toss-gray-500 dark:text-gray-500">{battle.comment}</p>
                        </div>
                    );
                })}
            </div>

            {/* ── 업계 공통 이슈 ── */}
            {industryTopics?.length > 0 && (
                <>
                    <SectionTitle icon="public" title="업계 공통 핵심 이슈" />
                    <div className="space-y-3">
                        {industryTopics.map((topic, idx) => (
                            <div key={idx} className="bg-white dark:bg-[#1a1a1a] rounded-[16px] p-4 border border-toss-gray-100 dark:border-gray-800">
                                <p className="text-[14px] font-bold text-toss-gray-800 dark:text-white mb-1.5">{topic.topic}</p>
                                <p className="text-[13px] text-toss-gray-600 dark:text-gray-400 leading-relaxed mb-3">{topic.body}</p>
                                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                    {topic.affectedGroups?.map((g, i) => (
                                        <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${g === '신한' ? 'bg-primary/10 text-primary' : 'bg-toss-gray-100 dark:bg-gray-800 text-toss-gray-500 dark:text-gray-500'}`}>{g}</span>
                                    ))}
                                </div>
                                <div className="bg-primary/5 dark:bg-primary/10 rounded-xl px-3 py-2">
                                    <p className="text-[12px] text-primary font-semibold">📌 신한 영향: {topic.shinhanImpact}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* ── SWOT 시그널 ── */}
            {swotSignals && (
                <>
                    <SectionTitle icon="sensors" title="신한 경쟁 포지션 시그널" />
                    <div className="space-y-3">
                        <div className="bg-red-50 dark:bg-red-900/10 rounded-[16px] p-4 border border-red-200/50 dark:border-red-800/30">
                            <p className="text-[12px] font-bold text-red-500 mb-2">🟢 기회 요인 — 신한이 선점 가능</p>
                            {swotSignals.opportunities?.map((o, i) => (
                                <p key={i} className="text-[13px] text-toss-gray-700 dark:text-gray-300 leading-relaxed">• {o}</p>
                            ))}
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-[16px] p-4 border border-blue-200/50 dark:border-blue-800/30">
                            <p className="text-[12px] font-bold text-blue-500 mb-2">🔴 위협 요인 — 대응 필요</p>
                            {swotSignals.threats?.map((t, i) => (
                                <p key={i} className="text-[13px] text-toss-gray-700 dark:text-gray-300 leading-relaxed">• {t}</p>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* ── 이번 주 경쟁 종합 평가 ── */}
            {weeklyVerdict && (
                <>
                    <SectionTitle icon="emoji_events" title="이번 주 경쟁 종합 평가" />
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 rounded-[20px] p-5 border border-yellow-200/50 dark:border-yellow-800/30">
                        {/* Winner 배너 */}
                        <div className="flex items-center gap-3 mb-4 p-3 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-yellow-200/50 dark:border-yellow-800/30">
                            <span className="text-[28px]">🏆</span>
                            <div>
                                <p className="text-[11px] font-bold text-orange-500">이번 주 Winner</p>
                                <p className="text-[17px] font-black text-toss-gray-800 dark:text-white">{weeklyVerdict.winner}</p>
                                <p className="text-[12px] text-toss-gray-500 dark:text-gray-400">{weeklyVerdict.winnerReason}</p>
                            </div>
                        </div>
                        {/* 신한 점수 */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[13px] font-bold text-toss-gray-800 dark:text-white">🏦 신한 이번 주 경쟁력 점수</p>
                                <p className="text-[22px] font-black text-primary">{weeklyVerdict.shinhanScore}<span className="text-[13px] text-toss-gray-400 font-normal">/100</span></p>
                            </div>
                            <div className="h-3 bg-toss-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${weeklyVerdict.shinhanScore >= 80 ? 'bg-gradient-to-r from-red-400 to-orange-400' : weeklyVerdict.shinhanScore >= 60 ? 'bg-gradient-to-r from-primary to-blue-400' : 'bg-gradient-to-r from-blue-400 to-indigo-400'}`}
                                    style={{ width: `${weeklyVerdict.shinhanScore}%` }}
                                />
                            </div>
                            <p className="text-[13px] text-toss-gray-600 dark:text-gray-400 leading-relaxed">{weeklyVerdict.shinhanComment}</p>
                        </div>
                        {/* 다음 주 집중 포인트 */}
                        <div className="bg-primary/10 dark:bg-primary/20 rounded-xl px-4 py-3">
                            <p className="text-[11px] font-bold text-primary mb-1">🎯 다음 주 신한 전략 포인트</p>
                            <p className="text-[13px] font-semibold text-toss-gray-800 dark:text-white">{weeklyVerdict.nextFocus}</p>
                        </div>
                    </div>
                </>
            )}

            {/* ── 다음 주 Watch List ── */}
            {nextWeek && (
                <>
                    <SectionTitle icon="calendar_month" title="다음 주 경쟁 전망" />
                    <div className="bg-toss-gray-50 dark:bg-gray-900/50 rounded-[20px] p-5 border border-toss-gray-100 dark:border-gray-800">
                        <p className="text-[14px] text-toss-gray-700 dark:text-gray-300 leading-relaxed mb-4">{nextWeek.preview}</p>
                        {nextWeek.watchList?.length > 0 && (
                            <>
                                <p className="text-[12px] font-bold text-toss-gray-500 dark:text-gray-500 mb-2">👀 Watch List</p>
                                <div className="space-y-2">
                                    {nextWeek.watchList.map((w, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <span className={`text-[11px] font-bold px-2 py-1 rounded-lg shrink-0 ${COMPETITOR_STYLE[w.group]?.badge || 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{w.group}</span>
                                            <p className="text-[12px] text-toss-gray-600 dark:text-gray-400 leading-snug pt-0.5">{w.watchPoint}</p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
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
    // ✅ 4개 탭으로 state 확장
    const [activeTab, setActiveTab] = useState('shinhan');
    const [reports, setReports] = useState({ card: null, ai: null, shinhan: null, competitor: null });
    const [generating, setGenerating] = useState({ card: false, ai: false, shinhan: false, competitor: false });
    const [progress, setProgress] = useState({ card: 0, ai: 0, shinhan: 0, competitor: 0 });
    const [timers, setTimers] = useState({ card: 0, ai: 0, shinhan: 0, competitor: 0 }); // ✅ 타이머 상태 추가
    const [insightIndex, setInsightIndex] = useState(0);   // ✅ 인사이트 인덱스
    const [loadingStepIndex, setLoadingStepIndex] = useState(0); // ✅ 로딩 단계 인덱스


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
        const tab = REPORT_TABS.find(t => t.id === activeTab);
        const text = buildShareText(reports[activeTab], tab?.label || '');
        navigator.clipboard.writeText(text)
            .then(() => { showToast('리포트가 클립보드에 복사되었습니다'); setShowSharePanel(false); })
            .catch(() => showToast('복사에 실패했습니다', 'error'));
    }, [activeTab, reports, showToast]);

    const handleEmailShare = useCallback(() => {
        const tab = REPORT_TABS.find(t => t.id === activeTab);
        const report = reports[activeTab];
        const subject = encodeURIComponent(report?.title || `${getWeekLabel()} ${tab?.label}`);
        const body = encodeURIComponent(buildShareText(report, tab?.label || ''));
        window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
        setShowSharePanel(false);
    }, [activeTab, reports]);

    const handleSaveImage = useCallback(async () => {
        if (!reportRef.current) return;
        setShowSharePanel(false);
        showToast('이미지 생성 중...', 'hourglass_top');
        try {
            const opts = {
                pixelRatio: 2,
                cacheBust: true,
                backgroundColor: document.documentElement.classList.contains('dark') ? '#111111' : '#f9fafb',
                filter: node => !(node.classList?.contains('material-symbols-outlined')),
            };
            await toPng(reportRef.current, opts);                    // 워밍업
            const dataUrl = await toPng(reportRef.current, opts);   // 실제 캡처
            const link = document.createElement('a');
            const tab = REPORT_TABS.find(t => t.id === activeTab);
            link.download = `${getWeekLabel()}_${tab?.label || 'report'}.png`;
            link.href = dataUrl;
            link.click();
            showToast('이미지가 저장되었습니다', 'download_done');
        } catch (e) {
            console.error('Image save error:', e);
            showToast('이미지 저장에 실패했습니다', 'error');
        }
    }, [activeTab, showToast]);

    const handleNativeShare = useCallback(async () => {
        const tab = REPORT_TABS.find(t => t.id === activeTab);
        const report = reports[activeTab];
        try {
            await navigator.share({ title: report?.title || `${getWeekLabel()} ${tab?.label}`, text: buildShareText(report, tab?.label || '') });
            setShowSharePanel(false);
        } catch (e) {
            if (e.name !== 'AbortError') showToast('공유에 실패했습니다', 'error');
        }
    }, [activeTab, reports, showToast]);

    // ✅ 캐시 로드 — competitor 포함
    useEffect(() => {
        setReports({
            card: loadCache('card'),
            ai: loadCache('ai'),
            shinhan: loadCache('shinhan'),
            competitor: loadCache('competitor'),
        });
    }, []);

    // ✅ 리포트 생성 — competitor case 추가
    const generateReport = useCallback(async (type) => {
        if (generating[type] || hasTodayCache(type)) return;
        setGenerating(prev => ({ ...prev, [type]: true }));
        setProgress(prev => ({ ...prev, [type]: 0 }));
        setTimers(prev => ({ ...prev, [type]: 20 })); // ✅ 신규: 소요 시간 20초 예측 (검색 포함)

        const interval = setInterval(() => {
            setProgress(prev => {
                const cur = prev[type];
                if (cur >= 90) return prev;
                return { ...prev, [type]: Math.min(90, cur + Math.random() * 15 + 5) };
            });
        }, 800);

        // ✅ 신규: 1초마다 줄어드는 타이머
        let secondsPassed = 0;
        const timerInterval = setInterval(() => {
            secondsPassed += 1;
            setTimers(prev => {
                const cur = prev[type];
                if (cur <= 1) return prev; // 1초에서 멈춤 (마무리 단계)
                return { ...prev, [type]: cur - 1 };
            });
            // 6초마다 인사이트 변경 (사용자가 읽을 시간 확보)
            if (secondsPassed % 6 === 0) {
                setInsightIndex(idx => (idx + 1) % FINANCIAL_INSIGHTS.length);
            }
            // 로딩 단계 업데이트
            setLoadingStepIndex(prev => {
                const steps = REPORT_LOADING_STEPS[type] || [];
                return Math.min(steps.length - 1, prev + 1);
            });
        }, 1000);

        setInsightIndex(Math.floor(Math.random() * FINANCIAL_INSIGHTS.length));
        setLoadingStepIndex(0);

        const today = getTodayKey();
        try {
            let prompt = '';
            switch (type) {
                case 'card': prompt = buildCardReportPrompt(today); break;
                case 'ai': prompt = buildAITrendReportPrompt(today); break;
                case 'shinhan': prompt = buildShinhanReportPrompt(today); break;
                case 'competitor': prompt = buildCompetitorReportPrompt(today); break; // ✅
                default: return;
            }
            const raw = await enqueueGeminiRequest(() => geminiRequest(prompt, { useSearch: true }));
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

            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            const errorMsg = isMobile
                ? '모바일 환경에서 리포트 생성 중 네트워크 끊김이 발생했을 수 있습니다. 안정적인 Wi-Fi 환경에서 다시 시도해 주세요.'
                : '리포트 생성에 실패했습니다. Gemini API 호출 제한이나 서버 통신 오류일 수 있으니 잠시 후 다시 시도해 주세요.';

            showToast(errorMsg, 'error');
        } finally {
            clearInterval(interval);
            clearInterval(timerInterval); // ✅ 타이머 인터벌 제거
            setTimers(prev => ({ ...prev, [type]: 0 }));
            setLoadingStepIndex(0); // 로딩 단계 초기화
            setInsightIndex(0); // 인사이트 초기화
        }
    }, [generating]);

    const currentTab = REPORT_TABS.find(t => t.id === activeTab);
    const currentReport = reports[activeTab];
    const isGenerating = generating[activeTab];
    const hasToday = hasTodayCache(activeTab);
    const currentProgress = progress[activeTab];

    // 탭별 설명 텍스트
    const TAB_DESC = {
        card: 'AI가 이번 주 카드 트렌드와 최적 조합을 분석합니다.',
        ai: 'AI가 이번 주 글로벌 AI 산업 핵심 동향을 분석합니다.',
        shinhan: '신한금융그룹 지주사 이슈부터 계열사별 위클리 동향까지 AI가 분석합니다.',
        competitor: 'KB·하나·우리금융의 이번 주 핵심 무브를 신한 시각으로 AI가 분석합니다.',
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden h-full">

            {/* ── 서브 탭 ── */}
            <div className="bg-white dark:bg-[#111111] border-b border-toss-gray-100 dark:border-gray-800 shrink-0">
                <div className="flex px-4 gap-1.5 py-3 overflow-x-auto scrollbar-hide">
                    {REPORT_TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        const hasData = reports[tab.id] !== null;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-[12px] font-semibold transition-all border whitespace-nowrap shrink-0 ${isActive
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white dark:bg-[#1a1a1a] text-toss-gray-700 dark:text-gray-300 border-toss-gray-200 dark:border-gray-700'
                                    }`}
                            >
                                <span>{tab.emoji}</span>
                                {tab.label}
                                {hasData && <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-green-400'}`} />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── 상태 바 ── */}
            <div className="px-5 pt-3 pb-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">{currentTab?.icon}</span>
                    <p className="text-[13px] text-toss-gray-600 dark:text-gray-400">
                        {getWeekLabel()} · {hasToday ? '오늘 생성 완료' : '미생성'}
                    </p>
                </div>
                {isGenerating && (
                    <div className="flex items-center gap-1.5 bg-primary/5 dark:bg-primary/20 px-3 py-1 rounded-full border border-primary/20">
                        <span className="material-symbols-outlined text-primary text-[14px] animate-spin">progress_activity</span>
                        <p className="text-[11px] font-bold text-primary">
                            분석 완료까지 {timers[activeTab]}초 예상
                        </p>
                    </div>
                )}
                <p className="text-[11px] text-toss-gray-400 dark:text-gray-600">{getMonthDay()}</p>
            </div>

            {/* ── 콘텐츠 영역 ── */}
            <div className="flex-1 overflow-y-auto h-full px-5 pb-32">

                {/* 생성 중 */}
                {isGenerating && (
                    <div className="mt-4">
                        <div className="bg-white dark:bg-[#1a1a1a] rounded-[24px] p-6 border border-toss-gray-100 dark:border-gray-800 text-center">
                            <div className="w-12 h-12 mx-auto mb-4 relative">
                                <div className="w-12 h-12 border-3 border-primary/20 rounded-full" />
                                <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin absolute inset-0" />
                                <span className="material-symbols-outlined text-primary text-[20px] absolute inset-0 flex items-center justify-center">{currentTab?.icon}</span>
                            </div>
                            <h3 className="text-[16px] font-bold text-toss-gray-800 dark:text-white mb-1">AI가 리포트를 생성 중입니다</h3>
                            <p className="text-[12px] text-toss-gray-500 dark:text-gray-400 mb-5">{REPORT_LOADING_STEPS[activeTab][loadingStepIndex]}</p>
                            <div className="w-full bg-toss-gray-100 dark:bg-gray-800 rounded-full h-2 mb-6 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-700 ease-out" style={{ width: `${currentProgress}%` }} />
                            </div>

                            {/* 인사이트 카드 추가 */}
                            <div className="bg-primary/5 dark:bg-primary/10 rounded-[22px] p-5 border border-primary/10 text-left animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">{FINANCIAL_INSIGHTS[insightIndex].icon}</span>
                                    <h4 className="text-[14px] font-bold text-primary">{FINANCIAL_INSIGHTS[insightIndex].title}</h4>
                                </div>
                                <p className="text-[13px] text-toss-gray-600 dark:text-gray-300 leading-relaxed">
                                    {FINANCIAL_INSIGHTS[insightIndex].body}
                                </p>
                                <div className="flex gap-1 mt-4 justify-center">
                                    {FINANCIAL_INSIGHTS.map((_, i) => (
                                        <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === insightIndex ? 'w-4 bg-primary' : 'w-1 bg-primary/20'}`} />
                                    ))}
                                </div>
                            </div>
                            <p className="text-[11px] text-toss-gray-400 dark:text-gray-600 mt-5">
                                분석 완료까지 약 {timers[activeTab]}초 남았습니다
                            </p>
                        </div>
                    </div>
                )}

                {/* 리포트 없음 */}
                {!isGenerating && !currentReport && (
                    <div className="mt-4">
                        <div className="bg-white dark:bg-[#1a1a1a] rounded-[24px] p-6 border border-toss-gray-100 dark:border-gray-800 text-center">
                            <span className="text-4xl block mb-3">{currentTab?.emoji}</span>
                            <h3 className="text-[17px] font-bold text-toss-gray-800 dark:text-white mb-2">{currentTab?.label}</h3>
                            <p className="text-[13px] text-toss-gray-500 dark:text-gray-400 mb-5 leading-relaxed">{TAB_DESC[activeTab]}</p>
                            <button
                                onClick={() => generateReport(activeTab)}
                                className="w-full bg-primary text-white py-[14px] rounded-[16px] font-bold text-[15px] shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                                AI 리포트 생성하기
                            </button>
                            <p className="text-[10px] text-toss-gray-400 dark:text-gray-600 mt-3">최신 데이터 기반 하루 한 번 생성 가능</p>
                        </div>
                    </div>
                )}

                {/* 리포트 있음 */}
                {!isGenerating && currentReport && (
                    <div className="mt-4" ref={reportRef}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-[18px] font-bold text-toss-gray-800 dark:text-white leading-snug flex-1 mr-3">
                                {currentReport.title || `${getWeekLabel()} ${currentTab?.label}`}
                            </h2>
                            <button
                                onClick={() => setShowSharePanel(true)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 active:scale-90 transition-all shrink-0"
                                title="공유하기"
                            >
                                <span className="material-symbols-outlined text-primary text-[16px]">ios_share</span>
                            </button>
                        </div>

                        {/* ✅ 4개 탭 렌더 */}
                        {activeTab === 'card' && <CardReportView data={currentReport} />}
                        {activeTab === 'ai' && <AITrendReportView data={currentReport} />}
                        {activeTab === 'shinhan' && <ShinhanReportView data={currentReport} />}
                        {activeTab === 'competitor' && <CompetitorReportView data={currentReport} />}

                        {/* 푸터 */}
                        <div className="mt-8 p-4 bg-toss-gray-50 dark:bg-gray-900/50 rounded-2xl">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="material-symbols-outlined text-[16px] text-primary">smart_toy</span>
                                <span className="text-[12px] font-bold text-primary">AI Generated Report</span>
                            </div>
                            <p className="text-[11px] text-toss-gray-500 dark:text-gray-500 leading-relaxed">
                                본 리포트는 Gemini AI + Google Search 기반으로 자동 생성되었습니다. 투자 결정의 참고자료이며, 실제 투자에 대한 책임은 사용자에게 있습니다.
                            </p>
                            <p className="text-[10px] text-toss-gray-400 dark:text-gray-600 mt-1">📅 {getMonthDay()} 생성 · 다음 생성 가능: 내일</p>
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

            <SharePanel
                visible={showSharePanel}
                onClose={() => setShowSharePanel(false)}
                onCopyText={handleCopyText}
                onEmail={handleEmailShare}
                onSaveImage={handleSaveImage}
                onNativeShare={handleNativeShare}
                canNativeShare={canNativeShare}
            />
            <Toast message={toast.message} icon={toast.icon} visible={toast.visible} />
        </div>
    );
}
