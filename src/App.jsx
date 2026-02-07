import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TRANSACTIONS } from './data/mockData';
import { POPULAR_CARDS, ISSUERS, getCardsByIssuer } from './data/popularCards';
import FinancialRanking from './components/FinancialRanking';
import AITradingBattle from './components/AITradingBattle';
import './index.css';

function App() {
  const [messages, setMessages] = useState([
    { role: 'agent', text: '안녕하세요! Space D 에서 제공하는 AI 기반 카드 추천 에이전트 입니다. 궁금하신 카드 혜택이 있으신가요? 예를 들어 "영화를 자주 보는데 제일 혜택 좋은 카드는?" 이렇게 물어보세요!' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
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
      const allCards = Object.values(POPULAR_CARDS).flat();
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

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-[430px] mx-auto overflow-x-hidden shadow-2xl bg-white dark:bg-[#111111]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#111111]/90 backdrop-blur-md px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-toss-gray-800 dark:text-white cursor-pointer text-2xl font-semibold">chevron_left</span>
        </div>
        <h1 className="text-toss-gray-800 dark:text-white text-lg font-bold">
          {activeMainTab === 'cards' ? '카드사별 인기 TOP 10' : activeMainTab === 'financial' ? '실시간 금융 랭킹' : 'AI 트레이딩 게임'}
        </h1>
        <div className="w-6"></div>
      </header>

      {/* Conditional Content: Card Ranking vs. Financial Ranking vs. Game */}
      <div className="flex-1 flex flex-col">
        {activeMainTab === 'cards' ? (
          <>
            {/* Tabs Navigation (Issuers) */}
            <div className="sticky top-[60px] z-20 bg-white dark:bg-[#111111] border-b border-toss-gray-100 dark:border-gray-800">
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

            {/* Main Content - Card List */}
            <main className="flex-1 bg-white dark:bg-[#111111] px-5 py-4 space-y-1">
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
              <div className="h-20" />
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
          <span className={`text-[10px] ${activeMainTab === 'game' ? 'text-primary font-bold' : 'text-toss-gray-600 dark:text-gray-400'}`}>게임</span>
        </div>
        <div className="flex flex-col items-center gap-1 cursor-pointer">
          <span className="material-symbols-outlined text-toss-gray-200 dark:text-gray-600">menu</span>
          <span className="text-[10px] text-toss-gray-600 dark:text-gray-400">전체</span>
        </div>
      </nav>

      {/* Floating Chatbot Button */}
      <div className="fixed bottom-24 right-6 z-30 sm:right-[calc(50%-215px+24px)]">
        <button
          onClick={scrollToChatbot}
          className="bg-primary text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
        </button>
      </div>

      {/* AI Chatbot Section */}
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
        <div className="h-20" />
      </section>

      {/* Card Detail Bottom Sheet */}
      {selectedCard && (
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

            {/* Action Button */}
            <button
              onClick={() => {
                alert(`${selectedCard.name} 카드 신청 페이지로 이동합니다.`);
                setSelectedCard(null);
              }}
              className="w-full bg-primary text-white py-[18px] rounded-[22px] font-bold text-[18px] shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all transform mb-2"
            >
              카드 신청하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
