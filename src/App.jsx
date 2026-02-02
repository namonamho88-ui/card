import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
    setInputValue('');
    setIsTyping(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error('API_KEY_MISSING');
      }

      // Optimize card data to reduce token usage
      const optimizedCardData = Object.entries(cardData).reduce((acc, [corp, cards]) => {
        acc[corp] = cards.map(c => ({
          name: c.name,
          benefits: c.benefits.slice(0, 2), // Top 2 benefits only
          fee: c.fee
        }));
        return acc;
      }, {});

      const systemInstruction = `
        당신은 대한민국 최고의 카드 추천 전문가입니다. 
        사용자의 질문을 분석하여 다음 카드 데이터베이스를 바탕으로 가장 적합한 카드를 **최대 3개** 추천해주세요.
        추천 결과는 반드시 **Markdown 표(Table)** 형식을 사용하여 출력해주세요.
        표의 열(Column) 구성: [카드 이름 | 주요 혜택 | 추천 이유]
        말투는 신뢰감 있고 상냥하게 하되, 표 외의 설명은 최소화하여 한눈에 들어오게 하세요. 전체 답변은 5줄 내외로 간결하게 작성하세요.
        카드 데이터: ${JSON.stringify(optimizedCardData)}
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: inputValue }] }],
          system_instruction: { parts: [{ text: systemInstruction }] }
        })
      });

      const data = await response.json();

      if (data.error) {
        console.error('Gemini API Error:', data.error);
        throw new Error(data.error.message || 'API_RESPONSE_ERROR');
      }

      const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "죄송합니다. 답변을 생성하는 중에 문제가 발생했습니다.";

      setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);
    } catch (error) {
      console.error('Chatbot Error:', error);
      let errorMessage = "네트워크 오류가 발생했습니다. 나중에 다시 물어봐 주세요.";
      if (error.message === 'API_KEY_MISSING') {
        errorMessage = "API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.";
      }
      setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 leading-relaxed overflow-x-hidden">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <CreditCard className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-indigo-900 uppercase">CARD <span className="text-indigo-600">SMART</span></h1>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-bold text-slate-500">
            <a href="#" className="hover:text-indigo-600 transition-colors">실시간 랭킹</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">테마별 추천</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">나의 맞춤카드</a>
          </div>
          <button className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
            <User className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-indigo-900 text-white py-12 px-4 overflow-hidden relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between relative z-10">
          <div className="md:w-3/5 mb-8 md:mb-0">
            <div className="inline-flex items-center gap-2 bg-indigo-800/50 px-3 py-1 rounded-full text-indigo-200 text-xs font-bold mb-4 border border-indigo-700">
              <TrendingUp className="w-4 h-4" /> {lastUpdate ? `${new Date(lastUpdate).toLocaleString()} 기준 실시간 데이터` : '실시간 데이터 분석 중...'}
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight tracking-tight">Space D가 추천하는<br />최고의 TOP 10 카드</h2>
            <p className="text-indigo-100/80 text-base md:text-lg font-medium mb-0 max-w-lg leading-relaxed">
              대한민국의 모든 인기 카드를 한눈에 비교하고,<br className="hidden md:block" />
              AI와 함께 당신에게 꼭 맞는 혜택을 찾아보세요.
            </p>
          </div>
          <div className="md:w-1/3 flex justify-center relative">
            <div className="relative w-64 h-40 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl transform rotate-12 hover:rotate-0 transition-all duration-500 border border-white/20 flex flex-col p-6 justify-between group overflow-hidden">
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-between items-start">
                <div className="w-10 h-8 bg-yellow-400/90 rounded shadow-inner"></div>
                <CreditCard className="text-white/40" />
              </div>
              <div className="text-white font-mono tracking-widest text-lg">**** **** **** 2026</div>
              <div className="text-white/70 text-[10px] font-black uppercase tracking-widest">Smart Card Advisor</div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-3xl group-hover:bg-white/40 transition-all"></div>
            </div>
          </div>
        </div>
        {/* Background effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-[120px] opacity-20 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full blur-[120px] opacity-20 translate-y-1/2"></div>
      </section>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col gap-6 mb-8">
          <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">카드사별 인기 순위</h3>
          {/* Company Tabs - Flex Wrap fixed for mobile readability */}
          <div className="flex flex-wrap gap-2 pb-2">
            {Object.keys(cardData).map(company => (
              <button
                key={company}
                onClick={() => setSelectedCompany(company)}
                className={`px-5 py-2.5 rounded-full text-sm font-black whitespace-nowrap transition-all shadow-sm border
                  ${selectedCompany === company
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-100'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}
              >
                {company}
              </button>
            ))}
          </div>
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {cardData[selectedCompany].map((card) => (
            <div
              key={card.id}
              onClick={() => setSelectedCard(card)}
              className="bg-white border border-slate-200 rounded-[2rem] p-8 hover:shadow-2xl transition-all duration-300 cursor-pointer group relative flex flex-col h-full"
            >
              {/* High Contrast Rank Badge */}
              <div className="absolute top-6 left-6 bg-indigo-600 text-white font-black w-10 h-10 rounded-full flex items-center justify-center text-sm shadow-xl ring-4 ring-white group-hover:scale-110 transition-transform">
                {card.rank}
              </div>

              <div className="flex flex-col items-center text-center mt-6 mb-8">
                <div className="w-20 h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-5xl mb-4 group-hover:rotate-6 transition-transform duration-500 shadow-inner">
                  {card.image}
                </div>
                <h3 className="font-black text-lg md:text-xl mb-1 text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight line-clamp-1">{card.name}</h3>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{selectedCompany}</span>
              </div>

              <div className="space-y-3 mb-8 flex-grow">
                {card.benefits.slice(0, 3).map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100 font-bold group-hover:bg-white transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                    <span className="line-clamp-1">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-slate-100 mt-auto">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-0.5">연회비</span>
                  <span className="text-sm font-black text-slate-800">{card.fee}</span>
                </div>
                <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  상세보기
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Placeholder for remaining cards */}
        {cardData[selectedCompany].length < 10 && (
          <div className="mt-8 p-12 text-center bg-slate-100/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <Info className="mx-auto text-slate-400 w-8 h-8 mb-3" />
            <p className="text-slate-500 font-bold">나머지 {10 - cardData[selectedCompany].length}개 항목 수집 중</p>
          </div>
        )}
      </main>

      {/* Card Detail Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/70 backdrop-blur-md transition-all" onClick={() => setSelectedCard(null)}>
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-zoom-in"
          >
            <div className="relative h-48 bg-indigo-900 p-8 flex items-end">
              <button
                onClick={() => setSelectedCard(null)}
                className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all backdrop-blur-md"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex gap-6 items-center">
                <div className="w-20 h-28 bg-white/10 border border-white/20 rounded-2xl backdrop-blur-xl flex items-center justify-center shadow-2xl">
                  <span className="text-6xl">{selectedCard.image}</span>
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-white mb-1 tracking-tight">{selectedCard.name}</h2>
                  <p className="text-indigo-200 text-xs font-black uppercase tracking-widest">{selectedCompany} · 인기 {selectedCard.rank}위</p>
                </div>
              </div>
            </div>
            <div className="p-8 space-y-7">
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" /> AI Insights
                </h4>
                <p className="text-slate-700 bg-slate-50 p-5 rounded-2xl text-sm leading-relaxed border border-slate-100 font-bold italic">
                  "{selectedCard.desc}"
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">연회비</span>
                  <span className="text-xl font-black text-slate-800">{selectedCard.fee}</span>
                </div>
                <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">전월 실적</span>
                  <span className="text-xl font-black text-slate-800">{selectedCard.record}</span>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">상세 혜택</h4>
                <div className="space-y-2.5">
                  {selectedCard.benefits.map((b, i) => (
                    <div key={i} className="flex gap-4 items-center text-slate-700 text-sm p-4 bg-white border border-slate-200 rounded-2xl font-bold">
                      <div className="w-6 h-6 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-black text-indigo-600">{i + 1}</span>
                      </div>
                      {b}
                    </div>
                  ))}
                </div>
              </div>
              <button className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-lg hover:bg-indigo-700 transition-all shadow-lg active:scale-95">
                신청하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Chatbot */}
      <div className={`fixed bottom-6 right-6 z-40 flex flex-col items-end transition-all duration-300 ${isChatOpen ? 'w-[360px] md:w-[420px]' : 'w-16'}`}>
        {isChatOpen && (
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full h-[550px] flex flex-col mb-4 overflow-hidden animate-slide-up">
            {/* Chat Header - Glassmorphism */}
            <div className="p-5 bg-indigo-600/95 backdrop-blur-lg text-white flex justify-between items-center shrink-0 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md border border-white/20">
                  <Sparkles className="w-5 h-5 text-indigo-100" />
                </div>
                <div>
                  <p className="text-sm font-black tracking-tight">AI Advisor</p>
                  <p className="text-[9px] text-indigo-200 font-bold uppercase tracking-[0.2em] opacity-80">Premium Recommendation</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2.5 hover:bg-white/10 rounded-full transition-all active:scale-90">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-grow overflow-y-auto p-5 space-y-6 bg-slate-50/50 no-scrollbar">
              {messages.map((msg, i) => (
                <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 mb-1 border border-indigo-200">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                    </div>
                  )}
                  <div className={`max-w-[85%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm animate-zoom-in
                    ${msg.role === 'user'
                      ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-none font-medium'
                      : 'bg-white text-slate-700 rounded-tl-none border border-slate-200 chat-markdown-content font-bold shadow-indigo-100/50'}`}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-[1.75rem] rounded-tl-none border border-slate-200 flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-white border-t border-slate-100">
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="어떤 혜택을 원하시나요?"
                  className="flex-grow bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className="absolute right-2 bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 transition-all active:scale-90 disabled:opacity-30 shadow-lg shadow-indigo-100"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-center text-[9px] text-slate-400 mt-3 font-bold uppercase tracking-[0.1em]">Space D AI Assistant</p>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`group p-4 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500 
            ${isChatOpen ? 'bg-indigo-600 rotate-90 scale-90' : 'bg-indigo-600 hover:scale-110 hover:shadow-indigo-200'}`}
        >
          {isChatOpen ? <X className="text-white w-7 h-7" /> : <MessageSquare className="text-white w-7 h-7 group-hover:animate-pulse" />}
          {!isChatOpen && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-indigo-500 border-2 border-white"></span>
            </span>
          )}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
        
        :root {
          --font-pretendard: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif;
        }
        
        body {
          font-family: var(--font-pretendard);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          letter-spacing: -0.01em;
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Chat Markdown Table Styling */
        .chat-markdown-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
          font-size: 13px;
          background: #f8fafc;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }
        .chat-markdown-content th, .chat-markdown-content td {
          padding: 12px 10px;
          border-bottom: 1px solid #e2e8f0;
          text-align: left;
        }
        .chat-markdown-content th {
          background: #f1f5f9;
          font-weight: 800;
          color: #475569;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .chat-markdown-content td {
          color: #1e293b;
          font-weight: 600;
          line-height: 1.5;
        }
        .chat-markdown-content tr:last-child td {
          border-bottom: none;
        }

        /* Mobile specific adjustments */
        @media (max-width: 768px) {
          .chat-markdown-content table {
            font-size: 11px;
          }
          .chat-markdown-content th, .chat-markdown-content td {
            padding: 10px 6px;
          }
        }
        
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes zoom-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-zoom-in { animation: zoom-in 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}} />
    </div>
  );
};

export default App;
