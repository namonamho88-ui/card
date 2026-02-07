import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TRANSACTIONS } from './data/mockData';
import cardData from './data/popularCards.json';
import { ISSUERS, getCardsByIssuer } from './utils/cardUtils';
const { cards: POPULAR_CARDS } = cardData;
import FinancialRanking from './components/FinancialRanking';
import AITradingBattle from './components/AITradingBattle';
import './index.css';

function App() {
  const [messages, setMessages] = useState([
    { role: 'agent', text: '안녕하세요! Space D 에서 제공하는 AI 기반 카드 추천 에이전트 입니다. 궁금하신 카드 혜택이 있으신가요? 예를 들어 "영화를 자주 보는데 제일 혜택 좋은 카드는?" 이렇게 물어보세요!' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [compareCards, setCompareCards] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedIssuer, setSelectedIssuer] = useState('전체');
  const [activeMainTab, setActiveMainTab] = useState('cards'); // 'cards', 'financial', or 'game'
  const chatEndRef = useRef(null);
  const chatbotSectionRef = useRef(null); // 챗봇 섹션 참조

  const scrollToChatbot = () => {
    chatbotSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg = inputValue;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputValue('');

    // 로딩 표시
    const loadingId = Date.now();
    setMessages(prev => [...prev, {
      role: 'agent',
      text: '답변을 생성하고 있습니다...',
      id: loadingId,
      isLoading: true
    }]);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      // API 키가 없는 경우 (로컬 개발 등)
      if (!apiKey) {
        // 실제 배포 환경에서는 Vercel 환경 변수가 사용됨
        console.warn("API Key is missing. Check your .env file or Vercel settings.");

        // 잠시 대기 후 모의 응답 (개발용)
        setTimeout(() => {
          setMessages(prev => prev.map(msg =>
            msg.id === loadingId
              ? { ...msg, text: "⚠️ API 키가 설정되지 않았습니다. (개발 모드)\n\nVercel 환경 변수 또는 .env 파일에 `VITE_GEMINI_API_KEY`를 설정해주세요.", isLoading: false }
              : msg
          ));
        }, 1000);
        return;
      }

      // 프롬프트 최적화: 불필요한 공백 및 문구 제거하여 토큰 절약 (Aggressive Compression)
      const allCards = POPULAR_CARDS;
      // Format: Issuer Name(Fee/Perform):Benefit1,Benefit2...
      const cardContext = allCards.map(c =>
        `${c.issuer} ${c.name}(${c.annualFee}/${c.previousMonthSpending}):${c.benefits.join(',')}`
      ).join('\n');

      const systemInstruction = `
        당신은 Space D 에서 제공하는 AI 기반 카드 추천 에이전트입니다. 아래 데이터 기반으로 추천하세요.
        데이터: 카드사 상품명(연회비/실적):혜택...

        [데이터]
        ${cardContext}

        [가이드]
        1. 질문에 맞는 카드 1개를 '최우선 추천'으로 선정하여 상세히 설명.
        2. 답변 양식을 다음 포맷을 **엄격히** 준수할 것:
           
           **[카드사] [카드명]** 카드를 추천드립니다!
           
           💳 **연회비**: [금액]
           📊 **전월 실적**: [실적]
           
           ✨ **주요 혜택**:
           1. [혜택1]
           2. [혜택2]
           
           (필요시) 📋 **다른 추천 카드**:
           - [카드사] [카드명] (연회비: [금액])
           
        3. 친절하고 전문적인 톤앤매너 유지.
      `;

      // 모델 변경: gemini-2.0-flash (429) -> gemini-flash-latest (Stable)
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userMsg }] }],
          system_instruction: { parts: [{ text: systemInstruction }] }
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too Many Requests (Rate Limit)");
        }
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "죄송합니다. 적절한 답변을 생성하지 못했습니다.";

      setMessages(prev => prev.map(msg =>
        msg.id === loadingId
          ? { ...msg, text: botResponse, isLoading: false }
          : msg
      ));

    } catch (error) {
      console.error("Gemini API Error:", error);
      let errorMsg = "죄송합니다. 일시적인 오류가 발생했습니다.";

      if (error.message.includes("Too Many Requests")) {
        errorMsg = "⚠️ 가용량이 초과되었습니다 (429 Error).\n\n무료 버전 API 사용량이 많아 일시적으로 제한되었습니다. 약 1분 뒤에 다시 시도해주세요.";
      }

      setMessages(prev => prev.map(msg =>
        msg.id === loadingId
          ? { ...msg, text: errorMsg, isLoading: false }
          : msg
      ));
    }
  };

  // 필터링된 카드 목록
  const displayedCards = useMemo(() => {
    return getCardsByIssuer(selectedIssuer);
  }, [selectedIssuer]);

  // AI 비교 분석 로직 (Gemini API 활용)
  const CardComparison = ({ card1, card2, onClear }) => {
    const [analysis, setAnalysis] = useState('AI가 두 카드를 분석하고 있습니다...');
    const [isAnalyzing, setIsAnalyzing] = useState(true);

    useEffect(() => {
      const fetchAnalysis = async () => {
        try {
          const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
          if (!apiKey) {
            setAnalysis("⚠️ API 키가 설정되지 않았습니다. 분석을 진행할 수 없습니다.");
            setIsAnalyzing(false);
            return;
          }

          const prompt = `
            당신은 신용카드 비교 전문 AI입니다.

            ## 역할
            두 카드의 핵심 차이를 **한눈에 파악 가능한 요약 형식**으로 제공합니다.
            장황한 설명, 반복적 수식어, 불필요한 부연은 모두 제거함.

            ## 출력 규칙
            1. 전체 응답은 **최대 300자 이내의 본문 + 표 1개 + 한줄 결론**으로 구성함.
            2. 표는 반드시 아래 고정 항목만 포함:
               - 연회비
               - 전월 실적
               - 핵심 혜택 (최대 3개, 숫자 중심으로 표기)
               - 월 최대 혜택 금액
               - 피킹률 (최소~최대)
            3. 표 아래에 **"이런 분께 추천"**을 각 카드별 1문장으로 작성함.
            4. 마지막에 **💡 한줄 팁**을 1문장으로 작성함.
            5. 이모지는 제목에만 사용, 본문에는 사용 금지함.
            6. 마크다운 표 형식 사용함.
            7. "~입니다", "~습니다" 대신 "~임", "~함" 등 간결체 사용함.

            ## 표 작성 규칙 (필수 준수)
            1. 모든 행의 모든 셀에 반드시 값이 있어야 함. 빈 셀 금지.
            2. 한 셀에 여러 항목을 넣을 때 행을 분리하지 말고, 셀 내부에서 "① ② ③" 번호를 붙여 한 줄로 작성할 것.
               (예: ①카페 10% ②쇼핑 10% ③정기결제 20%)
            3. 동일 항목명으로 여러 행을 만들지 말 것.
            4. 표는 헤더 포함 최대 7행을 넘지 말 것.

            ## 비교 대상
            카드1: ${card1.name} (카드사: ${card1.issuer})
            - 혜택: ${card1.benefits.join(', ')}
            - 연회비: ${card1.annualFee}
            - 전월실적: ${card1.previousMonthSpending}
            
            카드2: ${card2.name} (카드사: ${card2.issuer})
            - 혜택: ${card2.benefits.join(', ')}
            - 연회비: ${card2.annualFee}
            - 전월실적: ${card2.previousMonthSpending}

            ## 출력 포맷 (이 구조를 정확히 따를 것)
            ## ⚡ [${card1.name}] vs [${card2.name}] 핵심 비교

            | 항목 | [${card1.name}] | [${card2.name}] |
            |---|---|---|
            | 연회비 | ... | ... |
            | 전월 실적 | ... | ... |
            | 핵심 혜택 | ①... ②... ③... | ①... ②... ③... |
            | 월 최대 혜택 | ... | ... |
            | 피킹률 | ... | ... |

            **이런 분께 추천**
            - [${card1.name}]: ...
            - [${card2.name}]: ...

            💡 (병행 사용 등 실전 팁 1문장)
          `;

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }]
            })
          });

          if (!response.ok) throw new Error("API 요청 실패");

          const data = await response.json();
          const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "분석 결과를 가져오는데 실패했습니다.";
          setAnalysis(result);
        } catch (error) {
          console.error("Comparison Error:", error);
          setAnalysis("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
          setIsAnalyzing(false);
        }
      };

      fetchAnalysis();
    }, [card1, card2]);

    return (
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        <div className="p-5">
          {/* Header with Back Button */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={onClear} className="w-10 h-10 flex items-center justify-center bg-toss-gray-100 dark:bg-gray-800 rounded-full">
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <h2 className="text-xl font-bold dark:text-white">AI 카드 비교 분석</h2>
          </div>

          {/* VS Visualization */}
          <div className="flex items-center justify-between mb-8 px-4">
            <div className="text-center flex-1">
              <div className="w-full aspect-[1.58/1] rounded-xl mx-auto mb-3 shadow-lg flex items-center justify-center text-[10px] text-white p-2 font-bold"
                style={card1.image ? { backgroundImage: `url("${card1.image}")`, backgroundSize: 'cover' } : { background: card1.color }}>
                {!card1.image && card1.name}
              </div>
              <p className="font-bold text-sm dark:text-white truncate">{card1.name}</p>
              <p className="text-[11px] text-toss-gray-500 dark:text-gray-400">{card1.issuer}</p>
            </div>
            <div className="flex flex-col items-center mx-4">
              <span className="text-2xl font-black text-primary italic">VS</span>
            </div>
            <div className="text-center flex-1">
              <div className="w-full aspect-[1.58/1] rounded-xl mx-auto mb-3 shadow-lg flex items-center justify-center text-[10px] text-white p-2 font-bold"
                style={card2.image ? { backgroundImage: `url("${card2.image}")`, backgroundSize: 'cover' } : { background: card2.color }}>
                {!card2.image && card2.name}
              </div>
              <p className="font-bold text-sm dark:text-white truncate">{card2.name}</p>
              <p className="text-[11px] text-toss-gray-500 dark:text-gray-400">{card2.issuer}</p>
            </div>
          </div>

          {/* AI Analysis Box */}
          <div className="bg-toss-gray-50 dark:bg-gray-900 rounded-[28px] p-6 border border-toss-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4 text-primary font-bold">
              <span className="material-symbols-outlined text-[20px]">smart_toy</span>
              <span>AI 분석 리포트</span>
            </div>

            {isAnalyzing ? (
              <div className="flex flex-col items-center py-10 gap-3">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-toss-gray-500 dark:text-gray-400">데이터를 정밀 분석 중입니다...</p>
              </div>
            ) : (
              <div className="prose dark:prose-invert max-w-none text-[15px] leading-relaxed dark:text-gray-200">
                <div dangerouslySetInnerHTML={{
                  __html: analysis
                    .replace(/\n/g, '<br/>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/^- (.*?)$/gm, '• $1')
                }} />
              </div>
            )}
          </div>

          <button
            onClick={onClear}
            className="w-full mt-8 bg-toss-gray-100 dark:bg-gray-800 text-toss-gray-800 dark:text-white py-[18px] rounded-[22px] font-bold text-[16px] transition-all active:scale-[0.98]"
          >
            다른 카드 비교하기
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-[430px] mx-auto shadow-2xl bg-white dark:bg-[#111111]">
      {/* Header - Sticky stable flex child */}
      <header className="sticky top-0 shrink-0 bg-white/95 dark:bg-[#111111]/95 backdrop-blur-md px-5 py-4 flex items-center justify-between z-30 border-b border-toss-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-1">
          <span
            className="material-symbols-outlined text-toss-gray-800 dark:text-white cursor-pointer text-2xl font-semibold"
            onClick={() => showComparison ? setShowComparison(false) : null}
          >
            chevron_left
          </span>
        </div>
        <h1 className="text-toss-gray-800 dark:text-white text-lg font-bold">
          {showComparison ? 'AI 카드 비교' : (activeMainTab === 'cards' ? '카드사별 인기 TOP 10' : activeMainTab === 'financial' ? '실시간 금융 랭킹' : 'AI 트레이딩')}
        </h1>
        <div className="w-6"></div>
      </header>

      {/* Conditional Content Wrapper */}
      <div className="flex-1 flex flex-col">
        {showComparison ? (
          <CardComparison
            card1={compareCards[0]}
            card2={compareCards[1]}
            onClear={() => {
              setShowComparison(false);
              setCompareCards([]);
            }}
          />
        ) : activeMainTab === 'cards' ? (
          <>
            {/* Tabs Navigation (Issuers) - Non-sticky shrinking child */}
            <div className="bg-white dark:bg-[#111111] border-b border-toss-gray-100 dark:border-gray-800 shrink-0 z-20">
              <div className="flex overflow-x-auto no-scrollbar px-5 gap-6 items-center h-12">
                {ISSUERS.map(issuer => {
                  const shortName = issuer === '전체' ? '전체' : issuer.replace('카드', '');
                  const isActive = selectedIssuer === issuer;
                  return (
                    <button
                      key={issuer}
                      onClick={() => setSelectedIssuer(issuer)}
                      className={`flex flex-col items-center shrink-0 justify-center h-full border-b-2 transition-all ${isActive
                        ? 'border-toss-gray-800 dark:border-white'
                        : 'border-transparent'
                        }`}
                    >
                      <p className={`text-[15px] tracking-tight ${isActive
                        ? 'text-toss-gray-800 dark:text-white font-bold'
                        : 'text-toss-gray-600 dark:text-gray-500 font-medium'
                        }`}>
                        {shortName}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Content - Full Scrollable Flow */}
            <main className="flex-1 overflow-y-auto no-scrollbar pb-10">
              <div className="px-5 py-4 space-y-1">
                {displayedCards.slice(0, 10).map((card, idx) => (
                  <div
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className="flex items-center gap-4 py-4 active:bg-gray-50 dark:active:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <span className={`text-toss-gray-800 dark:text-white text-lg font-bold w-4 text-center ${idx >= 3 ? 'text-opacity-50' : ''}`}>
                      {idx + 1}
                    </span>
                    {/* Card Image Graphic */}
                    <div
                      className="bg-center bg-no-repeat aspect-[1.58/1] bg-cover rounded-sm h-10 w-16 shadow-sm flex items-center justify-center text-[6px] text-white p-1 text-center font-bold"
                      style={card.image
                        ? { backgroundImage: `url("${card.image}")` }
                        : { background: card.color }
                      }
                    >
                      {!card.image && <div className="truncate">{card.issuer}</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-toss-gray-800 dark:text-white text-[16px] font-semibold truncate leading-snug">
                        {card.name}
                      </p>
                      <p className="text-toss-gray-600 dark:text-gray-400 text-[13px] font-medium truncate">
                        {card.benefits[0]}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-toss-gray-200 dark:text-gray-700">chevron_right</span>
                  </div>
                ))}
              </div>

              {/* AI Chatbot Section - Integrated into Scroll Flow */}
              <section className="bg-toss-gray-50 dark:bg-black p-5 pt-10" ref={chatbotSectionRef}>
                <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-5 shadow-sm border border-toss-gray-100 dark:border-gray-800">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-toss-gray-800 dark:text-white">
                    <span className="material-symbols-outlined text-primary">smart_toy</span>
                    AI 카드 추천
                  </h2>
                  <div className="h-[400px] overflow-y-auto mb-4 space-y-4 no-scrollbar">
                    {messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed ${m.role === 'user'
                          ? 'bg-primary text-white rounded-tr-none'
                          : 'bg-toss-gray-100 dark:bg-gray-800 text-toss-gray-800 dark:text-gray-200 rounded-tl-none'
                          }`}>
                          <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="혜택 질문하기 (예: 카페 추천)"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      className="w-full bg-toss-gray-100 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary dark:text-white outline-none"
                    />
                    <button
                      onClick={handleSend}
                      className="absolute right-2 top-2 bottom-2 bg-primary text-white px-5 rounded-xl font-bold text-sm"
                    >
                      보내기
                    </button>
                  </div>
                </div>
                <div className="h-32" /> {/* Bottom Spacer to clear nav bar */}
              </section>
            </main>
          </>
        ) : activeMainTab === 'financial' ? (
          <main className="flex-1 flex flex-col bg-white dark:bg-[#111111]">
            <FinancialRanking />
          </main>
        ) : (
          <main className="flex-1 flex flex-col bg-white dark:bg-[#111111]">
            <AITradingBattle />
          </main>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 z-40 w-full max-w-[430px] bg-white/95 dark:bg-[#111111]/95 backdrop-blur-lg border-t border-toss-gray-100 dark:border-gray-800 flex justify-between items-center px-6 py-3">
        <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => { setActiveMainTab('cards'); window.scrollTo(0, 0); }}>
          <span className={`material-symbols-outlined ${activeMainTab === 'cards' ? 'text-primary font-bold' : 'text-toss-gray-200 dark:text-gray-600'}`}>home</span>
          <span className={`text-[10px] ${activeMainTab === 'cards' ? 'text-primary font-bold' : 'text-toss-gray-600 dark:text-gray-400'}`}>홈</span>
        </div>
        <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => { setActiveMainTab('cards'); window.scrollTo(0, 0); }}>
          <span className={`material-symbols-outlined ${activeMainTab === 'cards' ? 'text-primary font-bold' : 'text-toss-gray-200 dark:text-gray-600'}`}>credit_card</span>
          <span className={`text-[10px] ${activeMainTab === 'cards' ? 'text-primary font-bold' : 'text-toss-gray-600 dark:text-gray-400'}`}>카드비교</span>
        </div>
        <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => { setActiveMainTab('financial'); window.scrollTo(0, 0); }}>
          <span className={`material-symbols-outlined ${activeMainTab === 'financial' ? 'text-primary font-bold' : 'text-toss-gray-200 dark:text-gray-600'}`}>show_chart</span>
          <span className={`text-[10px] ${activeMainTab === 'financial' ? 'text-primary font-bold' : 'text-toss-gray-600 dark:text-gray-400'}`}>금융랭킹</span>
        </div>
        <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => { setActiveMainTab('game'); window.scrollTo(0, 0); }}>
          <span className={`material-symbols-outlined ${activeMainTab === 'game' ? 'text-primary font-bold' : 'text-toss-gray-200 dark:text-gray-600'}`}>sports_esports</span>
          <span className={`text-[10px] ${activeMainTab === 'game' ? 'text-primary font-bold' : 'text-toss-gray-600 dark:text-gray-400'}`}>AI게임</span>
        </div>
        <div className="flex flex-col items-center gap-1 cursor-pointer">
          <span className="material-symbols-outlined text-toss-gray-200 dark:text-gray-600">menu</span>
          <span className="text-[10px] text-toss-gray-600 dark:text-gray-400">전체</span>
        </div>
      </nav>

      {/* Floating Chatbot Button */}
      {
        activeMainTab === 'cards' && (
          <div className="fixed bottom-24 right-6 z-30 sm:right-[calc(50%-215px+24px)]">
            <button
              onClick={scrollToChatbot}
              className="bg-primary text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
            </button>
          </div>
        )
      }



      {/* Card Detail Bottom Sheet */}
      {
        selectedCard && (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-[2px] transition-all duration-300 animate-in fade-in"
            onClick={() => setSelectedCard(null)}
          >
            <div
              className="bg-white dark:bg-[#111111] rounded-t-[32px] p-8 w-full max-w-[430px] mx-auto shadow-[0_-8px_30px_rgb(0,0,0,0.12)] animate-in slide-in-from-bottom duration-500 ease-out"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle Bar */}
              <div className="w-12 h-1.5 bg-toss-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-8 cursor-pointer" onClick={() => setSelectedCard(null)} />

              <div className="flex justify-between items-start mb-8">
                <div className="flex-1">
                  <p className="text-primary font-bold text-sm mb-1 uppercase tracking-wider">{selectedCard.issuer}</p>
                  <h2 className="text-[28px] font-bold text-toss-gray-800 dark:text-white leading-tight tracking-tight">
                    {selectedCard.name}
                  </h2>
                </div>
                <button
                  className="w-10 h-10 flex items-center justify-center bg-toss-gray-100 dark:bg-gray-800 rounded-full text-toss-gray-600 dark:text-gray-400 hover:scale-105 transition-transform"
                  onClick={() => setSelectedCard(null)}
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-toss-gray-50 dark:bg-gray-900/50 p-5 rounded-[24px] border border-toss-gray-100 dark:border-gray-800/50">
                  <p className="text-[13px] text-toss-gray-600 dark:text-gray-400 mb-2 font-medium">연회비</p>
                  <p className="text-[17px] font-bold text-toss-gray-800 dark:text-white">{selectedCard.annualFee}</p>
                </div>
                <div className="bg-toss-gray-50 dark:bg-gray-900/50 p-5 rounded-[24px] border border-toss-gray-100 dark:border-gray-800/50">
                  <p className="text-[13px] text-toss-gray-600 dark:text-gray-400 mb-2 font-medium">전월 실적</p>
                  <p className="text-[17px] font-bold text-toss-gray-800 dark:text-white">{selectedCard.previousMonthSpending}</p>
                </div>
              </div>

              {/* Benefits List */}
              <div className="space-y-4 mb-10">
                <h3 className="text-[18px] font-bold text-toss-gray-800 dark:text-white mb-4 px-1">주요 혜택</h3>
                <div className="space-y-3">
                  {selectedCard.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex gap-4 items-center p-4 bg-toss-gray-50 dark:bg-gray-900/50 rounded-[20px] transition-all hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-toss-gray-100 dark:hover:border-gray-700">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      </div>
                      <p className="text-[15px] font-semibold text-toss-gray-700 dark:text-gray-300 leading-snug">
                        {benefit}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-2">
                <button
                  onClick={() => {
                    const newCompare = [...compareCards, selectedCard];
                    setCompareCards(newCompare);
                    setSelectedCard(null);
                    if (newCompare.length >= 2) {
                      setShowComparison(true);
                      setActiveMainTab('cards'); // Ensure we are on cards tab visualization
                    }
                  }}
                  className="flex-1 bg-toss-gray-100 dark:bg-gray-800 text-toss-gray-800 dark:text-white py-[18px] rounded-[22px] font-bold text-[16px] transition-all active:scale-[0.98]"
                >
                  ⚖️ 비교함에 담기
                </button>
                <button
                  onClick={() => {
                    alert(`${selectedCard.name} 카드 신청 페이지로 이동합니다.`);
                    setSelectedCard(null);
                  }}
                  className="flex-1 bg-primary text-white py-[18px] rounded-[22px] font-bold text-[16px] shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all transform"
                >
                  카드 신청하기
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}

export default App;
