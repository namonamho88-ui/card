/**
 * AI Tools 디렉토리의 트렌드 코멘트를 Gemini로 자동 갱신
 * 기본 도구 데이터는 수동 큐레이션(aiTools.json), Gemini는 인사이트만 생성
 *
 * 실행: node scripts/fetchAIDirectory.mjs
 * 필요 환경변수: GEMINI_API_KEY
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

async function callGemini(prompt) {
    const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API ${res.status}: ${errText}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function main() {
    const filePath = path.resolve(__dirname, '..', 'src', 'data', 'aiTools.json');
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // 도구 목록 요약
    const toolsSummary = raw.categories.map(cat =>
        `[${cat.name}] ${cat.tools.map(t => `${t.name}(${t.company},${t.pricing})`).join(', ')}`
    ).join('\n');

    console.log('🤖 Gemini에게 AI 트렌드 인사이트 요청 중...\n');

    try {
        const insight = await callGemini(`당신은 AI 업계 트렌드 분석가입니다.
아래는 현재 주요 AI 도구 목록입니다:

${toolsSummary}

이 목록을 보고 오늘 날짜 기준으로:
1. 전체 AI 업계 동향을 3문장으로 요약 (한국어)
2. 특히 주목할 도구 1~2개를 이유와 함께 언급
3. 일반 사무직 직원이 이해할 수 있는 쉬운 표현 사용
4. 총 5~6문장 이내로 작성
5. 마크다운 사용하지 말 것, 순수 텍스트만`);

        raw.insight = insight.trim();
        console.log('💡 인사이트:\n' + raw.insight + '\n');
    } catch (err) {
        console.error('⚠️ Gemini 호출 실패:', err.message);
        raw.insight = raw.insight || 'AI 업계가 빠르게 변화하고 있습니다. 최신 도구들을 확인해보세요.';
    }

    // trending 표시 업데이트 (Gemini에게 물어보기)
    try {
        const trendingResult = await callGemini(`아래 AI 도구 목록에서 현재 가장 화제가 되고 있는 도구 이름을 최대 8개만 콤마로 구분하여 나열해주세요.
도구명만 정확히, 다른 설명 없이 출력하세요.

${toolsSummary}`);

        const trendingNames = trendingResult.split(',').map(s => s.trim().toLowerCase());
        console.log('🔥 트렌딩:', trendingNames.join(', '));

        // 기존 trending 초기화 후 재설정
        raw.categories.forEach(cat => {
            cat.tools.forEach(tool => {
                tool.trending = trendingNames.some(tn =>
                    tool.name.toLowerCase().includes(tn) || tn.includes(tool.name.toLowerCase())
                );
            });
        });
    } catch (err) {
        console.error('⚠️ 트렌딩 업데이트 실패:', err.message);
    }

    // 날짜 업데이트 & 저장
    raw.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(raw, null, 2), 'utf-8');

    console.log(`\n✅ 완료! ${filePath}`);
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});