// 6개 카드사의 인기 상품 데이터 (각 10종, 총 60종)
export const POPULAR_CARDS = [
    // 신한카드 (10종)
    {
        id: 'shinhan-1',
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
        categories: ['포인트', '일상', '적립']
    },
    {
        id: 'shinhan-2',
        issuer: '신한카드',
        name: '미스터라이프',
        color: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        annualFee: '15,000원',
        previousMonthSpending: '30만원',
        benefits: [
            '공과금 10% 할인',
            '편의점/병원 10% 할인',
            '온라인 쇼핑 5% 할인'
        ],
        categories: ['할인', '생활', '편의점']
    },
    {
        id: 'shinhan-3',
        issuer: '신한카드',
        name: 'Deep Oil',
        color: 'linear-gradient(135deg, #0046FF 0%, #0080FF 100%)',
        annualFee: '20,000원',
        previousMonthSpending: '40만원',
        benefits: [
            '주유 리터당 150원 할인',
            '자동차 정비 10% 할인',
            '하이패스 10% 할인'
        ],
        categories: ['주유', '자동차', '할인']
    },
    {
        id: 'shinhan-4',
        issuer: '신한카드',
        name: 'The Great',
        color: 'linear-gradient(135deg, #2C3E50 0%, #3498DB 100%)',
        annualFee: '30,000원',
        previousMonthSpending: '50만원',
        benefits: [
            '영화 예매 50% 할인 (월 2회)',
            'CGV/롯데시네마/메가박스 전용',
            '팝콘 콤보 30% 할인'
        ],
        categories: ['영화', '문화', '할인']
    },
    {
        id: 'shinhan-5',
        issuer: '신한카드',
        name: 'Deep Dream PLUS',
        color: 'linear-gradient(135deg, #0033CC 0%, #0055FF 100%)',
        annualFee: '25,000원',
        previousMonthSpending: '40만원',
        benefits: [
            '스타벅스 30% 할인',
            '카페 전문점 20% 할인',
            '베이커리 15% 할인'
        ],
        categories: ['카페', '스타벅스', '할인']
    },
    {
        id: 'shinhan-6',
        issuer: '신한카드',
        name: 'Mr.Life Woman',
        color: 'linear-gradient(135deg, #E91E63 0%, #F06292 100%)',
        annualFee: '18,000원',
        previousMonthSpending: '35만원',
        benefits: [
            '뷰티/화장품 20% 할인',
            '패션 15% 할인',
            '헤어샵 10% 할인'
        ],
        categories: ['뷰티', '패션', '할인']
    },
    {
        id: 'shinhan-7',
        issuer: '신한카드',
        name: 'Deep Eco',
        color: 'linear-gradient(135deg, #00695C 0%, #00897B 100%)',
        annualFee: '12,000원',
        previousMonthSpending: '25만원',
        benefits: [
            '대중교통 20% 할인',
            '따릉이/킥보드 30% 할인',
            '택시 10% 할인'
        ],
        categories: ['대중교통', '교통', '할인']
    },
    {
        id: 'shinhan-8',
        issuer: '신한카드',
        name: 'Deep On',
        color: 'linear-gradient(135deg, #5E35B1 0%, #7E57C2 100%)',
        annualFee: '15,000원',
        previousMonthSpending: '30만원',
        benefits: [
            '쿠팡/네이버쇼핑 7% 할인',
            '배달의민족 10% 할인',
            '온라인 쇼핑몰 5% 할인'
        ],
        categories: ['온라인', '쇼핑', '배달']
    },
    {
        id: 'shinhan-9',
        issuer: '신한카드',
        name: 'Deep Sky',
        color: 'linear-gradient(135deg, #1565C0 0%, #1976D2 100%)',
        annualFee: '35,000원',
        previousMonthSpending: '60만원',
        benefits: [
            '항공마일리지 2배 적립',
            '공항 라운지 무료 (연 10회)',
            '해외 결제 수수료 면제'
        ],
        categories: ['여행', '항공', '마일리지']
    },
    {
        id: 'shinhan-10',
        issuer: '신한카드',
        name: 'Deep Market',
        color: 'linear-gradient(135deg, #F57C00 0%, #FF9800 100%)',
        annualFee: '10,000원',
        previousMonthSpending: '20만원',
        benefits: [
            '이마트/홈플러스 5% 할인',
            '마트 전용 10% 할인',
            '식료품 7% 할인'
        ],
        categories: ['마트', '쇼핑', '할인']
    },

    // 현대카드 (10종)
    {
        id: 'hyundai-1',
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
        categories: ['포인트', '무료', '적립']
    },
    {
        id: 'hyundai-2',
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
        categories: ['체크', '무료', '수수료면제']
    },
    {
        id: 'hyundai-3',
        issuer: '현대카드',
        name: 'Purple',
        color: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
        annualFee: '20,000원',
        previousMonthSpending: '40만원',
        benefits: [
            '주유 리터당 200원 할인',
            '자동차 보험 5% 할인',
            '정비소 10% 할인'
        ],
        categories: ['주유', '자동차', '할인']
    },
    {
        id: 'hyundai-4',
        issuer: '현대카드',
        name: 'Red',
        color: 'linear-gradient(135deg, #C62828 0%, #E53935 100%)',
        annualFee: '25,000원',
        previousMonthSpending: '45만원',
        benefits: [
            '영화 예매 40% 할인',
            '공연/뮤지컬 20% 할인',
            '전시회 무료 입장 (월 1회)'
        ],
        categories: ['영화', '문화', '할인']
    },
    {
        id: 'hyundai-5',
        issuer: '현대카드',
        name: 'Green',
        color: 'linear-gradient(135deg, #2E7D32 0%, #388E3C 100%)',
        annualFee: '15,000원',
        previousMonthSpending: '30만원',
        benefits: [
            '스타벅스 25% 할인',
            '투썸플레이스 20% 할인',
            '카페베네 15% 할인'
        ],
        categories: ['카페', '스타벅스', '할인']
    },
    {
        id: 'hyundai-6',
        issuer: '현대카드',
        name: 'Blue',
        color: 'linear-gradient(135deg, #0277BD 0%, #0288D1 100%)',
        annualFee: '30,000원',
        previousMonthSpending: '50만원',
        benefits: [
            '해외 결제 1.5% 적립',
            '공항 라운지 연 6회',
            '여행자 보험 자동 가입'
        ],
        categories: ['여행', '해외', '적립']
    },
    {
        id: 'hyundai-7',
        issuer: '현대카드',
        name: 'X Edition',
        color: 'linear-gradient(135deg, #424242 0%, #616161 100%)',
        annualFee: '18,000원',
        previousMonthSpending: '35만원',
        benefits: [
            '온라인 쇼핑 8% 할인',
            '쿠팡/11번가 10% 할인',
            '배달앱 7% 할인'
        ],
        categories: ['온라인', '쇼핑', '배달']
    },
    {
        id: 'hyundai-8',
        issuer: '현대카드',
        name: 'T Edition',
        color: 'linear-gradient(135deg, #00838F 0%, #00ACC1 100%)',
        annualFee: '12,000원',
        previousMonthSpending: '25만원',
        benefits: [
            '대중교통 25% 할인',
            '지하철/버스 무제한',
            'T머니 자동충전 5% 할인'
        ],
        categories: ['대중교통', '교통', '할인']
    },
    {
        id: 'hyundai-9',
        issuer: '현대카드',
        name: 'S Edition',
        color: 'linear-gradient(135deg, #D32F2F 0%, #F44336 100%)',
        annualFee: '22,000원',
        previousMonthSpending: '40만원',
        benefits: [
            '편의점 15% 할인',
            'GS25/CU/세븐일레븐 전용',
            '택배 서비스 10% 할인'
        ],
        categories: ['편의점', '생활', '할인']
    },
    {
        id: 'hyundai-10',
        issuer: '현대카드',
        name: 'K Edition',
        color: 'linear-gradient(135deg, #F57F17 0%, #FBC02D 100%)',
        annualFee: '15,000원',
        previousMonthSpending: '30만원',
        benefits: [
            '마트 전체 7% 할인',
            '코스트코 5% 할인',
            '식료품 10% 할인'
        ],
        categories: ['마트', '쇼핑', '할인']
    },

    // 삼성카드 (10종)
    {
        id: 'samsung-1',
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
        categories: ['할인', '일상', '편의점']
    },
    {
        id: 'samsung-2',
        issuer: '삼성카드',
        name: 'iD',
        color: 'linear-gradient(135deg, #0F4C81 0%, #1E5A8E 100%)',
        annualFee: '15,000원',
        previousMonthSpending: '30만원',
        benefits: [
            '온라인쇼핑 7% 할인',
            '배달앱 10% 할인',
            '넷플릭스/유튜브 프리미엄 무료'
        ],
        categories: ['할인', '디지털', '온라인']
    },
    {
        id: 'samsung-3',
        issuer: '삼성카드',
        name: 'taptap S',
        color: 'linear-gradient(135deg, #1565C0 0%, #1976D2 100%)',
        annualFee: '20,000원',
        previousMonthSpending: '40만원',
        benefits: [
            '주유 리터당 180원 할인',
            '세차 30% 할인',
            '자동차 용품 15% 할인'
        ],
        categories: ['주유', '자동차', '할인']
    },
    {
        id: 'samsung-4',
        issuer: '삼성카드',
        name: 'iD MOVIE',
        color: 'linear-gradient(135deg, #4A148C 0%, #6A1B9A 100%)',
        annualFee: '25,000원',
        previousMonthSpending: '45만원',
        benefits: [
            '영화 예매 45% 할인 (월 3회)',
            '팝콘 콤보 무료',
            'IMAX/4DX 20% 할인'
        ],
        categories: ['영화', '문화', '할인']
    },
    {
        id: 'samsung-5',
        issuer: '삼성카드',
        name: 'taptap CAFE',
        color: 'linear-gradient(135deg, #5D4037 0%, #6D4C41 100%)',
        annualFee: '18,000원',
        previousMonthSpending: '35만원',
        benefits: [
            '스타벅스 35% 할인',
            '이디야 40% 할인',
            '카페 전문점 25% 할인'
        ],
        categories: ['카페', '스타벅스', '할인']
    },
    {
        id: 'samsung-6',
        issuer: '삼성카드',
        name: 'iD SHOPPING',
        color: 'linear-gradient(135deg, #AD1457 0%, #C2185B 100%)',
        annualFee: '15,000원',
        previousMonthSpending: '30만원',
        benefits: [
            '백화점 10% 할인',
            '아울렛 15% 할인',
            '패션 브랜드 20% 할인'
        ],
        categories: ['쇼핑', '패션', '할인']
    },
    {
        id: 'samsung-7',
        issuer: '삼성카드',
        name: 'taptap GLOBAL',
        color: 'linear-gradient(135deg, #00695C 0%, #00897B 100%)',
        annualFee: '35,000원',
        previousMonthSpending: '60만원',
        benefits: [
            '해외 결제 2% 적립',
            '공항 라운지 연 12회',
            '해외 ATM 수수료 면제'
        ],
        categories: ['여행', '해외', '적립']
    },
    {
        id: 'samsung-8',
        issuer: '삼성카드',
        name: 'iD DELIVERY',
        color: 'linear-gradient(135deg, #E65100 0%, #F57C00 100%)',
        annualFee: '12,000원',
        previousMonthSpending: '25만원',
        benefits: [
            '배달의민족 15% 할인',
            '쿠팡이츠 12% 할인',
            '요기요 10% 할인'
        ],
        categories: ['배달', '음식', '할인']
    },
    {
        id: 'samsung-9',
        issuer: '삼성카드',
        name: 'taptap METRO',
        color: 'linear-gradient(135deg, #1A237E 0%, #283593 100%)',
        annualFee: '10,000원',
        previousMonthSpending: '20만원',
        benefits: [
            '지하철/버스 30% 할인',
            '택시 15% 할인',
            'T머니 충전 5% 할인'
        ],
        categories: ['대중교통', '교통', '할인']
    },
    {
        id: 'samsung-10',
        issuer: '삼성카드',
        name: 'iD MARKET',
        color: 'linear-gradient(135deg, #558B2F 0%, #689F38 100%)',
        annualFee: '13,000원',
        previousMonthSpending: '28만원',
        benefits: [
            '이마트 8% 할인',
            '홈플러스 7% 할인',
            '롯데마트 6% 할인'
        ],
        categories: ['마트', '쇼핑', '할인']
    },

    // 우리카드 (10종)
    {
        id: 'woori-1',
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
        categories: ['할인', '단순', '일상']
    },
    {
        id: 'woori-2',
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
        categories: ['포인트', '여행', '적립']
    },
    {
        id: 'woori-3',
        issuer: '우리카드',
        name: '위비 모바일',
        color: 'linear-gradient(135deg, #00838F 0%, #00ACC1 100%)',
        annualFee: '10,000원',
        previousMonthSpending: '25만원',
        benefits: [
            '통신비 10% 할인',
            '넷플릭스/유튜브 프리미엄 50% 할인',
            '온라인 쇼핑 5% 할인'
        ],
        categories: ['통신', '디지털', '할인']
    },
    {
        id: 'woori-4',
        issuer: '우리카드',
        name: '위비 주유',
        color: 'linear-gradient(135deg, #1565C0 0%, #1976D2 100%)',
        annualFee: '18,000원',
        previousMonthSpending: '35만원',
        benefits: [
            '주유 리터당 170원 할인',
            '자동차 정비 12% 할인',
            '세차 20% 할인'
        ],
        categories: ['주유', '자동차', '할인']
    },
    {
        id: 'woori-5',
        issuer: '우리카드',
        name: '위비 영화',
        color: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
        annualFee: '20,000원',
        previousMonthSpending: '40만원',
        benefits: [
            '영화 예매 50% 할인 (월 4회)',
            '팝콘 세트 무료',
            'CGV 골드클래스 30% 할인'
        ],
        categories: ['영화', '문화', '할인']
    },
    {
        id: 'woori-6',
        issuer: '우리카드',
        name: '위비 카페',
        color: 'linear-gradient(135deg, #4E342E 0%, #5D4037 100%)',
        annualFee: '15,000원',
        previousMonthSpending: '30만원',
        benefits: [
            '스타벅스 28% 할인',
            '커피빈 25% 할인',
            '카페 전문점 20% 할인'
        ],
        categories: ['카페', '스타벅스', '할인']
    },
    {
        id: 'woori-7',
        issuer: '우리카드',
        name: '위비 트래블',
        color: 'linear-gradient(135deg, #00695C 0%, #00897B 100%)',
        annualFee: '30,000원',
        previousMonthSpending: '50만원',
        benefits: [
            '항공권 5% 할인',
            '호텔 10% 할인',
            '공항 라운지 연 8회'
        ],
        categories: ['여행', '항공', '할인']
    },
    {
        id: 'woori-8',
        issuer: '우리카드',
        name: '위비 배달',
        color: 'linear-gradient(135deg, #F57C00 0%, #FF9800 100%)',
        annualFee: '13,000원',
        previousMonthSpending: '28만원',
        benefits: [
            '배달앱 전체 12% 할인',
            '배달의민족 15% 할인',
            '쿠팡이츠 10% 할인'
        ],
        categories: ['배달', '음식', '할인']
    },
    {
        id: 'woori-9',
        issuer: '우리카드',
        name: '위비 교통',
        color: 'linear-gradient(135deg, #1A237E 0%, #283593 100%)',
        annualFee: '11,000원',
        previousMonthSpending: '22만원',
        benefits: [
            '대중교통 22% 할인',
            '택시 12% 할인',
            '따릉이 30% 할인'
        ],
        categories: ['대중교통', '교통', '할인']
    },
    {
        id: 'woori-10',
        issuer: '우리카드',
        name: '위비 마트',
        color: 'linear-gradient(135deg, #558B2F 0%, #689F38 100%)',
        annualFee: '14,000원',
        previousMonthSpending: '30만원',
        benefits: [
            '이마트/홈플러스 6% 할인',
            '코스트코 4% 할인',
            '식료품 8% 할인'
        ],
        categories: ['마트', '쇼핑', '할인']
    },

    // 하나카드 (10종)
    {
        id: 'hana-1',
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
        categories: ['포인트', '일상', '적립']
    },
    {
        id: 'hana-2',
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
        categories: ['할인', '주유', '교통']
    },
    {
        id: 'hana-3',
        issuer: '하나카드',
        name: 'Viva G',
        color: 'linear-gradient(135deg, #00695C 0%, #00897B 100%)',
        annualFee: '25,000원',
        previousMonthSpending: '45만원',
        benefits: [
            '주유 리터당 200원 할인',
            '자동차 보험 7% 할인',
            '정비소 15% 할인'
        ],
        categories: ['주유', '자동차', '할인']
    },
    {
        id: 'hana-4',
        issuer: '하나카드',
        name: 'Viva M',
        color: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
        annualFee: '22,000원',
        previousMonthSpending: '42만원',
        benefits: [
            '영화 예매 42% 할인',
            '공연/전시 25% 할인',
            '도서 구매 20% 할인'
        ],
        categories: ['영화', '문화', '할인']
    },
    {
        id: 'hana-5',
        issuer: '하나카드',
        name: 'Viva C',
        color: 'linear-gradient(135deg, #5D4037 0%, #6D4C41 100%)',
        annualFee: '17,000원',
        previousMonthSpending: '33만원',
        benefits: [
            '스타벅스 32% 할인',
            '할리스 28% 할인',
            '카페 전문점 22% 할인'
        ],
        categories: ['카페', '스타벅스', '할인']
    },
    {
        id: 'hana-6',
        issuer: '하나카드',
        name: '1Q SHOPPING',
        color: 'linear-gradient(135deg, #C2185B 0%, #D81B60 100%)',
        annualFee: '16,000원',
        previousMonthSpending: '32만원',
        benefits: [
            '온라인 쇼핑 9% 할인',
            '쿠팡 12% 할인',
            'G마켓/옥션 10% 할인'
        ],
        categories: ['온라인', '쇼핑', '할인']
    },
    {
        id: 'hana-7',
        issuer: '하나카드',
        name: '1Q TRAVEL',
        color: 'linear-gradient(135deg, #0277BD 0%, #0288D1 100%)',
        annualFee: '32,000원',
        previousMonthSpending: '55만원',
        benefits: [
            '항공마일리지 1.8배 적립',
            '호텔 15% 할인',
            '공항 라운지 연 10회'
        ],
        categories: ['여행', '항공', '마일리지']
    },
    {
        id: 'hana-8',
        issuer: '하나카드',
        name: 'Viva D',
        color: 'linear-gradient(135deg, #E65100 0%, #F57C00 100%)',
        annualFee: '14,000원',
        previousMonthSpending: '29만원',
        benefits: [
            '배달앱 전체 13% 할인',
            '배달의민족 17% 할인',
            '요기요 12% 할인'
        ],
        categories: ['배달', '음식', '할인']
    },
    {
        id: 'hana-9',
        issuer: '하나카드',
        name: '1Q METRO',
        color: 'linear-gradient(135deg, #283593 0%, #3949AB 100%)',
        annualFee: '12,000원',
        previousMonthSpending: '24만원',
        benefits: [
            '지하철/버스 28% 할인',
            '택시 18% 할인',
            'T머니 자동충전 7% 할인'
        ],
        categories: ['대중교통', '교통', '할인']
    },
    {
        id: 'hana-10',
        issuer: '하나카드',
        name: 'Viva MART',
        color: 'linear-gradient(135deg, #689F38 0%, #7CB342 100%)',
        annualFee: '15,000원',
        previousMonthSpending: '31만원',
        benefits: [
            '이마트 9% 할인',
            '홈플러스 8% 할인',
            '코스트코 5% 할인'
        ],
        categories: ['마트', '쇼핑', '할인']
    },

    // 롯데카드 (10종)
    {
        id: 'lotte-1',
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
        categories: ['할인', '쇼핑', '뷰티']
    },
    {
        id: 'lotte-2',
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
        categories: ['마일리지', '여행', '항공']
    },
    {
        id: 'lotte-3',
        issuer: '롯데카드',
        name: 'Red Oil',
        color: 'linear-gradient(135deg, #B71C1C 0%, #D32F2F 100%)',
        annualFee: '19,000원',
        previousMonthSpending: '38만원',
        benefits: [
            '주유 리터당 160원 할인',
            '세차 25% 할인',
            '자동차 용품 12% 할인'
        ],
        categories: ['주유', '자동차', '할인']
    },
    {
        id: 'lotte-4',
        issuer: '롯데카드',
        name: 'Cinema',
        color: 'linear-gradient(135deg, #4A148C 0%, #6A1B9A 100%)',
        annualFee: '23,000원',
        previousMonthSpending: '43만원',
        benefits: [
            '롯데시네마 50% 할인 (월 5회)',
            '팝콘 콤보 무료',
            'IMAX 30% 할인'
        ],
        categories: ['영화', '문화', '할인']
    },
    {
        id: 'lotte-5',
        issuer: '롯데카드',
        name: 'Cafe',
        color: 'linear-gradient(135deg, #4E342E 0%, #5D4037 100%)',
        annualFee: '16,000원',
        previousMonthSpending: '32만원',
        benefits: [
            '스타벅스 30% 할인',
            '엔제리너스 35% 할인',
            '카페 전문점 23% 할인'
        ],
        categories: ['카페', '스타벅스', '할인']
    },
    {
        id: 'lotte-6',
        issuer: '롯데카드',
        name: 'Smart',
        color: 'linear-gradient(135deg, #1565C0 0%, #1976D2 100%)',
        annualFee: '14,000원',
        previousMonthSpending: '29만원',
        benefits: [
            '온라인 쇼핑 8% 할인',
            '롯데ON 12% 할인',
            '11번가 10% 할인'
        ],
        categories: ['온라인', '쇼핑', '할인']
    },
    {
        id: 'lotte-7',
        issuer: '롯데카드',
        name: 'Global',
        color: 'linear-gradient(135deg, #00695C 0%, #00897B 100%)',
        annualFee: '33,000원',
        previousMonthSpending: '58만원',
        benefits: [
            '해외 결제 2.5% 적립',
            '공항 라운지 연 15회',
            '해외 ATM 수수료 전액 면제'
        ],
        categories: ['여행', '해외', '적립']
    },
    {
        id: 'lotte-8',
        issuer: '롯데카드',
        name: 'Delivery',
        color: 'linear-gradient(135deg, #F57C00 0%, #FF9800 100%)',
        annualFee: '13,000원',
        previousMonthSpending: '27만원',
        benefits: [
            '배달앱 전체 14% 할인',
            '배달의민족 18% 할인',
            '쿠팡이츠 13% 할인'
        ],
        categories: ['배달', '음식', '할인']
    },
    {
        id: 'lotte-9',
        issuer: '롯데카드',
        name: 'Metro',
        color: 'linear-gradient(135deg, #1A237E 0%, #283593 100%)',
        annualFee: '11,000원',
        previousMonthSpending: '23만원',
        benefits: [
            '지하철/버스 26% 할인',
            '택시 16% 할인',
            '카카오T 20% 할인'
        ],
        categories: ['대중교통', '교통', '할인']
    },
    {
        id: 'lotte-10',
        issuer: '롯데카드',
        name: 'Mart',
        color: 'linear-gradient(135deg, #558B2F 0%, #689F38 100%)',
        annualFee: '15,000원',
        previousMonthSpending: '30만원',
        benefits: [
            '롯데마트 10% 할인',
            '이마트 7% 할인',
            '식료품 전체 8% 할인'
        ],
        categories: ['마트', '쇼핑', '할인']
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

// 혜택 비교 함수 (개선됨)
export function findCardByBenefits(query) {
    const lowerQuery = query.toLowerCase();

    // 키워드 매칭
    const keywords = {
        '스타벅스': ['스타벅스', '카페'],
        '카페': ['카페', '커피', '스타벅스'],
        '커피': ['카페', '커피', '스타벅스'],
        '편의점': ['편의점'],
        '주유': ['주유'],
        '대중교통': ['대중교통', '교통', '지하철', '버스'],
        '교통': ['대중교통', '교통'],
        '쇼핑': ['쇼핑', '온라인'],
        '온라인': ['온라인', '쇼핑', '디지털'],
        '배달': ['배달', '음식'],
        '영화': ['영화', '문화'],
        '여행': ['여행', '항공', '마일리지', '해외'],
        '해외': ['해외', '여행'],
        '뷰티': ['뷰티', '화장품'],
        '패션': ['패션', '쇼핑'],
        '마트': ['마트', '쇼핑'],
        '자동차': ['자동차', '주유'],
        '택시': ['택시', '교통']
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

        // 할인율 추출 (숫자가 클수록 높은 점수)
        const discountMatch = benefitsText.match(/(\d+)%/);
        if (discountMatch) {
            score += parseInt(discountMatch[1]) / 10;
        }

        return { ...card, score };
    });

    // 점수순 정렬
    return scoredCards
        .filter(card => card.score > 0)
        .sort((a, b) => b.score - a.score);
}

// 카드사별 필터링
export function getCardsByIssuer(issuer) {
    if (issuer === '전체') {
        return POPULAR_CARDS;
    }
    return POPULAR_CARDS.filter(card => card.issuer === issuer);
}

// 카드사 목록
export const ISSUERS = ['전체', '신한카드', '현대카드', '삼성카드', '우리카드', '하나카드', '롯데카드'];
