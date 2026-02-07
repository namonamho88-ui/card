import { cards as POPULAR_CARDS } from '../data/popularCards.json';

export const ISSUERS = ['전체', '신한카드', '현대카드', '삼성카드', '우리카드', '하나카드', '롯데카드'];

export const ISSUER_COLORS = {
    "신한카드": "linear-gradient(135deg, #0046FF 0%, #0066FF 100%)",
    "현대카드": "linear-gradient(135deg, #111111 0%, #333333 100%)",
    "삼성카드": "linear-gradient(135deg, #003366 0%, #0066cc 100%)",
    "우리카드": "linear-gradient(135deg, #004a99 0%, #0099ff 100%)",
    "하나카드": "linear-gradient(135deg, #004d40 0%, #009688 100%)",
    "롯데카드": "linear-gradient(135deg, #ED1C24 0%, #FF3333 100%)",
    "KB국민카드": "linear-gradient(135deg, #ffcc00 0%, #ffbb00 100%)",
    "NH농협카드": "linear-gradient(135deg, #00c73c 0%, #00a030 100%)",
    "IBK기업은행": "linear-gradient(135deg, #1865a9 0%, #104a80 100%)",
    "BC카드": "linear-gradient(135deg, #ec1e26 0%, #c4121a 100%)"
};

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function getCardsByIssuer(issuer) {
    if (issuer === '전체') {
        return shuffleArray(POPULAR_CARDS);
    }
    return POPULAR_CARDS.filter(card => card.issuer === issuer);
}

export function findCardByBenefits(query) {
    const keywords = {
        '카페': ['카페', '커피', '스타벅스', '이디야', '투썸', '할리스', '커피빈', '엔제리너스'],
        '편의점': ['편의점', 'GS25', 'CU', '세븐일레븐'],
        '주유': ['주유', '기름', '휘발유', '경유', '셀프주유'],
        '대중교통': ['대중교통', '지하철', '버스', '교통', '택시', '따릉이', '킥보드', 'T머니'],
        '쇼핑': ['쇼핑', '온라인', '쿠팡', '네이버', '11번가', 'G마켓', '옥션', '백화점', '아울렛'],
        '배달': ['배달', '배민', '배달의민족', '쿠팡이츠', '요기요', '음식'],
        '영화': ['영화', '시네마', 'CGV', '롯데시네마', '메가박스', 'IMAX', '4DX'],
        '여행': ['여행', '항공', '비행기', '호텔', '숙박', '해외', '공항', '라운지', '마일리지'],
        '뷰티': ['뷰티', '화장품', '헤어샵', '미용실'],
        '패션': ['패션', '옷', '의류', '브랜드'],
        '마트': ['마트', '이마트', '홈플러스', '롯데마트', '코스트코', '식료품'],
        '자동차': ['자동차', '정비', '세차', '보험', '용품'],
        '통신': ['통신', '통신비', '휴대폰', '인터넷'],
        '디지털': ['디지털', '넷플릭스', '유튜브', '스트리밍']
    };

    const queryLower = query.toLowerCase();
    const scoredCards = [];

    POPULAR_CARDS.forEach(card => {
        let score = 0;
        card.benefits.forEach(benefit => {
            const benefitLower = benefit.toLowerCase();
            Object.entries(keywords).forEach(([category, words]) => {
                words.forEach(word => {
                    if (queryLower.includes(word.toLowerCase())) {
                        if (benefitLower.includes(word.toLowerCase())) score += 10;
                        if (card.categories.some(cat => cat.includes(category))) score += 5;
                    }
                });
            });
            if (benefitLower.includes(queryLower)) score += 15;
            const discountMatch = benefit.match(/(\d+)%/);
            if (discountMatch) score += parseInt(discountMatch[1]) / 10;
        });

        if (score > 0) scoredCards.push({ card, score });
    });

    scoredCards.sort((a, b) => b.score - a.score);
    return scoredCards.map(item => item.card);
}
