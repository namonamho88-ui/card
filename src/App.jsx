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
  User,
  ArrowRight,
  Bot
} from 'lucide-react';
import { CARD_DATA } from './data/popularCards';

const App = () => {
  const [cardData, setCardData] = useState(CARD_DATA);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState("신한카드");
  const [selectedCard, setSelectedCard] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '안녕하세요! 당신에게 꼭 맞는 최고의 카드를 찾아드리는 AI 어드바이저입니다. 평소 소비 습관이나 선호하는 혜택을 말씀해 주시면 분석을 시작할게요!' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const fetchCards = async () => {
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
      if (!apiKey) throw new Error('API_KEY_MISSING');

      const optimizedCardData = Object.entries(cardData).reduce((acc, [corp, cards]) => {
        acc[corp] = cards.map(c => ({
          name: c.name,
          benefits: c.benefits.slice(0, 2),
          fee: c.fee
        }));
        return acc;
      }, {});

      const systemInstruction = `당신은 대한민국 최고의 카드 추천 전문가입니다. 사용자의 질문을 분석하여 다음 카드 데이터베이스를 바탕으로 가장 적합한 카드를 **최대 3개** 추천해주세요. 추천 결과는 반드시 **Markdown 표(Table)** 형식을 사용하여 출력해주세요. 표의 열(Column) 구성: [카드 이름 | 주요 혜택 | 추천 이유]. 전체 답변은 간결하게 작성하세요. 카드 데이터: ${JSON.stringify(optimizedCardData)}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: inputValue }] }],
          system_instruction: { parts: [{ text: systemInstruction }] }
        })
      });

      const data = await response.json();
      const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "죄송합니다. 답변을 생성하는 중에 문제가 발생했습니다.";
      setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);
    } catch (error) {
      console.error('Chatbot Error:', error);
      let errorMessage = "네트워크 오류가 발생했습니다. 나중에 다시 물어봐 주세요.";
      if (error.message === 'API_KEY_MISSING') errorMessage = "API 키가 설정되지 않았습니다.";
      setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Mini Header */}
      <header className="border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="container-centered h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <span className="text-lg font-black tracking-tighter">CARD SMART AI</span>
          </div>
          <div className="flex gap-6 text-sm font-bold text-slate-500">
            <a href="#" className="hover:text-indigo-600 transition-colors">실시간 차트</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">AI 추천</a>
          </div>
          <button className="bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-slate-800 transition-all">
            시작하기
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="section-padding overflow-hidden relative">
        <div className="container-centered text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black mb-8 animate-fade-in">
            <Bot className="w-4 h-4" /> AI-DRIVEN CARD SEARCH
          </div>
          <h1 className="text-4xl md:text-6xl mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            당신의 라이프스타일에 딱 맞는<br />
            <span className="text-indigo-600">진짜 혜택</span>을 찾아보세요
          </h1>
          <p className="text-slate-500 text-lg md:text-xl font-medium mb-12 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
            복잡한 카드 비교는 이제 그만. AI가 수천 개의 카드 데이터를 분석하여 당신만을 위한 최적의 카드를 즉시 추천합니다.
          </p>

          {/* Integrated Chat Assistant Component */}
          <div className="max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="chat-container-integrated shadow-2xl shadow-indigo-100/50">
              <div className="flex-grow overflow-y-auto p-6 space-y-6 no-scrollbar">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant shadow-sm'}`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="chat-bubble chat-bubble-assistant flex gap-1.5 items-center">
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 bg-white border-t border-slate-100">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="예: 주유 혜택이 많은 카드를 알려줘"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all pr-12"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim()}
                    className="absolute right-2 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-30 transition-all"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Background Decorative Elements */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-20 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl"></div>
      </section>

      {/* Recommended Section (Based on Ranking) */}
      <section className="section-padding bg-slate-50/50">
        <div className="container-centered">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <h2 className="text-3xl mb-2">실시간 인기 카드</h2>
              <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">Weekly Data Update</p>
            </div>
            <div className="flex gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar max-w-full">
              {Object.keys(cardData).map(company => (
                <button
                  key={company}
                  onClick={() => setSelectedCompany(company)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap
                    ${selectedCompany === company
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-400 hover:text-slate-900'}`}
                >
                  {company}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {cardData[selectedCompany].slice(0, 4).map((card, i) => (
              <div
                key={card.id}
                className="card-best group cursor-pointer"
                onClick={() => setSelectedCard(card)}
              >
                <div className="flex gap-8 items-start">
                  <div className="relative shrink-0">
                    <div className="w-24 h-36 bg-slate-900 rounded-xl shadow-2xl flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-500"
                      style={{ background: i === 0 ? 'linear-gradient(135deg, #4f46e5, #3730a3)' : 'linear-gradient(135deg, #1e293b, #030712)' }}>
                      <CreditCard className="text-white/20 w-12 h-12" />
                    </div>
                    <div className="absolute -top-3 -left-3 w-10 h-10 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center text-lg font-black italic shadow-md">
                      {card.rank}
                    </div>
                  </div>
                  <div className="flex-grow">
                    <span className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2 block">{selectedCompany}</span>
                    <h3 className="text-2xl mb-4 group-hover:text-indigo-600 transition-colors line-clamp-1">{card.name}</h3>
                    <div className="space-y-2 mb-6">
                      {card.benefits.slice(0, 2).map((benefit, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                          <span className="line-clamp-1">{benefit}</span>
                        </div>
                      ))}
                    </div>
                    <button className="text-sm font-black text-slate-900 flex items-center gap-1 group-hover:gap-2 transition-all">
                      자세히 보기 <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Detail Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedCard(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden p-10 relative">
            <button onClick={() => setSelectedCard(null)} className="absolute top-8 right-8 p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
            <div className="flex flex-col md:flex-row gap-10">
              <div className="w-40 h-60 bg-slate-900 rounded-2xl shadow-2xl shrink-0 flex items-center justify-center overflow-hidden relative">
                <CreditCard className="text-white/20 w-20 h-20" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              </div>
              <div className="flex-grow pt-4">
                <span className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2 block">{selectedCompany} · RANKING {selectedCard.rank}</span>
                <h2 className="text-3xl md:text-4xl mb-6">{selectedCard.name}</h2>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">연회비</span>
                    <span className="text-lg font-bold">{selectedCard.fee}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">전월 실적</span>
                    <span className="text-lg font-bold">{selectedCard.record || '30만원'}</span>
                  </div>
                </div>
                <div className="space-y-3 mb-10">
                  <span className="text-[10px] font-black text-slate-400 uppercase block mb-4">주요 혜택 안내</span>
                  {selectedCard.benefits.map((b, i) => (
                    <div key={i} className="flex gap-4 items-center bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                      <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-black text-sm shrink-0">{i + 1}</div>
                      <span className="text-sm font-bold text-slate-600">{b}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full btn-primary text-lg py-5">
                  카드 신청 페이지로 이동
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default App;
