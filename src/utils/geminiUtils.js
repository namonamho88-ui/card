const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// ✅ 최신 모델로 교체 (가장 저렴하고 빠름)
export const GEMINI_MODEL = 'gemini-2.5-flash-lite';

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
                // 429: 지수 백오프로 대기 후 재시도
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
 */
const requestQueue = [];
let isProcessing = false;

export async function enqueueGeminiRequest(fn) {
    return new Promise((resolve, reject) => {
        requestQueue.push({ fn, resolve, reject });
        processQueue();
    });
}

async function processQueue() {
    if (isProcessing || requestQueue.length === 0) return;
    isProcessing = true;
    const { fn, resolve, reject } = requestQueue.shift();
    try {
        const result = await fn();
        resolve(result);
    } catch (e) {
        reject(e);
    } finally {
        isProcessing = false;
        // 큐의 다음 요청 사이에 1초 딜레이
        if (requestQueue.length > 0) {
            setTimeout(processQueue, 1000);
        }
    }
}
