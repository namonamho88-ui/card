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
      // Only attempt to fetch from local scraper if running on localhost
      if (window.location.hostname !== 'localhost') {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:3001/api/cards');
        const result = await response.json();
        if (result.data) {
          setCardData(result.data);
          setLastUpdate(result.lastUpdate);
        }
      } catch (error) {
        console.warn('Scraper server is not running locally. Using built-in data.');
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
      {/* Header - Slim & Professional */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black tracking-tighter text-indigo-900">CARDGORILLA</h1>
            <div className="h-4 w-px bg-slate-200 hidden md:block"></div>
            <span className="text-xs font-bold text-slate-400 hidden md:block uppercase tracking-widest">Premium Chart</span>
          </div>
          <div className="hidden md:flex gap-10 text-[13px] font-bold text-slate-600">
            <a href="#" className="text-indigo-600 border-b-2 border-indigo-600 h-14 flex items-center">랭킹</a>
            <a href="#" className="hover:text-indigo-600 transition-colors h-14 flex items-center">카드추천</a>
            <a href="#" className="hover:text-indigo-600 transition-colors h-14 flex items-center">매거진</a>
          </div>
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-slate-400 cursor-pointer" />
            <button className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-indigo-100 transition-colors">로그인</button>
          </div>
        </div>
      </header>

      {/* Hero Section - Chart Heading Style */}
      <section className="bg-[#f8fafc] py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-1 bg-indigo-600 rounded-full"></div>
            <span className="text-sm font-black text-indigo-600 uppercase tracking-widest">Weekly TOP 30</span>
            <div className="w-10 h-1 bg-indigo-600 rounded-full"></div>
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight tracking-tight text-slate-900">
            고릴라차트 <span className="text-indigo-600">신용카드</span>
          </h2>
          <p className="text-slate-500 text-base md:text-lg font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
            {lastUpdate ? `${new Date(lastUpdate).toLocaleDateString()} 업데이트 · ` : ''}
            우리나라 카드 소비자들이 가장 많이 찾는 카드 순위
          </p>

          {/* Chart Filter Tabs */}
          <div className="chart-tab-container">
            <button className="chart-tab chart-tab-active">주간차트</button>
            <button className="chart-tab">월간차트</button>
            <button className="chart-tab">전체차트</button>
          </div>
        </div>
      </section>

      {/* Main Content - Ranking List */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4 border-b border-slate-200 pb-6">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">신용카드 인기순위</h3>
            <div className="flex items-center gap-2 text-sm text-slate-400 font-bold">
              <span>카드사별 보기</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Company Filter Tabs - Professional Style */}
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(cardData).map(company => (
              <button
                key={company}
                onClick={() => setSelectedCompany(company)}
                className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all
                  ${selectedCompany === company
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-slate-100'}`}
              >
                {company}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal Ranking List */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100">
          {cardData[selectedCompany].map((card) => (
            <div
              key={card.id}
              onClick={() => setSelectedCard(card)}
              className="horizontal-card group"
            >
              {/* Rank */}
              <div className={`rank-display ${card.rank <= 3 ? 'rank-top' : ''}`}>
                {card.rank}
              </div>

              {/* Card Image mockup */}
              <div className="flex justify-center">
                <div className="card-mockup-vertical" style={{
                  background: card.rank === 1 ? 'linear-gradient(135deg, #4f46e5, #3730a3)' :
                    card.rank === 2 ? 'linear-gradient(135deg, #1e293b, #0f172a)' :
                      card.rank === 3 ? 'linear-gradient(135deg, #475569, #1e293b)' :
                        'linear-gradient(135deg, #94a3b8, #64748b)'
                }}>
                  <CreditCard className="text-white/30 w-10 h-10" />
                </div>
              </div>

              {/* Card Info & Benefits */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-indigo-600 mb-1 uppercase tracking-wider">{selectedCompany}</span>
                  <h3 className="font-black text-xl text-slate-900 group-hover:text-indigo-600 transition-colors">{card.name}</h3>
                </div>

                <div className="flex flex-wrap gap-2 card-benefits">
                  {card.benefits.slice(0, 3).map((benefit, i) => (
                    <div key={i} className="benefit-tag">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col items-end gap-2 card-actions">
                <button className="w-full bg-slate-900 text-white py-3 px-6 rounded-xl text-sm font-black hover:bg-slate-800 transition-all shadow-lg active:scale-95">
                  카드 신청
                </button>
                <button className="w-full bg-white text-slate-500 border border-slate-200 py-3 px-6 rounded-xl text-sm font-black hover:border-slate-900 hover:text-slate-900 transition-all active:scale-95">
                  자세히 보기
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty placeholder */}
        {cardData[selectedCompany].length === 0 && (
          <div className="p-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <Info className="mx-auto text-slate-300 w-12 h-12 mb-4" />
            <p className="text-slate-400 font-bold">해당 카드사의 랭킹 데이터를 불러오는 중입니다.</p>
          </div>
        )}
      </main>

      {/* Card Detail Modal - Refined & Clean */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm transition-all" onClick={() => setSelectedCard(null)}>
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl overflow-hidden animate-zoom-in"
          >
            <div className="relative p-8 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-16 h-24 bg-indigo-600 rounded-lg shadow-lg flex items-center justify-center shrink-0">
                  <CreditCard className="w-8 h-8 text-white/40" />
                </div>
                <div>
                  <span className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-1 block">{selectedCompany}</span>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{selectedCard.name}</h2>
                </div>
              </div>
              <button
                onClick={() => setSelectedCard(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-6 bg-slate-50 rounded-2xl flex flex-col gap-1">
                  <span className="text-[11px] uppercase font-black text-slate-400 tracking-wider">연회비</span>
                  <span className="text-lg font-black text-slate-800">{selectedCard.fee}</span>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl flex flex-col gap-1">
                  <span className="text-[11px] uppercase font-black text-slate-400 tracking-wider">전월 실적</span>
                  <span className="text-lg font-black text-slate-800">{selectedCard.record || '30만원 이상'}</span>
                </div>
              </div>

              <div className="mb-8">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">주요 혜택</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedCard.benefits.map((b, i) => (
                    <div key={i} className="flex gap-4 items-center text-slate-700 text-sm p-4 bg-white border border-slate-100 rounded-xl font-bold">
                      <div className="w-6 h-6 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-black text-indigo-600">{i + 1}</span>
                      </div>
                      <span className="line-clamp-2">{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-grow bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-lg active:scale-95">
                  카드 신청하기
                </button>
                <button className="px-8 bg-white text-slate-500 border border-slate-200 rounded-2xl font-black hover:border-slate-900 hover:text-slate-900 transition-all">
                  비교함
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Chatbot */}
      <div className={`fixed z-40 flex flex-col items-end transition-all duration-300 md:bottom-6 md:right-6 
        ${isChatOpen
          ? 'inset-x-0 bottom-0 top-0 md:inset-auto md:w-[420px] md:h-[600px]'
          : 'bottom-6 right-6 w-16 h-16'}`}>

        {isChatOpen && (
          <div className="bg-white md:rounded-[2.5rem] shadow-2xl border border-slate-200 w-full h-full flex flex-col overflow-hidden animate-slide-up">
            {/* Chat Header - Glassmorphism */}
            <div className="p-4 md:p-5 bg-indigo-600/95 backdrop-blur-lg text-white flex justify-between items-center shrink-0 border-b border-white/10 pt-safe">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md border border-white/20">
                  <Sparkles className="w-5 h-5 text-indigo-100" />
                </div>
                <div>
                  <p className="text-[15px] font-black tracking-tight leading-none mb-1">AI Advisor</p>
                  <p className="text-[9px] text-indigo-200 font-bold uppercase tracking-[0.2em] opacity-80 leading-none">Premium Recommendation</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2.5 hover:bg-white/10 rounded-full transition-all active:scale-90">
                <X className="w-6 h-6 md:w-5 md:h-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-grow overflow-y-auto p-4 md:p-5 space-y-6 bg-slate-50/50 no-scrollbar">
              {messages.map((msg, i) => (
                <div key={i} className={`flex items-start gap-2.5 md:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {msg.role === 'assistant' ? (
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 mt-1 shadow-sm border border-white/20">
                      <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl md:rounded-2xl bg-white flex items-center justify-center shrink-0 mt-1 border border-slate-200 shadow-sm">
                      <User className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                    </div>
                  )}
                  <div className={`max-w-[82%] md:max-w-[78%] p-3.5 md:p-4 rounded-[1.25rem] md:rounded-3xl text-[14px] md:text-[13.5px] leading-relaxed shadow-sm animate-zoom-in font-medium
                    ${msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-700 rounded-tl-none border border-slate-200 chat-markdown-content shadow-indigo-100/30'}`}
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

            {/* Chat Input - Fixed & Clean */}
            <div className="p-4 bg-white border-t border-slate-100 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
              <div className="relative flex items-center gap-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="어떤 카드를 찾으시나요?"
                  className="flex-grow bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-[15px] md:text-[14px] font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-40 shadow-lg shadow-indigo-100/50 flex items-center justify-center"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
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
        .chat-markdown-content {
          overflow-wrap: break-word;
          word-break: break-word;
        }
        .chat-markdown-content table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin: 16px 0;
          font-size: 12px;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .chat-markdown-content th, .chat-markdown-content td {
          padding: 10px 8px;
          border-bottom: 1px solid #f1f5f9;
          text-align: left;
        }
        .chat-markdown-content th {
          background: #f8fafc;
          font-weight: 800;
          color: #64748b;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .chat-markdown-content td {
          color: #334155;
          font-weight: 700;
          line-height: 1.4;
        }
        .chat-markdown-content tr:last-child td {
          border-bottom: none;
        }
        .chat-markdown-content p {
          margin-bottom: 8px;
        }
        .chat-markdown-content p:last-child {
          margin-bottom: 0;
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
