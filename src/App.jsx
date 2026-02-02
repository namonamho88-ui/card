import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import './index.css';

const App = () => {
  // Logic: Card Data & Scraper
  const [cardData, setCardData] = useState(CARD_DATA);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedIssuer, setSelectedIssuer] = useState("신한카드");
  const [selectedCard, setSelectedCard] = useState(null);

  // Logic: Chatbot State
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '안녕하세요! 당신의 소비 패턴에 맞는 최고의 금융 상품을 제안해드리는 금융 AI 상담사입니다. 궁금한 점이 있으시면 언제든 말씀해 주세요.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Crawling Logic (Current)
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

  // Chatbot Logic (Gemini - Current)
  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg = inputValue;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
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
          contents: [{ role: 'user', parts: [{ text: userMsg }] }],
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

  // UI Derived Data
  const ISSUERS = Object.keys(cardData);
  const displayedCards = cardData[selectedIssuer] || [];

  return (
    <div className="app-container">
      <header>
        <h1>Cherry Picker Agent</h1>
        <p className="tagline">당신의 소비를 스마트하게, 혜택은 극대화로.</p>
        {lastUpdate && (
          <p className="last-update">
            업데이트: {new Date(lastUpdate).toLocaleString('ko-KR')}
          </p>
        )}
      </header>

      {/* 카드사 탭 네비게이션 (56b384b UI) */}
      <section className="card-catalog-section">
        <h2 className="section-title">🏆 카드사별 인기 TOP10 카드 목록</h2>
        <div className="tabs-container">
          {ISSUERS.map(issuer => (
            <button
              key={issuer}
              className={`tab-btn ${selectedIssuer === issuer ? 'active' : ''}`}
              onClick={() => setSelectedIssuer(issuer)}
            >
              {issuer}
            </button>
          ))}
        </div>

        {/* 카드 그리드 (56b384b UI) */}
        <div className="catalog-cards-grid">
          {displayedCards.map(card => (
            <div
              key={card.id || card.name}
              className="catalog-card-item"
              style={{ background: card.color || '#172B4D' }}
              onClick={() => setSelectedCard(card)}
            >
              <div className="catalog-card-issuer">{selectedIssuer}</div>
              <div className="catalog-card-name">{card.name}</div>
              <div className="catalog-card-tags">
                {(card.categories || card.benefits.slice(0, 3)).map((tag, idx) => (
                  <span key={idx} className="card-tag">#{tag}</span>
                ))}
              </div>
              <div className="catalog-card-fee">연회비 {card.fee}</div>
            </div>
          ))}
        </div>
      </section>

      {/* AI 챗봇 섹션 (56b384b UI Layout + Current Gemini Logic) */}
      <section className="chatbot-section">
        <h2 className="section-title">🤖 AI 카드 추천</h2>
        <div className="agent-container">
          <div className="chat-history">
            {messages.map((m, i) => (
              <div key={i} className={`message ${m.role === 'user' ? 'user' : 'agent'}`}>
                <div className="message-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ node, ...props }) => <div className="overflow-x-auto my-3"><table className="finance-table" {...props} /></div>,
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="message agent">
                <div className="message-content typing">상담사가 답변을 작성 중입니다...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="input-area">
            <input
              type="text"
              placeholder="예: 영화를 자주 보는데 제일 혜택 좋은 카드는?"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} disabled={isTyping}>전송</button>
          </div>
        </div>
      </section>

      {/* 카드 상세 정보 모달 (56b384b UI) */}
      {selectedCard && (
        <div className="modal-overlay" onClick={() => setSelectedCard(null)}>
          <div className="modal-content card-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedIssuer} {selectedCard.name}</h2>
              <button className="close-btn" onClick={() => setSelectedCard(null)}>✕</button>
            </div>

            <div className="card-detail-body">
              <div className="card-preview" style={{ background: selectedCard.color || '#172B4D' }}>
                <div className="card-preview-issuer">{selectedIssuer}</div>
                <div className="card-preview-name">{selectedCard.name}</div>
              </div>

              <div className="card-info-section">
                <h3>💳 카드 정보</h3>
                <div className="info-row">
                  <span className="info-label">연회비</span>
                  <span className="info-value">{selectedCard.fee}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">전월 실적</span>
                  <span className="info-value">{selectedCard.record || '30만원'}</span>
                </div>
              </div>

              <div className="card-benefits-section">
                <h3>✨ 주요 혜택</h3>
                <ul className="benefits-list">
                  {selectedCard.benefits.map((benefit, idx) => (
                    <li key={idx} className="benefit-item-detail">{benefit}</li>
                  ))}
                </ul>
              </div>

              <button
                className="add-to-wallet-btn-detail"
                onClick={() => {
                  alert(`${selectedCard.name} 카드 신청 페이지로 이동합니다.`);
                  setSelectedCard(null);
                }}
              >
                카드 신청하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
