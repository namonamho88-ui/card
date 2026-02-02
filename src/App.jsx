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

      // 프롬프트 최적화: 불필요한 공백 및 문구 제거하여 토큰 절약 (Aggressive Compression)
      const allCards = Object.values(POPULAR_CARDS).flat();
      // Format: Issuer Name(Fee/Perform):Benefit1,Benefit2...
      const cardContext = allCards.map(c =>
        `${c.issuer} ${c.name}(${c.annualFee}/${c.previousMonthSpending}):${c.benefits.join(',')}`
      ).join('\n');

      const systemInstruction = `
        당신은 카드 추천 전문가 '체리피커'입니다. 아래 데이터 기반으로 추천하세요.
        데이터: 카드사 상품명(연회비/실적):혜택...

        [데이터]
        ${cardContext}

        [가이드]
        1. 질문에 맞는 카드 3개 추천.
        2. 이유,혜택,조건 설명.
        3. Markdown 사용.
      `;

      // 모델 변경: gemini-2.0-flash (429) -> gemini-flash-latest (Stable)
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userMsg }] }],
          system_instruction: { parts: [{ text: systemInstruction }] }
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too Many Requests (Rate Limit)");
        }
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
      let errorMsg = "죄송합니다. 일시적인 오류가 발생했습니다.";

      if (error.message.includes("Too Many Requests")) {
        errorMsg = "⚠️ 가용량이 초과되었습니다 (429 Error).\n\n무료 버전 API 사용량이 많아 일시적으로 제한되었습니다. 약 1분 뒤에 다시 시도해주세요.";
      }

      setMessages(prev => prev.map(msg =>
        msg.id === loadingId
          ? { ...msg, text: errorMsg, isLoading: false }
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
