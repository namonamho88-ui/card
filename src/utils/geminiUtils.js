const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// ✅ 최신 모델로 교체 (가장 저렴하고 빠름)
export const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';

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

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000); // 120초 타임아웃

            let res;
            try {
                res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                        signal: controller.signal
                    }
                );
            } catch (fetchErr) {
                clearTimeout(timeoutId);
                if (fetchErr.name === 'AbortError') {
                    throw new Error('요청 시간이 초과되었습니다. 네트워크 상태를 확인하고 다시 시도해 주세요.');
                }
                throw fetchErr;
            }
            clearTimeout(timeoutId);

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
            // ✅ 모든 text parts를 결합 (Google Search grounding 시 여러 parts에 분산됨)
            const parts = json.candidates?.[0]?.content?.parts || [];
            const raw = parts.map(p => p.text || '').join('').trim();
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
 * - 코드블록, 제어문자, trailing comma, BOM 등 다양한 AI 응답 형식 대응
 */
export function extractJSON(raw) {
    if (!raw || typeof raw !== 'string') {
        throw new Error("JSON 파싱 실패: 빈 응답");
    }

    // 1단계: 전처리 — 제어문자, BOM 제거
    let cleaned = raw
        .replace(/^\uFEFF/, '')          // BOM 제거
        .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '') // 제어문자 제거 (탭/줄바꿈 유지)
        .trim();

    // 2단계: 코드블록에서 추출 시도 (여러 코드블록이 있을 수 있음)
    const codeBlocks = [...cleaned.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)];
    if (codeBlocks.length > 0) {
        // 가장 긴 코드블록 선택 (메인 JSON일 가능성 높음)
        const longest = codeBlocks.reduce((a, b) => a[1].length > b[1].length ? a : b);
        cleaned = longest[1].trim();
    }

    // 3단계: 파싱 시도 함수
    const tryParse = (str) => {
        try {
            return JSON.parse(str);
        } catch {
            // trailing comma 제거 후 재시도
            const fixed = str
                .replace(/,\s*([}\]])/g, '$1')   // trailing comma
                .replace(/'/g, '"');              // 작은따옴표 → 큰따옴표
            try {
                return JSON.parse(fixed);
            } catch {
                return null;
            }
        }
    };

    // 4단계: 직접 파싱 시도
    let result = tryParse(cleaned);
    if (result) return result;

    // 5단계: { } 또는 [ ] 영역 추출 후 파싱
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);

    if (objMatch) {
        result = tryParse(objMatch[0]);
        if (result) return result;
    }
    if (arrMatch) {
        result = tryParse(arrMatch[0]);
        if (result) return result;
    }

    console.error("JSON Parsing Error original content:", raw);
    throw new Error("JSON 파싱 실패");
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
