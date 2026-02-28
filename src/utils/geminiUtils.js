const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// ✅ 유료 버전 모델
export const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * 지수 백오프를 포함한 Gemini API 요청 함수
 */
export async function geminiRequest(prompt, { maxRetries = 3, useSearch = false, systemInstruction = "" } = {}) {
    if (!GEMINI_KEY) throw new Error('No API key');

    const tools = useSearch ? [{ google_search: {} }] : [];

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const body = {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                ...(tools.length > 0 && { tools }),
                generationConfig: { temperature: 0.2 }
            };

            if (systemInstruction) {
                body.system_instruction = { parts: [{ text: systemInstruction }] };
            }

            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                }
            );

            if (res.status === 429) {
                if (attempt === maxRetries - 1) {
                    throw new Error('무료버전 이용중이라 사용 한도에 도달하였습니다. 잠시후에 이용해주세요.');
                }
                const waitMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000);
                console.warn(`Gemini 429 - Retry ${attempt + 1}/${maxRetries} after ${Math.round(waitMs)}ms`);
                await new Promise(r => setTimeout(r, waitMs));
                continue;
            }

            if (!res.ok) throw new Error(`API ${res.status}`);

            const json = await res.json();
            const raw = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
            return raw;
        } catch (e) {
            if (e.message.includes('무료버전')) throw e;
            if (attempt === maxRetries - 1) throw e;
            const waitMs = 1000 * Math.pow(2, attempt);
            await new Promise(r => setTimeout(r, waitMs));
        }
    }
    throw new Error('Max retries exceeded');
}

/**
 * 응답에서 JSON 문자열을 추출하고 파싱하는 유틸리티
 */
export function extractJSON(raw) {
    try {
        let jsonStr = raw;
        const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlock) {
            jsonStr = codeBlock[1].trim();
        } else {
            const arr = raw.match(/\[[\s\S]*\]/);
            const obj = raw.match(/\{[\s\S]*\}/);
            if (arr) jsonStr = arr[0];
            else if (obj) jsonStr = obj[0];
        }
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("JSON Parsing Error original content:", raw);
        throw new Error("JSON 파싱 실패");
    }
}

/**
 * 요청 큐 (동시 Gemini 호출 방지 및 딜레이 보장)
 * ✅ 속도 최적화: 병렬 처리(최대 2개) 및 딜레이 단축(200ms)
 */
const requestQueue = [];
let activeRequests = 0;
const MAX_CONCURRENT = 2;
const QUEUE_DELAY = 200;

export async function enqueueGeminiRequest(fn) {
    return new Promise((resolve, reject) => {
        requestQueue.push({ fn, resolve, reject });
        processQueue();
    });
}

async function processQueue() {
    if (activeRequests >= MAX_CONCURRENT || requestQueue.length === 0) return;

    activeRequests++;
    const { fn, resolve, reject } = requestQueue.shift();

    try {
        const result = await fn();
        resolve(result);
    } catch (e) {
        reject(e);
    } finally {
        activeRequests--;
        // 다음 요청까지 약간의 딜레이만 두고 즉시 실행 시도
        setTimeout(processQueue, QUEUE_DELAY);
    }

    // 여유 자원이 있으면 하나 더 바로 실행
    if (activeRequests < MAX_CONCURRENT && requestQueue.length > 0) {
        processQueue();
    }
}
