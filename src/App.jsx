import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CARD_DATA } from './data/popularCards';
import './index.css';

const App = () => {
  const [cardData, setCardData] = useState(CARD_DATA);
  const [lastUpdate, setLastUpdate] = useState(null);

  // UI State
  const ISSUERS = Object.keys(cardData);
  const [selectedIssuer, setSelectedIssuer] = useState(
    ISSUERS.length > 0 ? ISSUERS[0] : "신한카드"
  );
  const [selectedCard, setSelectedCard] = useState(null);

  // Chatbot State
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '안녕하세요! 소비 패턴에 딱 맞는 카드를 찾아드릴게요.\n\n"영화 자주 보는데 할인율 높은 카드는 뭐야?" 처럼 물어보세요!'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg = inputValue;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInputValue('');
    setIsTyping(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      // Fallback response if no API key
      if (!apiKey) {
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'assistant', content: "API 키가 설정되지 않아 데모 응답을 보여드립니다. \n\n**추천 카드**: 신한카드 Deep Dream\n- 전월 실적 없음\n- 0.7% 기본 적립" }]);
          setIsTyping(false);
        }, 1000);
        return;
      }

      const optimizedCardData = Object.entries(cardData).reduce((acc, [corp, cards]) => {
        acc[corp] = cards.map(c => ({
          name: c.name,
          benefits: c.benefits.slice(0, 2),
          fee: c.fee
        }));
        return acc;
      }, {});

      const systemInstruction = `
        당신은 카드 추천 전문가입니다.
        데이터: ${JSON.stringify(optimizedCardData)}
        사용자 질문에 맞춰 카드를 3개 추천하고, 출력은 Markdown Table로 해주세요.
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userMsg }] }],
          system_instruction: { parts: [{ text: systemInstruction }] }
        })
      });

      const data = await response.json();
      const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "죄송합니다. 오류가 발생했습니다.";
      setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "일시적인 오류가 발생했습니다." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const displayedCards = cardData[selectedIssuer] || [];

  return (
    <div className="app-container">
      <header>
        <h1>Cherry Picker</h1>
        <p className="tagline">현명한 소비의 시작</p>
      </header>

      {/* Catalog */}
      <section className="card-catalog-section">
        <div className="section-title">
          <span>🏆</span> 실시간 인기 카드
        </div>

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

        <div className="catalog-cards-grid">
          {displayedCards.map((card, idx) => (
            <div
              key={card.id || idx}
              className="catalog-card-item"
              onClick={() => setSelectedCard(card)}
            >
              <span className="catalog-card-rank">{card.rank || idx + 1}위</span>
              <div className="catalog-card-image">{card.image || "💳"}</div>
              <div className="catalog-card-name">{card.name}</div>
              <div className="catalog-card-tags">
                {(card.benefits.slice(0, 2)).map((tag, i) => (
                  <span key={i} className="card-tag">{tag}</span>
                ))}
              </div>
              <div className="catalog-card-fee">{card.fee}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Chatbot */}
      <section className="chatbot-section">
        <div className="section-title">
          <span>🤖</span> AI 카드 추천
        </div>
        <div className="agent-container">
          <div className="chat-history">
            {messages.map((m, i) => (
              <div key={i} className={`message ${m.role === 'user' ? 'user' : 'agent'}`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ node, ...props }) => <table {...props} />,
                    th: ({ node, ...props }) => <th {...props} />,
                    td: ({ node, ...props }) => <td {...props} />
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              </div>
            ))}
            {isTyping && (
              <div className="message agent">...</div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="input-area">
            <input
              type="text"
              placeholder="질문을 입력하세요..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} disabled={isTyping}>↑</button>
          </div>
        </div>
      </section>

      {/* Modal */}
      {selectedCard && (
        <div className="modal-overlay" onClick={() => setSelectedCard(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button className="close-btn" onClick={() => setSelectedCard(null)}>✕</button>
            </div>

            <div className="card-detail-body">
              <div className="card-preview">
                <div className="card-preview-issuer">{selectedIssuer}</div>
                <div className="card-preview-name">{selectedCard.name}</div>
              </div>

              <div className="info-row">
                <span className="info-label">연회비</span>
                <span className="info-value">{selectedCard.fee}</span>
              </div>
              <div className="info-row">
                <span className="info-label">전월 실적</span>
                <span className="info-value">{selectedCard.record || '정보 없음'}</span>
              </div>

              <div className="card-benefits-section">
                <h3>주요 혜택</h3>
                {selectedCard.benefits.map((benefit, idx) => (
                  <div key={idx} className="benefit-item-detail">{benefit}</div>
                ))}
              </div>

              <button className="add-to-wallet-btn-detail" onClick={() => alert("신청 기능 준비중")}>
                신청하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
