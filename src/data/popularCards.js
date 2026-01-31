// 6개 카드사의 인기 상품 데이터
export const POPULAR_CARDS = [
    // 신한카드
    {
        id: 'shinhan-deep-dream',
        issuer: '신한카드',
        name: '딥 드림',
        color: 'linear-gradient(135deg, #0046FF 0%, #0066FF 100%)',
        annualFee: '15,000원',
        previousMonthSpending: '30만원',
        benefits: [
            '모든 가맹점 0.7% 적립',
            '드림 영역 2.1% 적립',
            '가장 많이 쓴 곳 최대 3.5% 적립'
        ],
        categories: ['포인트', '일상']
    },
    {
        id: 'shinhan-mr-life',
        issuer: '신한카드',
        name: '미스터라이프',
        color: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        annualFee: '15,000원',
        previousMonthSpending: '30만원',
        benefits: [
            '공과금 10% 할인',
            '편의점/병원 10% 할인',
            '온라인 쇼핑 할인'
        ],
        categories: ['할인', '생활']
    },

    // 현대카드
    {
        id: 'hyundai-m',
        issuer: '현대카드',
        name: 'M',
        color: 'linear-gradient(135deg, #111111 0%, #444444 100%)',
        annualFee: '없음',
        previousMonthSpending: '30만원',
        benefits: [
            '모든 가맹점 0.2~1% M포인트',
            '포인트 유효기간 없음',
            'M포인트몰 사용 가능'
        ],
        categories: ['포인트', '무료']
    },
    {
        id: 'hyundai-zero',
        issuer: '현대카드',
        name: 'Zero',
        color: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
        annualFee: '없음',
        previousMonthSpending: '없음',
        benefits: [
            'ATM 수수료 전액 면제',
            '해외 ATM 수수료 면제',
            '이체 수수료 면제'
        ],
        categories: ['체크', '무료']
    },

    // 삼성카드
    {
        id: 'samsung-taptap',
        issuer: '삼성카드',
        name: 'taptap O',
        color: 'linear-gradient(135deg, #003366 0%, #0066cc 100%)',
        annualFee: '없음',
        previousMonthSpending: '30만원',
        benefits: [
            '편의점 10% 할인',
            '대중교통 10% 할인',
            '카페 10% 할인'
        ],
        categories: ['할인', '일상']
    },
    {
        id: 'samsung-id',
        issuer: '삼성카드',
        name: 'iD',
        color: 'linear-gradient(135deg, #0F4C81 0%, #1E5A8E 100%)',
        annualFee: '15,000원',
        previousMonthSpending: '30만원',
        benefits: [
            '온라인쇼핑 7% 할인',
            '배달앱 10% 할인',
            '스트리밍 무료'
        ],
        categories: ['할인', '디지털']
    },

    // 우리카드
    {
        id: 'woori-everone',
        issuer: '우리카드',
        name: '에브리원',
        color: 'linear-gradient(135deg, #004a99 0%, #0099ff 100%)',
        annualFee: '12,000원',
        previousMonthSpending: '없음',
        benefits: [
            '모든 가맹점 1% 할인',
            '최대 2만원 추가 할인',
            '온라인 페이 결제 시 2% 할인'
        ],
        categories: ['할인', '단순']
    },
    {
        id: 'woori-card-classic',
        issuer: '우리카드',
        name: '카드의정석',
        color: 'linear-gradient(135deg, #0B7FC1 0%, #1A8FD1 100%)',
        annualFee: '15,000원',
        previousMonthSpending: '30만원',
        benefits: [
            '모든 가맹점 0.5% 적립',
            '온라인쇼핑 1% 적립',
            '해외 1.5% 적립'
        ],
        categories: ['포인트', '여행']
    },

    // 하나카드
    {
        id: 'hana-1q',
        issuer: '하나카드',
        name: '1Q',
        color: 'linear-gradient(135deg, #004d40 0%, #009688 100%)',
        annualFee: '15,000원',
        previousMonthSpending: '30만원',
        benefits: [
            '모든 가맹점 0.7% 적립',
            '온라인쇼핑 1% 적립',
            '해외 1.5% 적립'
        ],
        categories: ['포인트', '일상']
    },
    {
        id: 'hana-viva',
        issuer: '하나카드',
        name: 'Viva',
        color: 'linear-gradient(135deg, #008485 0%, #00A09A 100%)',
        annualFee: '20,000원',
        previousMonthSpending: '40만원',
        benefits: [
            '주유 리터당 120원 할인',
            '편의점 7% 할인',
            '대중교통 15% 할인'
        ],
        categories: ['할인', '주유']
    },

    // 롯데카드
    {
        id: 'lotte-pink',
        issuer: '롯데카드',
        name: 'Pink',
        color: 'linear-gradient(135deg, #7f0000 0%, #e60000 100%)',
        annualFee: '15,000원',
        previousMonthSpending: '30만원',
        benefits: [
            '뷰티 20% 할인',
            '패션 15% 할인',
            '카페 25% 할인'
        ],
        categories: ['할인', '쇼핑']
    },
    {
        id: 'lotte-sky',
        issuer: '롯데카드',
        name: 'Sky',
        color: 'linear-gradient(135deg, #ED1C24 0%, #FF3333 100%)',
        annualFee: '30,000원',
        previousMonthSpending: '50만원',
        benefits: [
            '항공마일리지 1.5배 적립',
            '공항 라운지 연 6회',
            '여행자보험 자동가입'
        ],
        categories: ['마일리지', '여행']
    }
];

// 카드사별 색상
export const ISSUER_COLORS = {
    '신한카드': '#0046FF',
    '현대카드': '#000000',
    '삼성카드': '#0F4C81',
    '우리카드': '#0B7FC1',
    '하나카드': '#008485',
    '롯데카드': '#ED1C24'
};

// 카드 검색 함수
export function findCardByBenefits(query) {
    const lowerQuery = query.toLowerCase();

    // 키워드 매칭
    const keywords = {
        '스타벅스': ['카페', '커피'],
        '카페': ['카페', '커피'],
        '커피': ['카페', '커피'],
        '편의점': ['편의점'],
        '주유': ['주유'],
        '대중교통': ['대중교통', '교통'],
        '쇼핑': ['쇼핑', '온라인'],
        '온라인': ['온라인', '쇼핑', '디지털'],
        '배달': ['배달'],
        '영화': ['영화'],
        '여행': ['여행', '항공', '마일리지'],
        '해외': ['해외', '여행'],
        '뷰티': ['뷰티'],
        '패션': ['패션']
    };

    // 쿼리에서 키워드 찾기
    let matchedKeywords = [];
    for (const [key, values] of Object.entries(keywords)) {
        if (lowerQuery.includes(key)) {
            matchedKeywords.push(...values);
        }
    }

    // 카드 점수 계산
    const scoredCards = POPULAR_CARDS.map(card => {
        let score = 0;
        const benefitsText = card.benefits.join(' ').toLowerCase();
        const categoriesText = card.categories.join(' ').toLowerCase();

        // 혜택 텍스트에서 키워드 매칭
        matchedKeywords.forEach(keyword => {
            if (benefitsText.includes(keyword)) score += 10;
            if (categoriesText.includes(keyword)) score += 5;
        });

        // 직접 쿼리 매칭
        if (benefitsText.includes(lowerQuery)) score += 15;

        return { ...card, score };
    });

    // 점수순 정렬
    return scoredCards
        .filter(card => card.score > 0)
        .sort((a, b) => b.score - a.score);
}
