import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CARD_DATA } from './data/popularCards';
import './index.css';

const App = () => {
  const [cardData, setCardData] = useState(CARD_DATA);
  const [lastUpdate, setLastUpdate] = useState(null);

  const ISSUERS = Object.keys(cardData);
  const [selectedIssuer, setSelectedIssuer] = useState(ISSUERS[0] || "신한카드");
  const [selectedCard, setSelectedCard] = useState(null);

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '안녕하세요! 소비 패턴에 딱 맞는 카드를 찾아드릴게요. \n\n"영화 자주 보는데 할인율 높은 카드는 뭐야?" 처럼 물어보세요!'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const fetchCards = async () => {
      if (window.location.hostname === 'localhost') {
        try {
          const response = await fetch('http://localhost:3001/api/cards');
          const result = await response.json();
          if (result.data) {
            setCardData(result.data);
            setLastUpdate(result.lastUpdate);
          }
        } catch (error) {
          console.warn('Scraper data check: Using static card database.');
        }
      }
    };
    fetchCards();
  }, []);

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

      const systemInstruction = `
        당신은 금융 전문가 '체리피커'입니다. 토스(Toss) 앱처럼 친절하고 간결한 말투를 사용하세요.
        사용자의 질문을 분석하여 제공된 카드 데이터베이스 내에서 가장 적합한 카드를 **최대 3개** 추천해주세요.
        
        [답변 가이드]
        1. 핵심만 간결하게 설명하세요.
        2. 카드 비교는 반드시 **Markdown 표(Table)** 형식을 사용하세요.
        3. 표 컬럼: [카드명 | 주요 혜택 | 추천 이유]
        4. 데이터에 없는 내용은 지어내지 마세요.
        
        카드 데이터: ${JSON.stringify(optimizedCardData)}
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
      const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "죄송합니다. 잠시 후 다시 시도해주세요.";
      setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);
    } catch (error) {
      console.error('Chatbot Error:', error);
      let errorMessage = "네트워크 연결을 확인해주세요.";
      if (error.message === 'API_KEY_MISSING') errorMessage = "API 키가 설정되지 않았습니다.";
      setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
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
        {lastUpdate && (
          <span className="last-update">
            업데이트: {new Date(lastUpdate).toLocaleDateString()}
          </span>
        )}
      </header>

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
              <div className="catalog-card-rank">{card.rank || idx + 1}위</div>
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
              <div className="message agent">
                <span className="typing-dots">...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="input-area">
            <input
              type="text"
              placeholder="어떤 혜택을 찾으세요?"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} disabled={isTyping || !inputValue.trim()}>
              ↑
            </button>
          </div>
        </div>
      </section>

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

              <div className="card-info-section">
                <div className="info-row">
                  <span className="info-label">연회비</span>
                  <span className="info-value">{selectedCard.fee}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">전월 실적</span>
                  <span className="info-value">{selectedCard.record}</span>
                </div>
              </div>

              <div className="card-benefits-section">
                <h3>주요 혜택</h3>
                <ul className="benefits-list">
                  {selectedCard.benefits.map((benefit, idx) => (
                    <li key={idx} className="benefit-item-detail">{benefit}</li>
                  ))}
                </ul>
              </div>

              <button
                className="add-to-wallet-btn-detail"
                onClick={() => {
                  alert("신청 페이지로 이동합니다");
                  setSelectedCard(null);
                }}
              >
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
