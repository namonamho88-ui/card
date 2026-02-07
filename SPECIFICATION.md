# Space D AI 카드 에이전트 - 기능 명세서

## 📋 프로젝트 개요

**프로젝트명**: Space D AI 카드 에이전트  
**버전**: 1.0.0  
**목적**: 사용자의 소비 패턴에 맞는 최적의 신용카드를 추천하는 AI 기반 카드 추천 시스템  
**기술 스택**: React, Vite, Supabase (선택적)

---

## 🎯 핵심 기능

### 1. 카드 카탈로그 시스템

#### 1.1 카드사별 탭 네비게이션
- **기능**: 7개 탭을 통한 카드사별 필터링
- **탭 목록**:
  - 전체 (60종 전체 카드)
  - 신한카드 (10종)
  - 현대카드 (10종)
  - 삼성카드 (10종)
  - 우리카드 (10종)
  - 하나카드 (10종)
  - 롯데카드 (10종)

#### 1.2 카드 데이터 구조
```javascript
{
  id: string,              // 고유 식별자
  issuer: string,          // 카드사명
  name: string,            // 카드명
  color: string,           // 그라디언트 색상
  annualFee: string,       // 연회비
  previousMonthSpending: string,  // 전월 실적 조건
  benefits: string[],      // 주요 혜택 (3개)
  categories: string[]     // 카테고리 태그
}
```

#### 1.3 카드 그리드 레이아웃
- **데스크톱 (1400px 이상)**: 6열
- **대형 태블릿 (1200-1400px)**: 5열
- **태블릿 (900-1200px)**: 4열
- **소형 태블릿 (600-900px)**: 3열
- **모바일 (400-600px)**: 2열
- **소형 모바일 (400px 이하)**: 1열

---

### 2. 카드 상세 정보 모달

#### 2.1 표시 정보
- **카드 프리뷰**: 카드사별 브랜드 컬러 그라디언트
- **카드 정보**:
  - 연회비
  - 전월 실적 조건
- **주요 혜택**: 3가지 핵심 혜택
- **액션 버튼**: 카드 신청하기 (알림 표시)

#### 2.2 UI/UX
- 모달 외부 클릭 시 닫기
- ESC 키 지원 (브라우저 기본 동작)
- 스크롤 가능한 컨텐츠 영역
- 모바일 최적화 레이아웃

---

### 3. AI 카드 추천 챗봇

#### 3.1 추천 알고리즘
**키워드 매칭 시스템**:
```javascript
키워드 → 카테고리 매핑
- 스타벅스/카페/커피 → 카페
- 편의점 → 편의점
- 주유 → 주유
- 대중교통/지하철/버스 → 대중교통
- 쇼핑/온라인 → 쇼핑
- 배달/음식 → 배달
- 영화/문화 → 영화
- 여행/항공/해외 → 여행
- 뷰티/화장품 → 뷰티
- 패션 → 패션
- 마트 → 마트
- 자동차 → 자동차
- 택시 → 택시
```

**점수 계산 방식**:
1. 혜택 텍스트에 키워드 포함: +10점
2. 카테고리에 키워드 포함: +5점
3. 직접 쿼리 매칭: +15점
4. 할인율 추출: +(할인율/10)점

#### 3.2 응답 형식
```
**[카드사] [카드명]** 카드를 추천드립니다!

💳 **연회비**: [금액]
📊 **전월 실적**: [조건]

✨ **주요 혜택**:
1. [혜택1]
2. [혜택2]
3. [혜택3]

📋 **다른 추천 카드**:
2. [카드사] [카드명] (연회비: [금액])
3. [카드사] [카드명] (연회비: [금액])
4. [카드사] [카드명] (연회비: [금액])
```

#### 3.3 사용 예시
**입력**: "영화를 자주 보는데 제일 혜택 좋은 카드는?"

**출력**:
- 1순위: 우리카드 위비 영화 (50% 할인, 월 4회)
- 2순위: 롯데카드 Cinema (50% 할인, 월 5회)
- 3순위: 신한카드 The Great (50% 할인, 월 2회)
- 4순위: 삼성카드 iD MOVIE (45% 할인, 월 3회)

---

## 📊 데이터 명세

### 카드 데이터베이스 (60종)

#### 신한카드 (10종)
1. 딥 드림 - 포인트 적립형
2. 미스터라이프 - 생활 할인형
3. Deep Oil - 주유 전용
4. The Great - 영화 전용
5. Deep Dream PLUS - 카페 전용
6. Mr.Life Woman - 뷰티/패션
7. Deep Eco - 대중교통
8. Deep On - 온라인 쇼핑
9. Deep Sky - 여행/항공
10. Deep Market - 마트 전용

#### 현대카드 (10종)
1. M - 무료 포인트형
2. Zero - 수수료 면제형
3. Purple - 주유 전용
4. Red - 영화/문화
5. Green - 카페 전용
6. Blue - 해외 여행
7. X Edition - 온라인 쇼핑
8. T Edition - 대중교통
9. S Edition - 편의점
10. K Edition - 마트 전용

#### 삼성카드 (10종)
1. taptap O - 일상 할인
2. iD - 디지털 라이프
3. taptap S - 주유 전용
4. iD MOVIE - 영화 전용
5. taptap CAFE - 카페 전용
6. iD SHOPPING - 패션 쇼핑
7. taptap GLOBAL - 해외 여행
8. iD DELIVERY - 배달 전용
9. taptap METRO - 대중교통
10. iD MARKET - 마트 전용

#### 우리카드 (10종)
1. 에브리원 - 단순 할인형
2. 카드의정석 - 포인트 적립
3. 위비 모바일 - 통신비
4. 위비 주유 - 주유 전용
5. 위비 영화 - 영화 전용
6. 위비 카페 - 카페 전용
7. 위비 트래블 - 여행 전용
8. 위비 배달 - 배달 전용
9. 위비 교통 - 대중교통
10. 위비 마트 - 마트 전용

