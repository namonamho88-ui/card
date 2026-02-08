import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const PH_TOKEN = process.env.PRODUCTHUNT_TOKEN || '';

// ──────────────────────────────────────────
// 1. Product Hunt — 오늘의 신규 AI 제품
// ──────────────────────────────────────────
async function fetchProductHuntAI() {
    if (!PH_TOKEN) {
        console.log('⚠️  PRODUCTHUNT_TOKEN 없음, 스킵');
        return [];
    }

    const query = `{
    posts(order: VOTES, topic: "artificial-intelligence", first: 10) {
      edges {
        node {
          name
          tagline
          url
          votesCount
          createdAt
          topics(first: 3) {
            edges {
              node { name }
            }
          }
        }
      }
    }
  }`;

    try {
        const res = await fetch('https://api.producthunt.com/v2/api/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PH_TOKEN}`
            },
            body: JSON.stringify({ query })
        });

        if (!res.ok) throw new Error(`PH API ${res.status}`);
        const data = await res.json();

        return (data.data?.posts?.edges || []).map(({ node }) => ({
            name: node.name,
            tagline: node.tagline,
            url: node.url,
            votesCount: node.votesCount,
            topics: node.topics?.edges?.map(e => e.node.name) || [],
            launchedAt: node.createdAt?.split('T')[0]
        }));
    } catch (err) {
        console.error('❌ Product Hunt:', err.message);
        return [];
    }
}

// ──────────────────────────────────────────
// 2. HuggingFace Daily Papers — AI 논문 트렌딩
// ──────────────────────────────────────────
async function fetchHFDailyPapers() {
    try {
        const res = await fetch('https://huggingface.co/api/daily_papers?limit=5');
        if (!res.ok) throw new Error(`HF API ${res.status}`);
        const papers = await res.json();

        return papers.map(p => ({
            title: p.paper?.title || '',
            summary: (p.paper?.summary || '').substring(0, 150) + '...',
            upvotes: p.paper?.upvotes || 0,
            authors: (p.paper?.authors || []).slice(0, 3).map(a => a?.name || ''),
            url: `https://huggingface.co/papers/${p.paper?.id}`
        }));
    } catch (err) {
        console.error('❌ HF Papers:', err.message);
        return [];
    }
}

// ──────────────────────────────────────────
// 3. Gemini — 한국어 인사이트 생성
// ──────────────────────────────────────────
async function generateInsight(newProducts, papers) {
    if (!GEMINI_KEY) {
        console.log('⚠️  GEMINI_API_KEY 없음, 기본 인사이트 사용');
        return null;
    }

    const productList = newProducts.slice(0, 5)
        .map(p => `${p.name}: ${p.tagline} (투표 ${p.votesCount})`).join('\n');
    const paperList = papers.slice(0, 3)
        .map(p => `${p.title} (추천 ${p.upvotes})`).join('\n');

    const prompt = `당신은 AI 업계 트렌드 분석가입니다.

오늘 Product Hunt에 새로 출시된 AI 제품:
${productList || '(데이터 없음)'}

오늘 HuggingFace 트렌딩 논문:
${paperList || '(데이터 없음)'}

위 데이터를 바탕으로:
1. 오늘의 AI 업계 핵심 동향을 4~5문장 한국어로 요약
2. 일반 사무직 직원이 이해할 수 있는 쉬운 표현 사용
3. 특별히 주목할 제품이나 논문이 있으면 언급
4. 마크다운 사용 금지, 순수 텍스트만 출력`;

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            }
        );
        if (!res.ok) throw new Error(`Gemini ${res.status}`);
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    } catch (err) {
        console.error('❌ Gemini:', err.message);
        return null;
    }
}

// ──────────────────────────────────────────
// 4. 기존 큐레이션 데이터 로드
// ──────────────────────────────────────────
function loadCuratedDirectory() {
    const filePath = path.resolve(__dirname, '..', 'src', 'data', 'aiTools.json');
    if (!fs.existsSync(filePath)) {
        console.log('⚠️  aiTools.json 없음');
        return [];
    }
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return raw.categories || [];
}

// ──────────────────────────────────────────
// 5. Gemini로 신규 제품 카테고리 자동 분류
// ──────────────────────────────────────────
async function categorizeProducts(products, existingCategories) {
    if (!GEMINI_KEY || products.length === 0) return products;

    const catNames = existingCategories.map(c => c.name).join(', ');
    const productList = products.map(p => `${p.name}: ${p.tagline}`).join('\n');

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `아래 AI 제품들을 다음 카테고리 중 하나로 분류해주세요.
카테고리: ${catNames}

제품 목록:
${productList}

출력 형식 (JSON 배열만, 다른 텍스트 없이):
[{"name":"제품명","category":"카테고리명"}]` }]
                    }]
                })
            }
        );
        if (!res.ok) return products;
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // JSON 추출
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return products;
        const categories = JSON.parse(jsonMatch[0]);

        return products.map(p => {
            const found = categories.find(c => c.name === p.name);
            return { ...p, category: found?.category || '기타' };
        });
    } catch {
        return products;
    }
}

// ──────────────────────────────────────────
// 메인
// ──────────────────────────────────────────
async function main() {
    console.log('🚀 AI Directory 데이터 수집 시작\n');

    // 병렬 수집
    const [newProducts, papers] = await Promise.all([
        fetchProductHuntAI(),
        fetchHFDailyPapers()
    ]);

    console.log(`📦 Product Hunt: ${newProducts.length}개 수집`);
    console.log(`📄 HF Papers: ${papers.length}개 수집\n`);

    // 기존 큐레이션 데이터
    const directory = loadCuratedDirectory();

    // Gemini로 카테고리 분류 & 인사이트 생성
    const categorizedProducts = await categorizeProducts(newProducts, directory);
    const insight = await generateInsight(newProducts, papers);

    // 최종 JSON 조립
    const output = {
        updatedAt: new Date().toISOString(),
        insight: insight || 'AI 업계의 최신 동향을 확인해보세요.',
        daily: {
            newProducts: categorizedProducts,
            trendingPapers: papers
        },
        directory: directory
    };

    // 저장
    const outputPath = path.resolve(__dirname, '..', 'src', 'data', 'aiDirectory.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

    console.log(`\n✅ 저장 완료: ${outputPath}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
