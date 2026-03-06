/**
 * 📊 글로벌 금융 종목 상세 분석 스크립트 (국내/해외/가상화폐)
 * 매일 오전 08:00 (KST) GitHub Actions에서 실행되어
 * 주요 30개 종목에 대한 실시간 호재/악재를 상세 분석하여 JSON으로 저장합니다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.join(__dirname, '..', 'public', 'reports');

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-1.5-flash'; // 안정적인 모델 사용

// --- 분석 대상 정의 ---

const KR_STOCKS = [
    { id: '005930', name: '삼성전자' },
    { id: '000660', name: 'SK하이닉스' },
    { id: '373220', name: 'LG에너지솔루션' },
    { id: '207940', name: '삼성바이오로직스' },
    { id: '005380', name: '현대차' },
    { id: '006400', name: '삼성SDI' },
    { id: '051910', name: 'LG화학' },
    { id: '035420', name: 'NAVER' },
    { id: '035720', name: '카카오' },
    { id: '068270', name: '셀트리온' },
];

const US_STOCKS = [
    { id: 'AAPL', name: '애플' },
    { id: 'MSFT', name: '마이크로소프트' },
    { id: 'NVDA', name: '엔비디아' },
    { id: 'GOOGL', name: '구글' },
    { id: 'AMZN', name: '아마존' },
    { id: 'META', name: '메타' },
    { id: 'TSLA', name: '테슬라' },
    { id: 'TSM', name: 'TSMC' },
    { id: 'AVGO', name: '브로드컴' },
    { id: 'JPM', name: 'JP모건' },
];

const CRYPTOS = [
    { id: 'bitcoin', name: '비트코인' },
    { id: 'ethereum', name: '이더리움' },
    { id: 'binancecoin', name: '바이낸스코인' },
    { id: 'solana', name: '솔라나' },
    { id: 'ripple', name: '리플' },
    { id: 'cardano', name: '에이다' },
    { id: 'dogecoin', name: '도지코인' },
    { id: 'avalanche-2', name: '아발란체' },
    { id: 'chainlink', name: '체인링크' },
    { id: 'polkadot', name: '폴카닷' },
];

function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function geminiRequest(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }],
            generationConfig: { temperature: 0.2 }
        })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`API Error: ${res.status} - ${err}`);
    }

    const json = await res.json();
    const parts = json.candidates?.[0]?.content?.parts || [];
    return parts.map(p => p.text || '').join('').trim();
}

function extractJSON(raw) {
    try {
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) return null;
        return JSON.parse(match[0].replace(/,\s*([}\]])/g, '$1'));
    } catch (e) {
        console.error('JSON Parse Error:', e.message);
        return null;
    }
}

async function analyzeItem(category, item) {
    const today = getTodayKey();
    const prompt = `당신은 글로벌 금융 분석 전문가입니다. 
다음 종목(${category})에 대한 오늘(${today}) 기준 최신 뉴스, 공시, 시장 동향을 Google Search로 검색하여 호재와 악재를 심층 분석하세요.

대상 종목: ${item.name} (${item.id})

분석 가이드:
1. 'summary'는 현재 시장 상황과 종목의 포지션을 포함하여 4-5문장으로 상세히 작성하세요.
2. 'items'는 최소 3개 이상의 핵심 이슈를 포함해야 합니다.
3. 각 이슈의 'detail'은 해당 뉴스가 주가에 미치는 영향과 향후 전망을 포함하여 3-4문장으로 구체적으로 분석하세요. 구체적인 수치나 데이터가 있다면 반드시 포함하세요.

응답은 반드시 아래 JSON 형식으로만 출력하세요 (다른 텍스트 금지):
{
  "summary": "상세 요약 내용...",
  "sentiment": "긍정" | "부정" | "중립",
  "items": [
    {
      "title": "이슈 제목",
      "type": "호재" | "악재" | "중립",
      "detail": "심층 분석 내용..."
    }
  ]
}`;

    try {
        const raw = await geminiRequest(prompt);
        const parsed = extractJSON(raw);
        if (parsed) return { ...item, ...parsed };
        return null;
    } catch (e) {
        console.error(`  ❌ ${item.name} 분석 실패:`, e.message);
        return null;
    }
}

async function main() {
    if (!GEMINI_KEY) {
        console.error('GEMINI_API_KEY가 설정되지 않았습니다.');
        process.exit(1);
    }

    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const today = getTodayKey();
    console.log(`\n🚀 ${today} 글로벌 금융 분석 시작 (오전 08:00 KST 정기 생성)\n`);

    const result = {
        date: today,
        generatedAt: new Date().toISOString(),
        kr: [],
        us: [],
        crypto: []
    };

    const categories = [
        { key: 'kr', label: '국내주식', items: KR_STOCKS },
        { key: 'us', label: '해외주식', items: US_STOCKS },
        { key: 'crypto', label: '가상화폐', items: CRYPTOS },
    ];

    for (const cat of categories) {
        console.log(`\n📂 [${cat.label}] 분석 중...`);
        for (const item of cat.items) {
            console.log(`  🔍 ${item.name} 분석 중...`);
            const analysis = await analyzeItem(cat.label, item);
            if (analysis) {
                result[cat.key].push(analysis);
                console.log(`  ✅ ${item.name} 분석 완료 (Sentiment: ${analysis.sentiment})`);
            }
            // 딜레이 (쿼터 방지)
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    const outputFile = path.join(REPORTS_DIR, 'financial-analysis.json');
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`\n🎉 모든 분석 완료! → ${outputFile}`);
}

main().catch(console.error);
