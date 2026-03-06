# 📱 Space D — 서비스 기능 요약서

AI 기반 금융·생활 종합 플랫폼. React + Vite로 개발되어 GitHub Pages에 자동 배포됩니다.

---

## 1. 💳 AI 카드 추천 챗봇

> **컴포넌트**: [App.jsx](file:///c:/Users/82104/Desktop/테스트/src/App.jsx)

| 기능 | 설명 |
|------|------|
| **AI 챗봇** | Gemini API 기반으로 사용자 질문에 맞는 최적의 카드를 추천 |
| **카드 목록** | 카드사별(신한, 삼성, 현대 등) 필터링 + 인기 카드 브라우징 |
| **카드 상세** | AI가 카드별 혜택, 연회비, 추천 대상을 분석하여 표시 |
| **AI 카드 비교** | 2장의 카드를 선택하면 Gemini가 혜택·연회비·성격을 상세 비교 분석 |

**데이터**: [popularCards.json](file:///c:/Users/82104/Desktop/테스트/src/data/popularCards.json) (10개 인기 카드)

---

## 2. 📊 AI 주간 리포트

> **컴포넌트**: [AIWeeklyReport.jsx](file:///c:/Users/82104/Desktop/테스트/src/components/AIWeeklyReport.jsx)

4가지 탭 리포트를 제공하며, **GitHub Actions로 매일 자동 생성**됩니다.

| 탭 | 내용 | 주요 섹션 |
|----|------|-----------|
| 🏦 **신한 리포트** | 신한금융그룹 위클리 분석 | 주가·이슈·5개 계열사·애널리스트 뷰·리스크·전망 |
| 🤖 **AI 동향** | 글로벌 AI 산업 뉴스 | TOP5 뉴스·기술 트렌드·한국 업데이트·다음주 전망 |
| 💳 **카드 리포트** | 카드 시장 트렌드 | 인기 순위·이벤트·카드 조합·전망 |
| ⚔️ **경쟁 인텔리전스** | KB·하나·우리금융 비교 | 주가 비교·경쟁사 동향·상품 대결·SWOT·주간 평가 |

**자동화**: [generate-reports.yml](file:///c:/Users/82104/Desktop/테스트/.github/workflows/generate-reports.yml) — 매일 자정(KST) 자동 생성  
**공유**: 텍스트 복사, 이메일, 이미지 저장, 네이티브 공유 지원

---

## 3. 📈 금융 랭킹

> **컴포넌트**: [FinancialRanking.jsx](file:///c:/Users/82104/Desktop/테스트/src/components/FinancialRanking.jsx)

| 탭 | 데이터 소스 | 갱신 주기 |
|----|-----------|----------|
| 🇰🇷 **국내주식** TOP 10 | 네이버 금융 크롤링 | 매일 (GitHub Actions) |
| 🇺🇸 **해외주식** TOP 10 | Finnhub API | 10초 (실시간) |
| ₿ **가상화폐** TOP 10 | CoinGecko API | 10초 (실시간) |

**부가 기능**: 종목 클릭 시 **AI 호재/악재 실시간 분석** (Gemini + Google Search)  
**자동화**: [fetch-kr-stocks.js](file:///c:/Users/82104/Desktop/테스트/scripts/fetch-kr-stocks.js) — 매일 네이버 금융에서 주가 수집

---

## 4. 🍽️ 오늘 뭐 먹지

> **컴포넌트**: [TodayFood.jsx](file:///c:/Users/82104/Desktop/테스트/src/components/TodayFood.jsx)

| 기능 | 설명 |
|------|------|
| 🎰 **메뉴 룰렛** | 카테고리(한식·중식·양식 등) 필터 + 제외 메뉴 설정 → 랜덤 추천 |
| 🗺️ **AI 코스 플래너** | 지역 선택(을지로·강남·홍대 등) → Gemini가 3코스 맛집 코스 추천 (메뉴·가격·위치·추천 이유 포함) |
| 📋 **카테고리 필터** | 한식, 중식, 일식, 양식, 분식, 카페, 브런치, 버거, 아시안 등 10개 카테고리 |

**데이터**: [mockFoodData.js](file:///c:/Users/82104/Desktop/테스트/src/data/mockFoodData.js) (메뉴 DB)

---

## 5. 📉 AI 트레이딩 배틀

> **컴포넌트**: [AITradingBattle.jsx](file:///c:/Users/82104/Desktop/테스트/src/components/AITradingBattle.jsx)

| 기능 | 설명 |
|------|------|
| 📊 **실시간 차트** | Canvas로 렌더링된 캔들스틱 + 거래량 + 이동평균선(MA20) 차트 |
| 🎮 **모의 매매** | 100만원 시작 자본으로 매수/매도 시뮬레이션 |
| 🤖 **AI vs 사용자** | AI가 15가지 차트 패턴을 생성 → 사용자가 매매 판단 → 수익률 비교 |
| 📚 **패턴 학습** | V자 반등, 이중 바닥, 헤드앤숄더 등 15가지 차트 패턴을 용어 사전과 함께 학습 |
| 🏆 **성적표** | 승/패 기록, 총 수익률, 라운드별 히스토리 |

**난이도 조절**: Easy / Normal / Hard / Extreme (4단계 변동성 조절)

---

## ⚙️ 기술 인프라

| 항목 | 기술 |
|------|------|
| **프론트엔드** | React 19 + Vite 7 + Tailwind CSS 4 |
| **AI 엔진** | Gemini 3.1 Flash Lite (Google AI) |
| **배포** | GitHub Pages (자동 배포) |
| **자동화** | GitHub Actions — 매일 자정 리포트 + 주가 자동 생성 |
| **실시간 API** | Finnhub (해외주식), CoinGecko (가상화폐), 네이버 금융 (국내주식) |

### GitHub Actions 워크플로우

| 워크플로우 | 트리거 | 역할 |
|-----------|--------|------|
| `deploy.yml` | Push to main | GitHub Pages 자동 배포 |
| `generate-reports.yml` | 매일 자정 KST | 4개 AI 리포트 + 국내주가 수집 |
| `card-sync.yml` | 수동/스케줄 | 카드 데이터 동기화 |
