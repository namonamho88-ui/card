import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CARDS, TRANSACTIONS } from './data/mockData';
import { findBestCard } from './utils/recommender';
import './index.css';

function App() {
  const [messages, setMessages] = useState([
    { role: 'agent', text: '안녕하세요! 체리피커 에이전트입니다. 어디서 얼마를 결제하실 건가요? 가장 혜택이 좋은 카드를 찾아드릴게요.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMsg = inputValue;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputValue('');

    // Process logic
    // Regex to extract merchant and amount
    const amountMatch = userMsg.match(/(\d+(?:,\d+)*)\s*원/);
    const amount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, '')) : 20000;

    // Simple merchant extraction
    let merchant = "기타";
    if (userMsg.includes("스타벅스")) merchant = "Starbucks";
    else if (userMsg.includes("이마트")) merchant = "E-Mart";
    else if (userMsg.includes("넷플릭스")) merchant = "Netflix";
    else if (userMsg.includes("편의점") || userMsg.includes("GS25")) merchant = "GS25";
    else if (userMsg.includes("영화") || userMsg.includes("CGV")) merchant = "CGV";

    const recommendations = findBestCard(merchant, amount);
    const best = recommendations[0];

    setTimeout(() => {
      let responseText = `${merchant}에서 ${amount.toLocaleString()}원 결제 시, **${best.name}** 카드를 추천합니다!\n\n`;
      if (best.expectedReward > 0) {
        responseText += `예상 혜택: **${best.expectedReward.toLocaleString()}원** 입니다.`;
      } else {
        responseText += `특별한 혜택은 없지만, 기본 적립이 가능한 카드입니다.`;
      }

      setMessages(prev => [...prev, {
        role: 'agent',
        text: responseText,
        recommendation: best
      }]);
    }, 600);
  };

  return (
    <div className="app-container">
      <header>
        <h1>Cherry Picker Agent</h1>
        <p className="tagline">당신의 소비를 스마트하게, 혜택은 극대화로.</p>
      </header>

      <div className="dashboard">
        <section className="left-panel">
          <div className="section-header">
            <h2 className="section-title">💳 My Cards</h2>
            <div className="card-grid">
              {CARDS.map(card => (
                <div
                  key={card.id}
                  className="card-item"
                  style={{ background: card.color }}
                >
                  <span className="card-brand">{card.brand}</span>
                  <span className="card-name">{card.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="section-header" style={{ marginTop: '2rem' }}>
            <h2 className="section-title">🕒 Recent Activity</h2>
            <div className="history-list">
              {TRANSACTIONS.slice(0, 10).map(tx => (
                <div key={tx.id} className="history-item">
                  <div className="merchant-info">
                    <span className="merchant-name">{tx.merchant}</span>
                    <span className="merchant-cat">{tx.category} • {tx.date}</span>
                  </div>
                  <div className="amount-info">
                    <div className="amount">-{tx.amount.toLocaleString()}원</div>
                    <div className="card-used">{tx.cardName}</div>
                  </div>
                </div>
              ))}
              <div style={{ textAlign: 'center', padding: '1rem', color: '#666', fontSize: '0.8rem' }}>
                외 {TRANSACTIONS.length - 10}건의 내역 더보기
              </div>
            </div>
          </div>
        </section>

        <section className="right-panel">
          <h2 className="section-title">🤖 Benefit Butler</h2>
          <div className="agent-container">
            <div className="chat-history">
              {messages.map((m, i) => (
                <div key={i} className={`message ${m.role}`}>
                  <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  {m.recommendation && (
                    <div className="recommendation-result">
                      💡 Tip: {m.recommendation.name}는 {m.recommendation.benefits[0].percentage}% 적립 혜택이 있습니다.
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="input-area">
              <input
                type="text"
                placeholder="예: 스타벅스에서 2만원 결제할건데 어떤 카드가 좋아?"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
              <button onClick={handleSend}>질문하기</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
