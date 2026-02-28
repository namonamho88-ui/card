const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// ✅ 유료 버전 모델 (Updated to 2.5)
export const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * 스트리밍 방식을 포함한 Gemini API 요청 함수
 */
export async function geminiStreamRequest(prompt, { onChunk, maxRetries = 2, useSearch = false, systemInstruction = "" } = {}) {
    if (!GEMINI_KEY) throw new Error('No API key');

    const generationConfig = {
        temperature: 0.1
    };

    const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig
    };

    if (useSearch) {
        body.tools = [{ google_search: {} }];
    } else {
        // Search 사용 안 할 때만 JSON 모드 활성화 (API 제약 사항)
        generationConfig.response_mime_type = "application/json";
    }

    if (systemInstruction) {
        body.system_instruction = { parts: [{ text: systemInstruction }] };
    }

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?key=${GEMINI_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }
    );

    if (!res.ok) throw new Error(`API ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Gemini 스트리밍 응답은 JSON 객체 배열 형태이거나 단일 객체일 수 있음
        // 텍스트 추출 시도
        try {
            // ✅ 개선된 정규식: 이스케이프된 따옴표(\")를 올바르게 처리함
            const textMatches = chunk.match(/"text":\s*"((?:[^"\\]|\\.)*)"/g);
            if (textMatches) {
                textMatches.forEach(match => {
                    const textMatch = match.match(/"text":\s*"((?:[^"\\]|\\.)*)"/);
                    if (textMatch) {
                        const text = textMatch[1];
                        // 유니코드 이스케이프 및 특수 문자 해제
                        const decodedText = text
                            .replace(/\\n/g, '\n')
                            .replace(/\\"/g, '"')
                            .replace(/\\\\/g, '\\')
                            .replace(/\\r/g, '\r')
                            .replace(/\\t/g, '\t');
                        fullText += decodedText;
                        if (onChunk) onChunk(decodedText, fullText);
                    }
                });
            }
        } catch (e) {
            console.warn("Chunk parse error:", e);
        }
    }

    return fullText;
}

/**
 * 지수 백오프를 포함한 Gemini API 요청 함수
 */
export async function geminiRequest(prompt, { maxRetries = 3, useSearch = false, systemInstruction = "" } = {}) {
    if (!GEMINI_KEY) throw new Error('No API key');

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const generationConfig = {
                temperature: 0.1
            };

            const body = {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig
            };

            if (useSearch) {
                body.tools = [{ google_search: {} }];
            } else {
                // Search 사용 안 할 때만 JSON 모드 활성화 (API 제약 사항)
                generationConfig.response_mime_type = "application/json";
            }

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
    if (!raw) throw new Error("입력 데이터가 비어 있습니다.");

    // 1. 전처기: 앞뒤 공백 제거 및 불필요한 이스케이프 제거 시도
    let cleaned = raw.trim();

    try {
        // 2. MD 코드 블록 추출 시도 (가장 긴 블록 선정)
        const codeBlocks = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/g);
        if (codeBlocks) {
            // 가장 긴 코드 블록을 사용하여 불완전한 파싱 방지
            const sortedBlocks = codeBlocks
                .map(b => b.replace(/```(?:json)?\s*/, '').replace(/```$/, '').trim())
                .sort((a, b) => b.length - a.length);

            for (const block of sortedBlocks) {
                try {
                    return JSON.parse(block);
                } catch (e) { continue; }
            }
        }

        // 3. 순수 JSON 문자열 파싱 시도
        try {
            return JSON.parse(cleaned);
        } catch (e) { }

        // 4. {} 또는 [] 패턴 추출 시도 (가장 넓은 범위)
        // ⚠️ JSON 모드가 꺼져있을 때(Search 사용 시) 모델이 설명을 덧붙이는 경우를 대비
        const firstCurly = cleaned.indexOf('{');
        const lastCurly = cleaned.lastIndexOf('}');
        const firstSquare = cleaned.indexOf('[');
        const lastSquare = cleaned.lastIndexOf(']');

        // 가장 바깥쪽의 {} 또는 [] 범위를 찾아 시도
        let potentialJSON = "";
        if (firstCurly !== -1 && lastCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
            potentialJSON = cleaned.substring(firstCurly, lastCurly + 1);
        } else if (firstSquare !== -1 && lastSquare !== -1) {
            potentialJSON = cleaned.substring(firstSquare, lastSquare + 1);
        }

        if (potentialJSON) {
            try {
                return JSON.parse(potentialJSON);
            } catch (e) {
                // 특정 노이즈 제거 후 재시도 (예: \\\\ 이나 ```json 반복)
                const polished = potentialJSON
                    .replace(/\\`/g, '`') // 잘못된 이스케이프
                    .replace(/```json/g, '') // 중첩된 코드 블록 표시기 제거
                    .replace(/```/g, '')
                    .trim();

                try {
                    return JSON.parse(polished);
                } catch (e2) { }
            }
        }

        throw new Error("JSON 구조를 찾을 수 없습니다. 응답 내용: " + (cleaned.length > 100 ? cleaned.substring(0, 100) + "..." : cleaned));
    } catch (e) {
        console.error("JSON Parsing Error original content:", raw);
        throw new Error("JSON 파싱 실패: " + e.message);
    }
}

/**
 * 요청 큐 (동시 Gemini 호출 방지 및 딜레이 보장)
 * ✅ 속도 최적화: 병렬 처리(최대 2개) 및 딜레이 단축(200ms)
 */
const requestQueue = [];
let activeRequests = 0;
const MAX_CONCURRENT = 5;
const QUEUE_DELAY = 50;

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
