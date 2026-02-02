import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard,
  Trophy,
  Info,
  MessageSquare,
  Send,
  X,
  ChevronRight,
  Sparkles,
  Search,
  LayoutGrid,
  TrendingUp,
  User
} from 'lucide-react';
import { CARD_DATA } from './data/popularCards';

const App = () => {
  const [cardData, setCardData] = useState(CARD_DATA);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState("신한카드");
  const [selectedCard, setSelectedCard] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '안녕하세요! 카드 추천 AI 챗봇입니다. 평소 소비 습관이나 원하시는 혜택(예: 주유, 쇼핑, 공과금)을 말씀해 주시면 딱 맞는 카드를 찾아드릴게요!' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/cards');
        const result = await response.json();
        if (result.data) {
          setCardData(result.data);
          setLastUpdate(result.lastUpdate);
        }
      } catch (error) {
        console.error('Failed to fetch real-time cards:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue(''); ``
    setIsTyping(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const systemInstruction = `
        당신은 대한민국 최고의 카드 추천 전문가입니다. 
        사용자의 질문을 분석하여 다음 카드 데이터베이스를 바탕으로 가장 적합한 카드를 2~3개 추천해주세요.
        추천할 때는 카드 이름, 주요 혜택, 그리고 왜 추천하는지에 대한 이유를 친절하고 명확하게 설명해주세요.
        카드 데이터: ${JSON.stringify(cardData)}
        사용자가 구체적인 소비액을 말하면 예상 피드백을 주시고, 말투는 신뢰감 있고 상냥하게 하세요.
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: inputValue }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] }
        })
      });

      const data = await response.json();
      const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "죄송합니다. 현재 추천 엔진에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";

      setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "네트워크 오류가 발생했습니다. 나중에 다시 물어봐 주세요." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-indigo-200 shadow-lg">
              <CreditCard className="text-white w-5 h-5 md:w-6 md:h-6" />
            </div>
            <h1 className="text-lg md:text-xl font-black tracking-tighter text-indigo-900 uppercase">
              Card <span className="text-indigo-600">Smart</span>
            </h1>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-bold text-slate-500">
            <a href="#" className="hover:text-indigo-600 transition-colors">실시간 랭킹</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">테마별 추천</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">나의 맞춤카드</a>
          </div>
          <button className="bg-slate-50 hover:bg-slate-100 p-2.5 rounded-full border border-slate-200 transition-all active:scale-90">
            <User className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-indigo-900 text-white py-12 px-4 overflow-hidden relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between relative z-10">
          <div className="md:w-1/2 mb-8 md:mb-0">
            <div className="inline-flex items-center gap-2 bg-indigo-800/50 px-3 py-1 rounded-full text-indigo-200 text-sm mb-4 border border-indigo-700">
              <TrendingUp className="w-4 h-4" /> {lastUpdate ? `${new Date(lastUpdate).toLocaleString()} 실시간 데이터` : '실시간 데이터 집계 중...'}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">Space D 선정<br />인기 카드 TOP 10</h2>
            <p className="text-indigo-100 text-lg opacity-80 mb-6">대한민국 모든 카드사의 혜택을 한눈에 비교하고, AI 챗봇을 통해 당신에게 딱 맞는 카드를 추천받으세요.</p>
            <div className="flex gap-3">
              <button className="bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg">무실적 카드 찾기</button>
              <button className="border border-indigo-400 text-indigo-100 px-6 py-3 rounded-xl font-bold hover:bg-indigo-800 transition-colors">이벤트 전체보기</button>
            </div>
          </div>
          <div className="flex-1 flex justify-center relative scale-90 md:scale-100">
            <div className="relative w-72 h-44 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-[2rem] shadow-2xl transform rotate-[10deg] hover:rotate-0 transition-all duration-700 border border-white/30 flex flex-col p-8 justify-between group overflow-hidden">
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-between items-start">
                <div className="w-12 h-10 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-lg shadow-inner"></div>
                <div className="flex gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-white/20"></div>
                  <div className="w-6 h-6 rounded-full bg-white/10"></div>
                </div>
              </div>
              <div>
                <div className="text-white/60 text-[10px] font-bold tracking-widest uppercase mb-1">Smart Advisor Card</div>
                <div className="text-white font-mono tracking-[0.2em] text-xl">5421 2026 **** ****</div>
              </div>
              {/* Pulsing glow */}
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-3xl group-hover:bg-white/40 transition-all"></div>
            </div>
          </div>
        </div>
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-[120px] opacity-20 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full blur-[120px] opacity-20 translate-y-1/2"></div>
      </section>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Company Tabs */}
        <div className="flex overflow-x-auto gap-3 mb-12 no-scrollbar pb-4 -mx-4 px-4">
          {Object.keys(cardData).map(company => (
            <button
              key={company}
              onClick={() => setSelectedCompany(company)}
              className={`px-8 py-3.5 rounded-2xl text-sm font-black whitespace-nowrap transition-all duration-300
                ${selectedCompany === company
                  ? 'bg-indigo-600 text-white shadow-premium scale-105 border-transparent'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}
            >
              {company}
            </button>
          ))}
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cardData[selectedCompany].map((card, idx) => (
            <div
              key={card.id}
              onClick={() => setSelectedCard(card)}
              className="bg-white border border-slate-200 rounded-[2rem] p-8 hover:shadow-premium hover:-translate-y-2 transition-all duration-300 cursor-pointer group relative flex flex-col h-full overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-[4rem] -z-10 group-hover:bg-indigo-100/50 transition-colors"></div>
              <div className="absolute top-6 left-6 flex items-baseline gap-1">
                <span className="text-3xl font-black text-indigo-600 tracking-tighter">{card.rank}</span>
                <span className="text-[10px] font-bold text-indigo-400 uppercase">RANK</span>
              </div>
              <div className="flex flex-col items-center text-center mt-8 mb-8">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-5xl mb-4 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                  {card.image}
                </div>
                <h3 className="font-extrabold text-xl mb-1 text-slate-900 group-hover:text-indigo-600 transition-colors">{card.name}</h3>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedCompany}</span>
              </div>
              <div className="space-y-3 mb-8 flex-grow">
                {card.benefits.slice(0, 3).map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50/50 p-3 rounded-2xl border border-slate-100 font-medium">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm"></div>
                    <span className="line-clamp-1">{benefit}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-6 border-t border-slate-100 mt-auto">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-0.5">Annual Fee</span>
                  <span className="text-sm font-bold text-slate-800">{card.fee}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-black text-indigo-600 group-hover:gap-3 transition-all">
                  VIEW DETAIL <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Placeholder for remaining cards in top 10 */}
        {cardData[selectedCompany].length < 10 && (
          <div className="mt-8 p-12 text-center bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300">
            <div className="mx-auto w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-4">
              <Info className="text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">나머지 {10 - cardData[selectedCompany].length}개 카드는 현재 실시간 데이터 집계 중입니다.</p>
          </div>
        )}
      </main>

      {/* Card Detail Modal / Bottom Sheet */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedCard(null)}>
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-t-[2.5rem] md:rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up md:animate-zoom-in"
          >
            <div className="md:hidden bottom-sheet-drag"></div>
            <div className="relative h-44 md:h-52 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 p-8 flex items-end">
              <button
                onClick={() => setSelectedCard(null)}
                className="absolute top-6 right-6 p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex gap-6 items-center">
                <div className="w-20 h-28 bg-white/10 border border-white/20 rounded-2xl backdrop-blur-xl flex items-center justify-center p-2 shadow-2xl overflow-hidden">
                  <span className="text-6xl drop-shadow-lg">{selectedCard.image}</span>
                </div>
                <div className="mb-2">
                  <h2 className="text-2xl md:text-3xl font-black text-white mb-1 tracking-tight">{selectedCard.name}</h2>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold text-white uppercase tracking-wider">{selectedCompany}</span>
                    <span className="text-indigo-100/70 text-xs font-bold">인기 {selectedCard.rank}위</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] md:max-h-none no-scrollbar">
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" /> Editor's Review
                </h4>
                <p className="text-slate-700 bg-slate-50 p-5 rounded-3xl text-sm leading-relaxed border border-slate-100 font-medium italic shadow-inner">
                  "{selectedCard.desc}"
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-1 hover:border-indigo-100 transition-colors">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Annual Fee</span>
                  <span className="text-lg font-black text-slate-800">{selectedCard.fee}</span>
                </div>
                <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-1 hover:border-indigo-100 transition-colors">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Spending</span>
                  <span className="text-lg font-black text-slate-800">{selectedCard.record}</span>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Core Benefits</h4>
                <div className="space-y-3">
                  {selectedCard.benefits.map((b, i) => (
                    <div key={i} className="flex gap-4 items-center text-slate-700 text-sm p-4 bg-slate-50/50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-premium transition-all group">
                      <div className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                        <span className="text-xs font-black text-indigo-600">{i + 1}</span>
                      </div>
                      <span className="font-semibold">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-lg hover:bg-indigo-700 transition-all shadow-premium hover:-translate-y-1 active:scale-95">
                지금 바로 신청하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Chatbot */}
      <div className={`fixed bottom-6 right-6 z-40 flex flex-col items-end transition-all duration-500 ${isChatOpen ? 'w-full h-full md:w-[420px] md:h-[600px] mobile-full' : 'w-16 h-16'}`}>
        {isChatOpen && (
          <div className="bg-white md:rounded-[2.5rem] shadow-2xl border-none w-full h-full md:h-[600px] flex flex-col mb-0 md:mb-4 overflow-hidden animate-slide-up md:animate-zoom-in">
            {/* Chat Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white flex justify-between items-center shrink-0 md:rounded-t-[2.5rem]">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg animate-bounce">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-base font-black tracking-tight">AI Smart Advisor</p>
                  <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest">Gemini Real-time Intelligence</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2.5 hover:bg-white/10 rounded-full transition-all border border-white/5 backdrop-blur-sm">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-slate-50 no-scrollbar">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] md:max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed shadow-premium animate-fade-in
                    ${msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-700 rounded-tl-none font-medium'}`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-3xl rounded-tl-none shadow-premium flex gap-1.5 border border-slate-100">
                    <span className="w-2 h-2 bg-indigo-200 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-6 bg-white border-t border-slate-100 flex gap-3 pb-8 md:pb-6">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="어떤 카드를 찾고 계신가요?"
                className="flex-grow bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:font-medium font-semibold"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="bg-indigo-600 text-white p-4 rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 active:scale-90"
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`p-5 rounded-full shadow-2xl flex items-center justify-center transition-all duration-700 scale-110 active:scale-95 z-50
            ${isChatOpen ? 'bg-slate-900 rotate-90 opacity-0 pointer-events-none' : 'bg-indigo-600 translate-y-0'}`}
        >
          <MessageSquare className="text-white w-8 h-8" />
          {!isChatOpen && (
            <span className="absolute -top-1 -right-1 flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-indigo-500 border-2 border-white"></span>
            </span>
          )}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default App;
