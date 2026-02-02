import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  CreditCard,
  X,
  Send,
  Sparkles,
  ChevronRight,
  TrendingUp,
  MessageCircle,
  Clock,
  ExternalLink,
  Filter,
  ArrowRight
} from 'lucide-react';
import { CARD_DATA } from './data/popularCards';

const App = () => {
  const [cardData, setCardData] = useState(CARD_DATA);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState("신한카드");
  const [selectedCard, setSelectedCard] = useState(null);

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '안녕하세요! 당신의 소비 패턴에 맞는 최고의 금융 상품을 제안해드리는 금융 AI 상담사입니다. 궁금한 점이 있으시면 언제든 말씀해 주세요.' }
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
        console.warn('Scraper data check: Using local card database.');
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

      const systemInstruction = `당신은 대한민국 최고의 카드 추천 전문가입니다. 전문적이고 정중한 말투를 사용하세요. 사용자의 질문을 분석하여 다음 카드 데이터베이스를 바탕으로 가장 적합한 카드를 **최대 3개** 추천해주세요. 
      결과는 반드시 **Markdown 표(Table)** 형식을 사용하여 출력해주세요. 표의 열(Column) 구성: [카드 이름 | 주요 혜택 | 추천 이유]. 
      카드 데이터: ${JSON.stringify(optimizedCardData)}`;

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
      let errorMessage = "네트워크 상태를 확인해 주세요. 나중에 다시 문의해 주시면 감사하겠습니다.";
      if (error.message === 'API_KEY_MISSING') errorMessage = "API 시스템 점검 중입니다.";
      setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-[#E2E8F0] z-40">
        <div className="max-width-container h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0052CC] rounded-[8px] flex items-center justify-center">
              <CreditCard className="text-white w-5 h-5" />
            </div>
            <h1 className="text-[20px] font-extrabold tracking-tight text-[#091E42]">CARDSMART</h1>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="font-bold text-[#0052CC]">실시간 랭킹</a>
            <a href="#" className="font-bold text-[#6B778C] hover:text-[#0052CC]">맞춤 카드 찾기</a>
            <a href="#" className="font-bold text-[#6B778C] hover:text-[#0052CC]">고객지원</a>
          </nav>
          <div className="flex items-center gap-3">
            <button className="text-[14px] font-bold text-[#6B778C] h-[40px] px-4">로그인</button>
            <button className="btn btn-primary h-[40px] px-5 text-[14px]">회원가입</button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white py-16">
        <div className="max-width-container">
          <div className="max-w-[640px] animate-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#EBF2FF] text-[#0052CC] rounded-full text-[12px] font-extrabold mb-6">
              <TrendingUp className="w-4 h-4" /> 실시간 데이터 분석 완료
            </div>
            <h2 className="text-[40px] md:text-[52px] leading-[1.1] mb-6">
              금융 전문가가 추천하는<br />
              <span className="text-[#0052CC]">내 인생 최고의 카드</span>
            </h2>
            <p className="text-[18px] text-[#6B778C] mb-8 font-medium">
              국내 모든 카드사의 실시간 혜택을 분석하여<br />
              사용자의 소비 패턴에 최적화된 상품을 제안합니다.
            </p>
            <div className="flex gap-3">
              <button className="btn btn-primary px-8 h-[52px] text-[16px]">지금 내 카드 찾기</button>
              <button className="btn bg-white border border-[#DFE1E6] text-[#091E42] px-8 h-[52px] text-[16px] hover:bg-[#F4F7FA]">랭킹 전체보기</button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content: Card List */}
      <main className="max-width-container py-12">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <div className="flex items-center gap-3">
            <h3 className="text-[24px] font-bold">인기 카드 차트</h3>
            {lastUpdate && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#DFE1E6] rounded-full text-[12px] text-[#6B778C] font-bold">
                <Clock className="w-3.5 h-3.5" />
                {new Date(lastUpdate).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 업데이트
              </div>
            )}
          </div>

          <div className="flex gap-1.5 p-1 bg-white border border-[#DFE1E6] rounded-[16px] overflow-x-auto no-scrollbar max-w-full">
            {Object.keys(cardData).map(company => (
              <button
                key={company}
                onClick={() => setSelectedCompany(company)}
                className={`h-[40px] px-5 rounded-[12px] text-[14px] font-bold transition-all whitespace-nowrap
                  ${selectedCompany === company
                    ? 'bg-[#0052CC] text-white shadow-md'
                    : 'text-[#6B778C] hover:bg-[#F4F7FA] hover:text-[#091E42]'}`}
              >
                {company}
              </button>
            ))}
          </div>
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cardData[selectedCompany].map((card) => (
            <div
              key={card.id}
              className="card-finance p-6 flex flex-col group cursor-pointer"
              onClick={() => setSelectedCard(card)}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="rank-badge">{card.rank}</div>
                <div className="text-[12px] font-extrabold text-[#0052CC] bg-[#EBF2FF] px-2 py-1 rounded-md">{selectedCompany}</div>
              </div>

              <div className="flex gap-4 mb-6">
                <div className="w-[80px] h-[120px] bg-[#172B4D] rounded-[10px] shadow-lg flex items-center justify-center shrink-0">
                  <CreditCard className="text-white/20 w-8 h-8" />
                </div>
                <div className="flex flex-col pt-2">
                  <h4 className="text-[18px] leading-tight mb-2 group-hover:text-[#0052CC] transition-colors line-clamp-2">{card.name}</h4>
                  <div className="text-[13px] text-[#6B778C] font-bold">연회비 {card.fee}</div>
                </div>
              </div>

              <div className="flex-grow space-y-2.5 mb-6">
                {card.benefits.slice(0, 3).map((b, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 bg-[#0052CC] rounded-full"></div>
                    <span className="text-[14px] text-[#42526E] font-medium line-clamp-1">{b}</span>
                  </div>
                ))}
              </div>

              <button className="mt-auto h-[48px] bg-[#F4F7FA] text-[#42526E] rounded-[12px] font-extrabold text-[14px] flex items-center justify-center gap-2 group-hover:bg-[#0052CC] group-hover:text-white transition-all">
                상세 혜택 분석 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Card Detail Modal (Bottom Sheet inspired for Mobile) */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E42]/60 backdrop-blur-sm p-4 animate-up" onClick={() => setSelectedCard(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-[24px] w-full max-w-[560px] shadow-2xl p-8 relative">
            <button onClick={() => setSelectedCard(null)} className="absolute top-6 right-6 p-2 hover:bg-[#F4F7FA] rounded-full transition-colors">
              <X className="w-6 h-6 text-[#6B778C]" />
            </button>

            <div className="flex items-start gap-6 mb-8 border-b border-[#DFE1E6] pb-8">
              <div className="w-[100px] h-[150px] bg-[#091E42] rounded-[12px] shadow-2xl flex items-center justify-center shrink-0">
                <CreditCard className="text-white/10 w-12 h-12" />
              </div>
              <div className="pt-2">
                <div className="text-[12px] font-black text-[#0052CC] mb-2 uppercase tracking-wider">{selectedCompany}</div>
                <h2 className="text-[28px] mb-4">{selectedCard.name}</h2>
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-[#6B778C]">연회비</span>
                    <span className="text-[15px] font-extrabold">{selectedCard.fee}</span>
                  </div>
                  <div className="w-px h-8 bg-[#DFE1E6]"></div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-[#6B778C]">전월 실적</span>
                    <span className="text-[15px] font-extrabold">{selectedCard.record || '30만원'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-[#0052CC]" />
                <h4 className="text-[16px] font-bold">주요 혜택 한눈에 보기</h4>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {selectedCard.benefits.map((b, i) => (
                  <div key={i} className="flex gap-4 items-center bg-[#F4F7FA] p-4 rounded-[12px]">
                    <div className="w-[24px] h-[24px] bg-white text-[#0052CC] rounded-full flex items-center justify-center font-black text-[12px] border border-[#DFE1E6] shrink-0">{i + 1}</div>
                    <span className="text-[14px] font-bold text-[#42526E]">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex-grow btn btn-primary h-[56px] text-[16px]">카드 발급 신청하기</button>
              <button className="w-[56px] h-[56px] border border-[#DFE1E6] rounded-[12px] flex items-center justify-center hover:bg-[#F4F7FA] transition-colors">
                <ExternalLink className="w-5 h-5 text-[#6B778C]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chatbot */}
      {!isChatOpen ? (
        <div className="chatbot-bubble" onClick={() => setIsChatOpen(true)}>
          <MessageCircle className="w-7 h-7" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full"></div>
        </div>
      ) : (
        <div className="chat-window animate-up">
          <div className="p-4 bg-[#0052CC] text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[14px] font-bold">금융 AI 상담사</p>
                <p className="text-[10px] opacity-80">어드바이저가 상담 중입니다</p>
              </div>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-5 bg-[#F4F7FA]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-[16px] text-[14px] shadow-sm font-medium
                  ${msg.role === 'user'
                    ? 'bg-[#0052CC] text-white rounded-tr-none'
                    : 'bg-white text-[#172B4D] border border-[#DFE1E6] rounded-tl-none'}`}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ node, ...props }) => <div className="overflow-x-auto my-3"><table className="finance-table" {...props} /></div>,
                      th: ({ node, ...props }) => <th className="bg-[#EBF2FF] text-[#0052CC] p-2 border-b border-[#DFE1E6]" {...props} />,
                      td: ({ node, ...props }) => <td className="p-2 border-b border-[#F4F7FA]" {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-[16px] rounded-tl-none border border-[#DFE1E6] flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-[#0052CC] rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-[#0052CC] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-[#0052CC] rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-[#DFE1E6]">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="금융 궁금증을 해결해 드릴게요"
                className="w-full bg-[#F4F7FA] border border-[#DFE1E6] rounded-[16px] px-4 py-3 text-[14px] font-medium focus:ring-2 focus:ring-[#0052CC]/20 focus:border-[#0052CC] outline-none transition-all pr-12"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="absolute right-2 p-2 bg-[#0052CC] text-white rounded-[12px] hover:bg-[#0747A6] disabled:opacity-30 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#091E42] text-white py-12 mt-20">
        <div className="max-width-container">
          <div className="flex flex-col md:flex-row justify-between items-start gap-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-6 h-6 text-white" />
                <span className="text-[18px] font-extrabold tracking-tight">CARDSMART</span>
              </div>
              <p className="text-[#6B778C] text-[14px] max-w-[320px] leading-relaxed">
                사용자의 현명한 금융 생활을 돕는 카드 분석 플랫폼.<br />
                데이터에 기반한 최적의 혜택을 제공합니다.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-12 text-[14px]">
              <div>
                <h5 className="font-bold mb-4">서비스</h5>
                <ul className="space-y-2 text-[#6B778C]">
                  <li><a href="#" className="hover:text-white transition-colors">실시간 차트</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">카드 비교</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">금융 어드바이저</a></li>
                </ul>
              </div>
              <div>
                <h5 className="font-bold mb-4">카드사</h5>
                <ul className="space-y-2 text-[#6B778C]">
                  <li><a href="#" className="hover:text-white transition-colors">신한카드</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">현대카드</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">삼성카드</a></li>
                </ul>
              </div>
              <div>
                <h5 className="font-bold mb-4">고객지원</h5>
                <ul className="space-y-2 text-[#6B778C]">
                  <li><a href="#" className="hover:text-white transition-colors">공지사항</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">제휴문의</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-[#6B778C] text-[12px]">
            © 2026 CARDSMART. All rights reserved. 본 서비스는 데이터 분석 기반의 추천을 제공하며 법적 조언을 대신하지 않습니다.
          </div>
        </div>
      </footer