#### 하나카드 (10종)
1. 1Q - 포인트 적립형
2. Viva - 복합 할인형
3. Viva G - 주유 전용
4. Viva M - 영화/문화
5. Viva C - 카페 전용
6. 1Q SHOPPING - 온라인 쇼핑
7. 1Q TRAVEL - 여행/항공
8. Viva D - 배달 전용
9. 1Q METRO - 대중교통
10. Viva MART - 마트 전용

#### 롯데카드 (10종)
1. Pink - 뷰티/패션
2. Sky - 여행/마일리지
3. Red Oil - 주유 전용
4. Cinema - 영화 전용
5. Cafe - 카페 전용
6. Smart - 온라인 쇼핑
7. Global - 해외 여행
8. Delivery - 배달 전용
9. Metro - 대중교통
10. Mart - 마트 전용

---

## 🎨 UI/UX 명세

### 디자인 시스템

#### 색상 팔레트
```css
--bg-color: #0a0a0a;           /* 배경색 */
--text-color: #ffffff;          /* 기본 텍스트 */
--text-dim: #888888;            /* 보조 텍스트 */
--accent-color: #00f2fe;        /* 강조색 (네온 청록) */
--glass-bg: rgba(255,255,255,0.05);  /* 글래스모피즘 */
--glass-border: rgba(255,255,255,0.1);
```

#### 타이포그래피
- **폰트**: Noto Sans KR
- **제목 (h1)**: 2.5rem, 900 weight
- **부제목 (h2)**: 1.8rem, 700 weight
- **본문**: 1rem, 400 weight
- **캡션**: 0.8rem, 500 weight

#### 애니메이션
- **호버 효과**: transform + box-shadow (0.3s ease)
- **탭 전환**: background + border (0.3s ease)
- **모달**: fade-in (0.2s ease)

### 반응형 브레이크포인트
```css
/* 데스크톱 */
@media (min-width: 1400px) { ... }

/* 대형 태블릿 */
@media (max-width: 1400px) { ... }

/* 태블릿 */
@media (max-width: 1200px) { ... }

/* 소형 태블릿 */
@media (max-width: 900px) { ... }

/* 모바일 */
@media (max-width: 768px) { ... }

/* 소형 모바일 */
@media (max-width: 600px) { ... }
@media (max-width: 480px) { ... }
@media (max-width: 400px) { ... }
```

---

## 🔧 기술 명세

### 프론트엔드
- **프레임워크**: React 18+
- **빌드 도구**: Vite
- **스타일링**: Vanilla CSS (CSS Modules 미사용)
- **상태 관리**: React Hooks (useState, useMemo, useRef, useEffect)

### 백엔드 (선택적)
- **데이터베이스**: Supabase (PostgreSQL)
- **인증**: Supabase Auth (미구현)
- **스토리지**: 로컬 상태 우선, Supabase 백업

### 주요 의존성
```json
{
  "react": "^18.x",
  "react-dom": "^18.x",
  "@supabase/supabase-js": "^2.x"
}
```

---

## 📁 프로젝트 구조

```
테스트/
├── src/
│   ├── App.jsx                 # 메인 애플리케이션
│   ├── index.css               # 글로벌 스타일
│   ├── main.jsx                # 엔트리 포인트
│   ├── components/
│   │   └── CardSelectionModal.jsx  # 카드 선택 모달 (미사용)
│   ├── data/
│   │   ├── popularCards.js     # 60종 카드 데이터
│   │   ├── mockData.js         # 거래 내역 데이터
│   │   └── cardArchive.js      # 카드 아카이브 (미사용)
│   └── utils/
│       ├── supabase.js         # Supabase 클라이언트
│       └── recommender.js      # 추천 알고리즘 (구버전)
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

---

## 🚀 배포 명세

### 빌드 명령어
```bash
npm run build
```

### 배포 환경
- **플랫폼**: GitHub Pages / Vercel / Netlify
- **빌드 출력**: dist/
- **베이스 경로**: / (루트)

### 환경 변수 (선택적)
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## 🔒 보안 고려사항

1. **XSS 방지**: `dangerouslySetInnerHTML` 사용 시 입력값 검증
2. **API 키 보호**: 환경 변수 사용
3. **HTTPS 필수**: 프로덕션 환경에서 HTTPS 사용
4. **입력 검증**: 사용자 입력값 sanitize

---

## 📈 성능 최적화

### 구현된 최적화
1. **useMemo**: 카드 필터링 결과 캐싱
2. **이벤트 디바운싱**: 챗봇 응답 600ms 지연
3. **CSS 애니메이션**: GPU 가속 (transform, opacity)
4. **이미지 최적화**: 그라디언트 사용 (이미지 미사용)

### 권장 최적화 (미구현)
1. React.memo로 컴포넌트 메모이제이션
2. 가상 스크롤링 (60개 카드)
3. 코드 스플리팅
4. 서비스 워커 (PWA)

---

## 🐛 알려진 제한사항

1. **오프라인 지원 없음**: 인터넷 연결 필수
2. **실시간 데이터 없음**: 정적 카드 데이터
3. **사용자 인증 없음**: 로그인 기능 미구현
4. **카드 비교 기능 없음**: 다중 선택 불가
5. **즐겨찾기 없음**: 관심 카드 저장 불가

---

## 📝 라이선스

MIT License

---

## 👥 기여자

- 개발자: Antigravity AI Assistant
- 프로젝트 소유자: namonamho88-ui

---

**문서 버전**: 1.0.0  
**최종 수정일**: 2026-01-31
