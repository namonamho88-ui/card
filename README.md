# Cherry Picker Agent 🍒

> 당신의 소비를 스마트하게, 혜택은 극대화로.

AI 기반 신용카드 추천 시스템으로 60종의 인기 카드 중 사용자의 소비 패턴에 가장 적합한 카드를 찾아드립니다.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-5+-646CFF?logo=vite)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ 주요 기능

### 🏆 카드 카탈로그
- **60종 카드 데이터**: 6개 주요 카드사 × 10종
- **카드사별 탭**: 전체, 신한, 현대, 삼성, 우리, 하나, 롯데
- **반응형 그리드**: 데스크톱 6열 → 모바일 2열
- **카드 상세 모달**: 혜택, 연회비, 전월실적 확인

### 🤖 AI 카드 추천
- **키워드 기반 매칭**: 영화, 카페, 주유, 대중교통 등
- **스마트 점수 계산**: 할인율 + 카테고리 일치도
- **다중 추천**: 최대 4개 카드 비교 추천

### 🎨 프리미엄 디자인
- **다크 모드**: 세련된 검은 배경
- **글래스모피즘**: 반투명 유리 효과
- **네온 강조색**: 청록색 (#00f2fe)
- **부드러운 애니메이션**: 호버, 클릭 효과

## 🚀 빠른 시작

### 설치
```bash
git clone https://github.com/namonamho88-ui/card.git
cd card
npm install
```

### 개발 서버 실행
```bash
npm run dev
```

브라우저에서 http://localhost:5173 접속

### 프로덕션 빌드
```bash
npm run build
npm run preview
```

## 📖 문서

- **[기능 명세서](./SPECIFICATION.md)**: 상세한 기술 명세 및 데이터 구조
- **[사용자 가이드](./USER_GUIDE.md)**: 기능 사용법 및 활용 팁

## 🎯 사용 예시

### 카드 탐색
1. 상단 탭에서 카드사 선택
2. 원하는 카드 클릭
3. 상세 정보 확인

### AI 추천
```
사용자: "영화를 자주 보는데 제일 혜택 좋은 카드는?"

AI 응답:
우리카드 위비 영화 카드를 추천드립니다!

💳 연회비: 20,000원
📊 전월 실적: 40만원

✨ 주요 혜택:
1. 영화 예매 50% 할인 (월 4회)
2. 팝콘 세트 무료
3. CGV 골드클래스 30% 할인

📋 다른 추천 카드:
2. 롯데카드 Cinema (연회비: 23,000원)
3. 신한카드 The Great (연회비: 30,000원)
4. 삼성카드 iD MOVIE (연회비: 25,000원)
```

## 🛠️ 기술 스택

- **프론트엔드**: React 18, Vite
- **스타일링**: Vanilla CSS
- **상태 관리**: React Hooks
- **백엔드**: Supabase (선택적)

## 📁 프로젝트 구조

```
테스트/
├── src/
│   ├── App.jsx              # 메인 애플리케이션
│   ├── index.css            # 글로벌 스타일
│   ├── data/
│   │   └── popularCards.js  # 60종 카드 데이터
│   └── utils/
│       └── supabase.js      # Supabase 클라이언트
├── SPECIFICATION.md         # 기능 명세서
├── USER_GUIDE.md            # 사용자 가이드
└── README.md                # 프로젝트 소개
```

## 🎨 스크린샷

### 데스크톱
- 6열 카드 그리드
- 탭 네비게이션
- AI 챗봇

### 모바일
- 2열 카드 그리드
- 반응형 탭
- 터치 최적화

## 📊 카드 데이터

### 카드사별 구성
- **신한카드** (10종): 딥 드림, 미스터라이프, Deep Oil 등
- **현대카드** (10종): M, Zero, Purple, Red 등
- **삼성카드** (10종): taptap O, iD, taptap S 등
- **우리카드** (10종): 에브리원, 카드의정석, 위비 시리즈 등
- **하나카드** (10종): 1Q, Viva 시리즈 등
- **롯데카드** (10종): Pink, Sky, Cinema 등

### 카테고리별 구성
- 포인트 적립형
- 할인형 (카페, 영화, 주유, 마트 등)
- 여행/마일리지형
- 대중교통형
- 온라인 쇼핑형

## 🔧 개발 가이드

### 카드 데이터 추가
`src/data/popularCards.js` 파일에서 POPULAR_CARDS 배열에 추가:

```javascript
{
  id: 'unique-id',
  issuer: '카드사명',
  name: '카드명',
  color: 'linear-gradient(...)',
  annualFee: '15,000원',
  previousMonthSpending: '30만원',
  benefits: ['혜택1', '혜택2', '혜택3'],
  categories: ['카테고리1', '카테고리2']
}
```

### 스타일 커스터마이징
`src/index.css`에서 CSS 변수 수정:

```css
:root {
  --bg-color: #0a0a0a;
  --text-color: #ffffff;
  --accent-color: #00f2fe;
}
```

## 🐛 알려진 이슈

- [ ] 오프라인 지원 없음
- [ ] 사용자 인증 미구현
- [ ] 카드 비교 기능 없음
- [ ] 즐겨찾기 기능 없음

## 🗺️ 로드맵

- [ ] 사용자 로그인 기능
- [ ] 내 카드 관리 기능
- [ ] 카드 비교 기능
- [ ] 즐겨찾기 기능
- [ ] PWA 지원
- [ ] 다국어 지원

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일 참조

## 👥 제작

- **개발**: Antigravity AI Assistant
- **프로젝트 소유자**: namonamho88-ui
- **GitHub**: https://github.com/namonamho88-ui/card

## 📞 문의

- **Issues**: https://github.com/namonamho88-ui/card/issues
- **Discussions**: https://github.com/namonamho88-ui/card/discussions

---

**⭐ 이 프로젝트가 도움이 되었다면 Star를 눌러주세요!**

Made with ❤️ by Antigravity AI
