import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CARDS as MOCK_CARDS, TRANSACTIONS } from './data/mockData';
import { POPULAR_CARDS, findCardByBenefits } from './data/popularCards';
import { findBestCard } from './utils/recommender';
import { supabase } from './utils/supabase';
import './index.css';

function App() {
  const [cards, setCards] = useState(MOCK_CARDS);
  const [messages, setMessages] = useState([
    { role: 'agent', text: '안녕하세요! 체리피커 에이전트입니다. 어디서 얼마를 결제하실 건가요? 가장 혜택이 좋은 카드를 찾아드릴게요.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const chatEndRef = useRef(null);

  // Form states
  const [newCard, setNewCard] = useState({ name: '', brand: '', color: 'linear-gradient(135deg, #667eea, #764ba2)', type: 'Credit' });
  const [description, setDescription] = useState('');

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch cards from Supabase (if configured)
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const { data, error } = await supabase.from('cards').select('*, benefits(*)');
        if (data && data.length > 0) {
          setCards(data);
        }
      } catch (err) {
        console.log("Supabase not connected yet or table missing. Using mock data.");
      }
    };
    fetchCards();
  }, []);

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

        setMessages(prev => [...prev, {
          role: 'agent',
          text: responseText,
          recommendation: bestCard
        }]);
      } else {
        // 매칭되는 카드가 없을 경우
        setMessages(prev => [...prev, {
          role: 'agent',
          text: '죄송합니다. 해당 조건에 맞는 카드를 찾지 못했습니다. 다른 조건으로 다시 검색해주세요.'
        }]);
      }
    }, 600);
  };

  const handleSmartParse = () => {
    // Simulating AI parsing of the description
    // In a real app, this could call an edge function or a simple regex engine
    if (!description.includes("스타벅스") && !description.includes("할인")) {
      alert("분석할 혜택 정보가 부족합니다. 상세 내용을 더 입력해주세요.");
      return;
    }

    setNewCard({
      ...newCard,
      name: description.split(' ')[0] || "새로운 카드",
      brand: "분석된 브랜드"
    });
    alert("혜택 분석이 완료되었습니다. 아래 정보를 확인하고 등록해주세요.");
  };

  const handleAddCard = async () => {
    const cardToSave = {
      ...newCard,
      id: Date.now(), // Local fallback
      benefits: [
        { category: "Coffee", merchant: "Starbucks", percentage: 50, minSpend: 0 }
      ]
    };

    try {
      const { data, error } = await supabase.from('cards').insert([newCard]).select();
      if (error) throw error;
      alert("카드가 Supabase에 성공적으로 등록되었습니다!");
    } catch (err) {
      console.error(err);
      alert("로컬 대시보드에 임시 등록되었습니다. (Supabase 연결 확인 필요)");
    }

    setCards(prev => [...prev, cardToSave]);
    setIsModalOpen(false);
  };

  return (
    <div className="app-container">
      <header>
        <h1>Cherry Picker Agent</h1>
        <p className="tagline">당신의 소비를 스마트하게, 혜택은 극대화로.</p>
      </header>

      {/* 인기 카드 섹션 */}
      <section className="popular-cards-section">
        <h2 className="section-title">🔥 인기 카드 상품</h2>
        <div className="popular-cards-grid">
          {POPULAR_CARDS.map(card => (
            <div
              key={card.id}
              className="popular-card-item"
              style={{ background: card.color }}
              onClick={() => setSelectedCard(card)}
            >
              <div className="popular-card-issuer">{card.issuer}</div>
              <div className="popular-card-name">{card.name}</div>
              <div className="popular-card-tags">
                {card.categories.map((cat, idx) => (
                  <span key={idx} className="card-tag">#{cat}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="dashboard">
        <section className="left-panel">
          <div className="section-header">
            <h2 className="section-title">💳 My Cards</h2>
            <div className="card-grid">
              {cards.map(card => (
                <div
                  key={card.id}
                  className="card-item"
                  style={{ background: card.color }}
                >
                  <span className="card-brand">{card.brand}</span>
                  <span className="card-name">{card.name}</span>
                </div>
              ))}
              <div className="add-card-btn" onClick={() => setIsModalOpen(true)}>
                <span>+</span>
                <span style={{ fontSize: '0.8rem' }}>내 카드 추가하기</span>
              </div>
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

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>카드 등록하기</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <div className="smart-parse-area">
              <h3>✨ 스마트 등록 (설명서 파싱)</h3>
              <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>
                카드 상품 설명서나 혜택 내용을 복사해서 붙여넣어 보세요. 에이전트가 혜택을 분석합니다.
              </p>
              <textarea
                placeholder="예: 현대카드 M3 BOOST - 스타벅스 50% 할인, 배달의민족 10% 적립..."
                rows="4"
                style={{ width: '100%', boxSizing: 'border-box' }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <button className="parse-btn" onClick={handleSmartParse}>혜택 분석하기</button>
            </div>

            <div className="registration-form">
              <div className="form-group">
                <label>카드 이름</label>
                <input
                  type="text"
                  value={newCard.name}
                  onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                  placeholder="예: 신한 딥드림 카드"
                />
              </div>
              <div className="form-group">
                <label>카드사</label>
                <input
                  type="text"
                  value={newCard.brand}
                  onChange={(e) => setNewCard({ ...newCard, brand: e.target.value })}
                  placeholder="예: 신한카드"
                />
              </div>
              <div className="form-group">
                <label>카드 타입</label>
                <select
                  value={newCard.type}
                  onChange={(e) => setNewCard({ ...newCard, type: e.target.value })}
                >
                  <option>Credit</option>
                  <option>Check</option>
                </select>
              </div>
              <button
                onClick={handleAddCard}
                style={{ marginTop: '1rem', padding: '1rem', background: 'var(--accent-color)', color: '#000' }}
              >
                저장 및 대시보드 추가
              </button>
            </div>
          </div>
        </div>
      )}

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
