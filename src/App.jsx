import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TRANSACTIONS } from './data/mockData';
import { POPULAR_CARDS, ISSUERS, getCardsByIssuer, findCardByBenefits } from './data/popularCards';
import './index.css';

function App() {
  const [messages, setMessages] = useState([
    { role: 'agent', text: '안녕하세요! 체리피커 에이전트입니다. 궁금하신 카드 혜택이 있으신가요? 예를 들어 "영화를 자주 보는데 제일 혜택 좋은 카드는?" 이렇게 물어보세요!' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedIssuer, setSelectedIssuer] = useState('전체');
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

    // 인기 카드에서 검색
    const matchedCards = findCardByBenefits(userMsg);

    setTimeout(() => {
      if (matchedCards.length > 0) {
        const bestCard = matchedCards[0];
        let responseText = `**${bestCard.issuer} ${bestCard.name}** 카드를 추천드립니다!\n\n`;
        responseText += `💳 **연회비**: ${bestCard.annualFee}\n`;
        responseText += `📊 **전월 실적**: ${bestCard.previousMonthSpending}\n\n`;
        responseText += `✨ **주요 혜택**:\n`;
        bestCard.benefits.forEach((benefit, idx) => {
          responseText += `${idx + 1}. ${benefit}\n`;
        });

        // 다른 추천 카드도 표시
        if (matchedCards.length > 1) {
          responseText += `\n📋 **다른 추천 카드**:\n`;
          matchedCards.slice(1, 4).forEach((card, idx) => {
            responseText += `${idx + 2}. ${card.issuer} ${card.name} (연회비: ${card.annualFee})\n`;
          });
        }

        setMessages(prev => [...prev, {
          role: 'agent',
          text: responseText,
          recommendation: bestCard
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'agent',
          text: '죄송합니다. 해당 조건에 맞는 카드를 찾지 못했습니다. 다른 조건으로 다시 검색해주세요.'
        }]);
      }
    }, 600);
  };

  // 필터링된 카드 목록
  const displayedCards = useMemo(() => {
    return getCardsByIssuer(selectedIssuer);
  }, [selectedIssuer]);

  return (
    <div className="app-container">
      <header>
        <h1>Cherry Picker Agent</h1>
        <p className="tagline">당신의 소비를 스마트하게, 혜택은 극대화로.</p>
      </header>

      {/* 카드사 탭 네비게이션 */}
      <section className="card-catalog-section">
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

        {/* 카드 그리드 */}
        <div className="catalog-cards-grid">
          {displayedCards.map(card => (
            <div
              key={card.id}
              className="catalog-card-item"
              style={{ background: card.color }}
              onClick={() => setSelectedCard(card)}
            >
              <div className="catalog-card-issuer">{card.issuer}</div>
              <div className="catalog-card-name">{card.name}</div>
              <div className="catalog-card-fee">연회비 {card.annualFee}</div>
            </div>
          ))}
        </div>
      </section>

      {/* AI 챗봇 섹션 */}
      <section className="chatbot-section">
        <h2 className="section-title">🤖 AI 카드 추천</h2>
        <div className="agent-container">
          <div className="chat-history">
            {messages.map((m, i) => (
              <div key={i} className={`message ${m.role}`}>
                <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                {m.recommendation && (
                  <div className="recommendation-result">
                    💡 Tip: {m.recommendation.name}는 혜택 조건이 매우 좋습니다.
                  </div>
                )}
              </div>
            ))}
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
            <button onClick={handleSend}>전송</button>
          </div>
        </div>
      </section>

      {/* 카드 상세 정보 모달 */}
      {selectedCard && (
        <div className="modal-overlay" onClick={() => setSelectedCard(null)}>
          <div className="modal-content card-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedCard.issuer} {selectedCard.name}</h2>
              <button className="close-btn" onClick={() => setSelectedCard(null)}>✕</button>
            </div>

            <div className="card-detail-body">
              <div className="card-preview" style={{ background: selectedCard.color }}>
                <div className="card-preview-issuer">{selectedCard.issuer}</div>
                <div className="card-preview-name">{selectedCard.name}</div>
              </div>

              <div className="card-info-section">
                <h3>💳 카드 정보</h3>
                <div className="info-row">
                  <span className="info-label">연회비</span>
                  <span className="info-value">{selectedCard.annualFee}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">전월 실적</span>
                  <span className="info-value">{selectedCard.previousMonthSpending}</span>
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
