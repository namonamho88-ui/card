/**
 * HuggingFace Models API에서 카테고리별 AI 모델 데이터를 수집하여
 * src/data/aiDirectory.json 으로 저장하는 스크립트
 *
 * 실행: node scripts/fetchAIDirectory.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HF_API = 'https://huggingface.co/api/models';

// ──────────────────────────────────────────
// 카테고리 정의
// ──────────────────────────────────────────
const AI_CATEGORIES = {
    "자연어 처리 (NLP)": {
        icon: "💬",
        description: "텍스트를 이해하고 생성하는 AI 기술",
        tasks: [
            { tag: "text-generation", label: "텍스트 생성", desc: "ChatGPT, Claude 등 대화형 AI", icon: "chat" },
            { tag: "text-classification", label: "텍스트 분류", desc: "감성 분석, 스팸 필터링", icon: "label" },
            { tag: "summarization", label: "요약", desc: "긴 문서를 핵심만 추출", icon: "summarize" },
            { tag: "translation", label: "번역", desc: "다국어 자동 번역", icon: "translate" },
            { tag: "question-answering", label: "질의응답", desc: "문서 기반 질문에 답변", icon: "help" },
            { tag: "token-classification", label: "개체명 인식", desc: "사람·장소·조직 등 추출", icon: "sell" },
            { tag: "sentence-similarity", label: "문장 유사도", desc: "두 문장의 의미적 유사도 비교", icon: "compare" },
            { tag: "fill-mask", label: "빈칸 채우기", desc: "문맥 이해하여 빈칸 예측", icon: "edit_note" },
            { tag: "zero-shot-classification", label: "제로샷 분류", desc: "학습 없이 새 카테고리 분류", icon: "auto_awesome" },
        ]
    },
    "이미지 & 비전": {
        icon: "👁️",
        description: "이미지와 영상을 이해하고 생성하는 AI 기술",
        tasks: [
            { tag: "text-to-image", label: "텍스트→이미지", desc: "Stable Diffusion, DALL-E 등", icon: "image" },
            { tag: "image-classification", label: "이미지 분류", desc: "사진 속 대상 식별", icon: "photo_library" },
            { tag: "object-detection", label: "객체 탐지", desc: "사진에서 물체 위치 인식", icon: "center_focus_strong" },
            { tag: "image-segmentation", label: "이미지 분할", desc: "픽셀 단위로 영역 구분", icon: "grid_on" },
            { tag: "image-to-text", label: "이미지→텍스트", desc: "이미지 설명 자동 생성", icon: "description" },
            { tag: "image-to-image", label: "이미지 변환", desc: "스타일 변환, 초해상도", icon: "transform" },
            { tag: "text-to-video", label: "텍스트→영상", desc: "텍스트로 영상 자동 생성", icon: "movie" },
            { tag: "depth-estimation", label: "깊이 추정", desc: "2D 이미지에서 3D 깊이 추정", icon: "layers" },
            { tag: "text-to-3d", label: "텍스트→3D", desc: "텍스트로 3D 모델 생성", icon: "view_in_ar" },
        ]
    },
    "음성 & 오디오": {
        icon: "🎵",
        description: "음성 인식, 합성, 오디오 처리 AI 기술",
        tasks: [
            { tag: "automatic-speech-recognition", label: "음성 인식 (STT)", desc: "음성을 텍스트로 변환", icon: "mic" },
            { tag: "text-to-speech", label: "음성 합성 (TTS)", desc: "텍스트를 음성으로 변환", icon: "record_voice_over" },
            { tag: "audio-classification", label: "오디오 분류", desc: "소리 종류 자동 식별", icon: "music_note" },
            { tag: "audio-to-audio", label: "오디오 변환", desc: "노이즈 제거, 음성 분리", icon: "graphic_eq" },
        ]
    },
    "멀티모달": {
        icon: "🔗",
        description: "텍스트+이미지+음성 등 여러 형태를 결합하는 AI",
        tasks: [
            { tag: "any-to-any", label: "범용 멀티모달", desc: "입출력 형태를 자유롭게 조합", icon: "hub" },
            { tag: "image-text-to-text", label: "이미지+텍스트→답변", desc: "GPT-4V 등 이미지 이해 AI", icon: "visibility" },
            { tag: "visual-question-answering", label: "시각 질의응답", desc: "이미지에 대한 질문 답변", icon: "contact_support" },
            { tag: "document-question-answering", label: "문서 질의응답", desc: "PDF/문서 내용 질문 답변", icon: "article" },
            { tag: "video-text-to-text", label: "영상 이해", desc: "영상 내용을 텍스트로 설명", icon: "videocam" },
        ]
    },
    "강화학습 & 기타": {
        icon: "🎮",
        description: "환경과 상호작용하며 학습하는 AI 및 기타 기술",
        tasks: [
            { tag: "reinforcement-learning", label: "강화학습", desc: "게임, 로봇, 의사결정 최적화", icon: "sports_esports" },
            { tag: "tabular-classification", label: "테이블 분류", desc: "정형 데이터 분류 예측", icon: "table_chart" },
            { tag: "tabular-regression", label: "테이블 회귀", desc: "정형 데이터 수치 예측", icon: "trending_up" },
            { tag: "feature-extraction", label: "임베딩 추출", desc: "데이터를 벡터로 변환", icon: "data_array" },
        ]
    }
};

// ──────────────────────────────────────────
// API Fetch 헬퍼
// ──────────────────────────────────────────
async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url);
            if (res.status === 429) {
                const wait = Math.pow(2, i + 1) * 1000;
                console.log(`  ⏳ Rate limited, waiting ${wait / 1000}s...`);
                await new Promise(r => setTimeout(r, wait));
                continue;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            if (i === retries - 1) throw e;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

function formatModel(m) {
    return {
        id: m.modelId || m.id || '',
        downloads: m.downloads || 0,
        likes: m.likes || 0,
        library: m.library_name || null,
        lastModified: m.lastModified || null,
        url: `https://huggingface.co/${m.modelId || m.id}`
    };
}

function formatNumber(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
}

// ──────────────────────────────────────────
// 메인 수집 로직
// ──────────────────────────────────────────
async function main() {
    console.log('🚀 AI Directory 데이터 수집 시작...\n');
    const startTime = Date.now();

    const result = {
        updatedAt: new Date().toISOString(),
        categories: {}
    };

    for (const [catName, cat] of Object.entries(AI_CATEGORIES)) {
        console.log(`📂 ${cat.icon} ${catName}`);
        result.categories[catName] = {
            icon: cat.icon,
            description: cat.description,
            tasks: []
        };

        for (const task of cat.tasks) {
            // 과부하 방지 딜레이
            await new Promise(r => setTimeout(r, 400));

            try {
                // 트렌딩 TOP 5 (likes로 대체)
                const trending = await fetchWithRetry(
                    `${HF_API}?pipeline_tag=${task.tag}&sort=likes&direction=-1&limit=5`
                );
                // 다운로드 TOP 5
                const popular = await fetchWithRetry(
                    `${HF_API}?pipeline_tag=${task.tag}&sort=downloads&direction=-1&limit=5`
                );

                // 전체 모델 수 추정 (1개만 요청하여 응답 헤더 또는 배열에서)
                let totalCount = null;
                try {
                    const countRes = await fetch(`${HF_API}?pipeline_tag=${task.tag}&limit=1`);
                    const countData = await countRes.json();
                    // HF API는 별도 total을 주지 않으므로, 태스크 페이지의 정보를 하드코딩 보완
                    totalCount = countData.length >= 1 ? '1,000+' : '0';
                } catch { }

                const taskData = {
                    tag: task.tag,
                    label: task.label,
                    desc: task.desc,
                    icon: task.icon,
                    totalModels: totalCount,
                    trending: trending.map(formatModel).slice(0, 5),
                    popular: popular.map(formatModel).slice(0, 5),
                };

                result.categories[catName].tasks.push(taskData);
                console.log(`  ✅ ${task.label} (${task.tag}) — trending: ${trending.length}, popular: ${popular.length}`);

            } catch (err) {
                console.error(`  ❌ ${task.label} (${task.tag}): ${err.message}`);
                result.categories[catName].tasks.push({
                    tag: task.tag,
                    label: task.label,
                    desc: task.desc,
                    icon: task.icon,
                    totalModels: null,
                    trending: [],
                    popular: [],
                    error: err.message
                });
            }
        }
        console.log('');
    }

    // ──────────────────────────────────────────
    // JSON 파일로 저장
    // ──────────────────────────────────────────
    const outputPath = path.resolve(__dirname, '..', 'src', 'data', 'aiDirectory.json');
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const totalTasks = Object.values(result.categories).reduce((sum, c) => sum + c.tasks.length, 0);

    console.log(`✨ 완료! ${totalTasks}개 태스크 수집 (${elapsed}s)`);
    console.log(`📁 저장: ${outputPath}`);
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
