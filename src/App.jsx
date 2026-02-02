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

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg = inputValue;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputValue('');

    // 로딩 표시
    const loadingId = Date.now();
    setMessages(prev => [...prev, {
      role: 'agent',
      text: '답변을 생성하고 있습니다...',
      id: loadingId,
      isLoading: true
    }]);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      // API 키가 없는 경우 (로컬 개발 등)
      if (!apiKey) {
        // 실제 배포 환경에서는 Vercel 환경 변수가 사용됨
        console.warn("API Key is missing. Check your .env file or Vercel settings.");

        // 잠시 대기 후 모의 응답 (개발용)
        setTimeout(() => {
          setMessages(prev => prev.map(msg =>
            msg.id === loadingId
              ? { ...msg, text: "⚠️ API 키가 설정되지 않았습니다. (개발 모드)\n\nVercel 환경 변수 또는 .env 파일에 `VITE_GEMINI_API_KEY`를 설정해주세요.", isLoading: false }
              : msg
          ));
        }, 1000);
        return;
      }

      // 프롬프트 구성을 위한 카드 데이터 요약
      const allCards = Object.values(POPULAR_CARDS).flat();
      const cardContext = allCards.map(c =>
        `- [${c.issuer}] ${c.name} (연회비: ${c.annualFee}, 전월실적: ${c.previousMonthSpending}): ${c.benefits.join(', ')}`
      ).join('\n');

      const systemInstruction = `
        당신은 대한민국 최고의 신용카드 추천 전문가 '체리피커'입니다.
        아래 제공된 카드 데이터베이스를 바탕으로 사용자의 질문에 가장 적합한 카드를 추천해주세요.

        [카드 데이터베이스]
        ${cardContext}

        [답변 가이드]
        1. 사용자의 질문 의도를 파악하여 가장 적합한 카드를 1~3개 추천하세요.
        2. 각 추천 카드에 대해 '추천 이유', '주요 혜택', '연회비/실적 조건'을 명확히 설명하세요.
        3. 답변은 가독성 좋게 Markdown 형식(볼드체, 리스트 등)을 사용하여 작성하세요.
        4. 친절하고 전문적인 어조를 유지하세요.
        5. 데이터베이스에 없는 내용은 지어내지 마세요.
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userMsg }] }],
          system_instruction: { parts: [{ text: systemInstruction }] }
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "죄송합니다. 적절한 답변을 생성하지 못했습니다.";

      setMessages(prev => prev.map(msg =>
        msg.id === loadingId
          ? { ...msg, text: botResponse, isLoading: false }
          : msg
      ));

    } catch (error) {
      console.error("Gemini API Error:", error);
      setMessages(prev => prev.map(msg =>
        msg.id === loadingId
          ? { ...msg, text: "죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", isLoading: false }
          : msg
      ));
    }
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
              <div className="catalog-card-tags">
                {card.categories.slice(0, 2).map((cat, idx) => (
                  <span key={idx} className="card-tag">#{cat}</span>
                ))}
              </div>
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
