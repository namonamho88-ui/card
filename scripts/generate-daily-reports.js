/**
 * 📊 AI 주간 리포트 자동 생성 스크립트
 * GitHub Actions에서 매일 자정(KST)에 실행되어 4개 리포트를 생성합니다.
 * 
 * 사용법: GEMINI_API_KEY=xxx node scripts/generate-daily-reports.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';
const REPORTS_DIR = path.join(__dirname, '..', 'public', 'reports');

// ── 날짜 유틸 ──
function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekLabel() {
    const now = new Date();
    return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${Math.ceil(now.getDate() / 7)}주차`;
}

// ── 카드 데이터 로드 ──
function loadCardData() {
    try {
        const raw = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'popularCards.json'), 'utf-8');
        return JSON.parse(raw).cards || [];
    } catch {
        console.warn('⚠️ popularCards.json 로드 실패, 빈 배열 사용');
        return [];
    }
}

// ── Gemini API 호출 ──
async function geminiRequest(prompt, useSearch = false) {
    const tools = useSearch ? [{ google_search: {} }] : [];
    const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        ...(tools.length > 0 && { tools }),
        generationConfig: { temperature: 0.2 }
    };

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                }
            );

            if (res.status === 429) {
                const waitMs = 1000 * Math.pow(2, attempt) + Math.random() * 1000;
                console.warn(`⏳ 429 Rate Limit - ${Math.round(waitMs)}ms 대기 후 재시도 (${attempt + 1}/3)`);
                await new Promise(r => setTimeout(r, waitMs));
                continue;
            }

            if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);

            const json = await res.json();
            const parts = json.candidates?.[0]?.content?.parts || [];
            return parts.map(p => p.text || '').join('').trim();
        } catch (e) {
            if (attempt === 2) throw e;
            const waitMs = 1000 * Math.pow(2, attempt);
            console.warn(`⚠️ 에러 발생, ${waitMs}ms 후 재시도:`, e.message);
            await new Promise(r => setTimeout(r, waitMs));
        }
    }
    throw new Error('Max retries exceeded');
}

// ── JSON 추출 ──
function extractJSON(raw) {
    if (!raw) throw new Error('빈 응답');

    let cleaned = raw.replace(/^\uFEFF/, '').replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '').trim();

    const codeBlocks = [...cleaned.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)];
    if (codeBlocks.length > 0) {
        const longest = codeBlocks.reduce((a, b) => a[1].length > b[1].length ? a : b);
        cleaned = longest[1].trim();
    }

    const tryParse = (str) => {
        try { return JSON.parse(str); } catch {
            try { return JSON.parse(str.replace(/,\s*([}\]])/g, '$1').replace(/'/g, '"')); } catch { return null; }
        }
    };

    let result = tryParse(cleaned);
    if (result) return result;

    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) { result = tryParse(objMatch[0]); if (result) return result; }

    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) { result = tryParse(arrMatch[0]); if (result) return result; }

    throw new Error('JSON 파싱 실패');
}

// ── 프롬프트 빌더 ──
function buildPrompts(today) {
    const weekLabel = getWeekLabel();
    const cards = loadCardData();
    const cardsText = cards.map(c =>
        `${c.issuer} ${c.name}(연회비:${c.annualFee}/실적:${c.previousMonthSpending}):${c.benefits.join(',')}`
    ).join('\n');

    return {
        card: `당신은 한국 신용카드 시장 전문 AI 애널리스트입니다.
오늘 날짜(${today}) 기준으로 "${weekLabel} AI 카드 리포트"를 작성하세요.

⚠️ 중요: 모든 텍스트 필드(body, detail, description, highlight, preview 등)는 반드시 구체적이고 상세하게 작성하세요.

## 보유 카드 데이터
${cardsText}

## 반드시 아래 JSON만 출력하세요:
{
  "title": "${weekLabel} AI 카드 리포트",
  "summary": { "title": "이번 주 카드 시장 핵심 트렌드 제목 (20자 이내)", "body": "이번 주 카드 시장의 핵심 동향을 3~4문장으로 요약.", "mood": "positive 또는 neutral 또는 negative" },
  "rankings": [{ "rank": 1, "title": "카드명", "subtitle": "카드사", "badge": "▲5 또는 NEW 또는 →유지", "badgeType": "up 또는 down 또는 same 또는 new", "highlight": "핵심 이유 한 줄", "detail": "2~3문장 설명", "tags": ["태그1"] }],
  "events": [{ "issuer": "카드사명", "title": "이벤트 제목", "period": "~3/31", "detail": "핵심 내용 한 줄" }],
  "comboInsight": { "card1": "카드명", "card1Issuer": "카드사", "card1Benefits": ["혜택1"], "card2": "카드명", "card2Issuer": "카드사", "card2Benefits": ["혜택1"], "coveragePercent": 89, "monthlySaving": 53200, "description": "추천 이유 2문장" },
  "nextWeek": { "preview": "전망 3~4문장", "keywords": ["키워드1"] }
}
rankings는 정확히 3개, events는 6개(카드사별 1개씩).`,

        ai: `당신은 AI 산업 전문 애널리스트입니다.
오늘 날짜(${today}) 기준 최신 AI 뉴스와 동향을 조사하여 "${weekLabel} AI 동향 리포트"를 작성하세요.

⚠️ 중요: 모든 텍스트 필드는 반드시 구체적이고 상세하게 작성하세요.

## 반드시 아래 JSON만 출력하세요:
{
  "title": "${weekLabel} AI 동향 리포트",
  "summary": { "title": "핵심 이슈 제목 (20자 이내)", "body": "3~4문장 요약", "mood": "positive 또는 neutral 또는 negative" },
  "topNews": [{ "rank": 1, "category": "빅테크 또는 스타트업 또는 규제 또는 제품 또는 오픈소스", "title": "뉴스 제목", "company": "기업명", "date": "${today.replace(/-/g, '.')}", "body": "3~4문장", "aiComment": "영향 분석 1~2문장", "impact": 10 }],
  "industryStats": [{ "label": "글로벌 AI 투자", "value": "$4.2B", "change": "▲18%" }],
  "techTrends": [{ "keyword": "#키워드", "title": "트렌드 제목", "body": "2~3문장" }],
  "koreaUpdates": [{ "company": "기업명", "update": "한 줄" }],
  "nextWeek": { "preview": "3~4문장", "events": [{ "date": "3/3", "day": "월", "event": "이벤트명" }] }
}
topNews 정확히 5개, techTrends 3개, koreaUpdates 4개. 반드시 최신 실제 뉴스 기반.`,

        shinhan: `당신은 신한금융그룹 전문 리서치 애널리스트입니다.
반드시 구글 검색(Google Search)을 사용하여 **신한지주(055550)**의 가장 최근 거래일(기준일: ${today}) 종가와 주간 등락률, 시가총액, 주요 재무 지표(NIM, ROE 등)를 확인하여 리포트를 작성하세요.

⚠️ 중요: 모든 텍스트 필드는 매우 구체적이고 상세하게 작성해야 합니다.
1. holdingIssues: 각 이슈당 반드시 4~5문장 이상의 심층 분석
2. subsidiaryUpdates: details 배열에 3개 이상의 구체적 이슈
3. analystView.comment: 3~4문장의 상세 투자 의견
4. nextWeek.preview: 4~5문장의 상세 전망

## 반드시 아래 JSON만 출력하세요:
{
  "title": "${weekLabel} 신한금융그룹 위클리 리포트",
  "summary": { "title": "이슈 제목 (20자 이내)", "body": "3~4문장 요약", "mood": "positive/neutral/negative", "stockPrice": "실제 현재가", "stockChange": "실제 등락률", "stockIsUp": true },
  "holdingIssues": [{ "category": "배당/IR/ESG/지배구조/실적/인사", "title": "이슈 제목", "body": "상세 분석 4~5문장", "importance": "high/medium/low" }],
  "subsidiaryUpdates": [
    { "company": "신한은행", "icon": "account_balance", "color": "blue", "headline": "요약 헤드라인", "details": ["이슈1", "이슈2", "이슈3"], "sentiment": "positive" },
    { "company": "신한카드", "icon": "credit_card", "color": "red", "headline": "요약 헤드라인", "details": ["이슈1", "이슈2", "이슈3"], "sentiment": "neutral" },
    { "company": "신한투자증권", "icon": "show_chart", "color": "green", "headline": "요약 헤드라인", "details": ["이슈1", "이슈2", "이슈3"], "sentiment": "positive" },
    { "company": "신한라이프", "icon": "favorite", "color": "pink", "headline": "요약 헤드라인", "details": ["이슈1", "이슈2", "이슈3"], "sentiment": "neutral" },
    { "company": "신한캐피탈", "icon": "directions_car", "color": "orange", "headline": "요약 헤드라인", "details": ["이슈1", "이슈2", "이슈3"], "sentiment": "positive" }
  ],
  "keyMetrics": [
    { "label": "신한지주 시가총액", "value": "실제 값", "change": "실제 등락" },
    { "label": "신한은행 NIM", "value": "최신 수치", "change": "변동폭" },
    { "label": "그룹 ROE", "value": "최신 수치", "change": "변동폭" }
  ],
  "analystView": { "consensus": "매수/중립/매도", "targetPrice": "목표주가", "currentPrice": "현재가", "upside": "상승여력", "comment": "상세 투자 의견 3~4문장" },
  "globalPeerComparison": [
    { "name": "KB금융", "change": "실제 등락", "isUp": true, "note": "코멘트" },
    { "name": "하나금융", "change": "실제 등락", "isUp": true, "note": "코멘트" },
    { "name": "우리금융", "change": "실제 등락", "isUp": false, "note": "코멘트" }
  ],
  "riskFactors": [{ "factor": "리스크 항목", "description": "상세 설명", "level": "high/medium/low" }],
  "nextWeek": { "preview": "다음 주 상세 전망 4~5문장", "events": [{ "date": "일자", "day": "요일", "event": "상세 내용" }] }
}`,

        competitor: `당신은 한국 금융권 경쟁 분석 전문 AI 애널리스트입니다.
반드시 구글 검색(Google Search)을 사용하여 다음 티커들의 기준일(${today}) 종가, 주간 변동률, PBR, PER를 확인하세요:
- 신한지주 (055550), KB금융 (105560), 하나금융 (086790), 우리금융 (316140)

⚠️ 중요: 이 리포트는 경영진이 읽는 주간 보고서입니다. 모든 필드를 매우 상세하고 전문적으로 작성해야 합니다.
1. summary.body: 이번 주 금융권 전체 경쟁 구도 변화를 4~5문장으로 깊이 있게 분석하세요.
2. competitorMoves: 각 경쟁사별 body는 반드시 4~5문장으로 구체적인 수치, 날짜, 서비스명을 포함하여 작성하세요. ourAction도 2~3문장으로 신한의 구체적 대응 전략을 제시하세요.
3. productBattle: 각 도메인별 comment는 2~3문장으로 실제 금리/수수료 비교와 시장 영향을 분석하세요.
4. industryTopics: 각 topic의 body는 3~4문장으로 업계에 미치는 영향을 심층 분석하세요. shinhanImpact도 2문장으로 작성하세요.
5. swotSignals: opportunities와 threats 각각 3개 이상의 구체적 항목을 포함하세요.
6. weeklyVerdict: shinhanComment는 3~4문장으로 종합 평가를, nextFocus는 2~3문장 구체적 전략을 서술하세요.
7. nextWeek.preview: 다음 주 금융권 경쟁 전망을 4~5문장으로 매우 상세하게 서술하세요.

## 반드시 아래 JSON만 출력하세요:
{
  "title": "${weekLabel} 금융권 경쟁 인텔리전스 리포트",
  "summary": { "title": "경쟁 구도 핵심 (20자 이내)", "body": "이번 주 경쟁 구도 심층 분석 4~5문장", "hotGroup": "가장 공격적인 금융사", "hotReason": "이유 한 줄", "mood": "positive/neutral/negative" },
  "stockComparison": [
    { "name": "신한지주", "ticker": "055550", "price": "실제 현재가", "weekChange": "실제 변동률", "isUp": true, "per": "실제 PER", "pbr": "실제 PBR", "isOurGroup": true },
    { "name": "KB금융", "ticker": "105560", "price": "실제", "weekChange": "실제", "isUp": true, "per": "실제", "pbr": "실제", "isOurGroup": false },
    { "name": "하나금융", "ticker": "086790", "price": "실제", "weekChange": "실제", "isUp": true, "per": "실제", "pbr": "실제", "isOurGroup": false },
    { "name": "우리금융", "ticker": "316140", "price": "실제", "weekChange": "실제", "isUp": false, "per": "실제", "pbr": "실제", "isOurGroup": false }
  ],
  "competitorMoves": [
    { "group": "KB금융", "category": "카테고리", "title": "이슈 제목", "body": "상세 분석 4~5문장 (수치, 날짜, 서비스명 포함)", "threatLevel": "high/medium/low", "ourAction": "신한 구체적 대응 전략 2~3문장" },
    { "group": "하나금융", "category": "카테고리", "title": "이슈 제목", "body": "상세 분석 4~5문장 (수치, 날짜, 서비스명 포함)", "threatLevel": "high/medium/low", "ourAction": "신한 구체적 대응 전략 2~3문장" },
    { "group": "우리금융", "category": "카테고리", "title": "이슈 제목", "body": "상세 분석 4~5문장 (수치, 날짜, 서비스명 포함)", "threatLevel": "high/medium/low", "ourAction": "신한 구체적 대응 전략 2~3문장" }
  ],
  "productBattle": [
    { "domain": "수신", "leader": "리드사", "leaderProduct": "상품명", "leaderRate": "금리", "shinhanProduct": "신한 상품", "shinhanRate": "신한 금리", "shinhanStatus": "우위/동등/열위", "comment": "상세 비교 분석 2~3문장" },
    { "domain": "대출", "leader": "리드사", "leaderProduct": "상품명", "leaderRate": "금리", "shinhanProduct": "신한 상품", "shinhanRate": "신한 금리", "shinhanStatus": "우위/동등/열위", "comment": "상세 비교 분석 2~3문장" }
  ],
  "industryTopics": [{ "topic": "주제", "body": "심층 분석 3~4문장", "affectedGroups": ["신한", "KB"], "shinhanImpact": "신한 영향 분석 2문장" }],
  "swotSignals": { "opportunities": ["구체적 기회1", "기회2", "기회3"], "threats": ["구체적 위협1", "위협2", "위협3"] },
  "weeklyVerdict": { "winner": "금융사", "winnerReason": "이유 2문장", "shinhanScore": 75, "shinhanComment": "종합 평가 3~4문장", "nextFocus": "구체적 전략 2~3문장" },
  "nextWeek": { "preview": "다음 주 경쟁 전망 4~5문장", "watchList": [{ "group": "사명", "watchPoint": "구체적 관전포인트 2문장" }] }
}`
    };
}

// ── 메인 실행 ──
async function main() {
    if (!GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY 환경변수가 설정되지 않았습니다.');
        process.exit(1);
    }

    // 디렉토리 생성
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
        console.log('📁 public/reports/ 디렉토리 생성');
    }

    const today = getTodayKey();
    const prompts = buildPrompts(today);
    const types = ['shinhan', 'ai', 'card', 'competitor'];
    const useSearchMap = { shinhan: true, ai: true, card: true, competitor: true };

    console.log(`\n🚀 ${today} 리포트 자동 생성 시작\n${'─'.repeat(50)}`);

    for (const type of types) {
        const outputFile = path.join(REPORTS_DIR, `${type}.json`);
        console.log(`\n📝 [${type}] 리포트 생성 중...`);

        try {
            const raw = await geminiRequest(prompts[type], useSearchMap[type]);
            const data = extractJSON(raw);

            const output = {
                date: today,
                generatedAt: new Date().toISOString(),
                data
            };

            fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf-8');
            console.log(`✅ [${type}] 생성 완료 → ${outputFile}`);

            // API Rate Limit 방지 — 요청 간 3초 대기
            if (type !== types[types.length - 1]) {
                console.log('   ⏳ 3초 대기 (Rate Limit 방지)...');
                await new Promise(r => setTimeout(r, 3000));
            }
        } catch (err) {
            console.error(`❌ [${type}] 생성 실패:`, err.message);
            // 실패해도 다른 리포트 계속 생성
        }
    }

    console.log(`\n${'─'.repeat(50)}\n🎉 리포트 자동 생성 완료!\n`);
}

main().catch(err => {
    console.error('❌ 치명적 오류:', err);
    process.exit(1);
});
