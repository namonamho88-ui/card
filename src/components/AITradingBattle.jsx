import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============ 스타일 ============
const styles = {
    body: {
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        background: 'transparent',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '10px 10px 100px 10px', // Bottom padding for nav bar
        color: '#e0e0e0',
    },
    container: {
        background: '#1a1a2e',
        borderRadius: 16,
        padding: '16px 12px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        border: '1px solid #333',
        marginBottom: 20,
    },
    header: { textAlign: 'center', marginBottom: 12 },
    h1: {
        background: 'linear-gradient(90deg, #00d2ff, #7b2ff7)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        fontSize: 22, // 폰트 크기 소폭 축소
        marginBottom: 4,
        fontWeight: 'bold'
    },
    subtitle: { color: '#888', fontSize: 11 },
    topBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    stats: {
        display: 'flex',
        gap: 10,
        background: '#16213e',
        padding: '8px 12px',
        borderRadius: 10,
        border: '1px solid #333',
        flexWrap: 'wrap',
        flex: 1
    },
    statItem: { textAlign: 'center', flex: 1 },
    statLabel: { fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
    statValue: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
    profit: { color: '#00e676' },
    loss: { color: '#ff5252' },
    timerBox: { display: 'none' }, // 더 이상 사용하지 않음 (수익률 섹션으로 이동)
    timerVal: { fontSize: 20, fontWeight: '800', color: '#ffab40', marginTop: 4, letterSpacing: '1px' },
    timerDanger: {
        fontSize: 24,
        fontWeight: '900',
        color: '#ff5252',
        marginTop: 4,
        animation: 'pulse 0.5s infinite',
        textShadow: '0 0 15px rgba(255,82,82,0.8), 0 0 5px #fff',
        letterSpacing: '1px'
    },
    infoBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        flexWrap: 'wrap',
        gap: 6,
    },
    patternBadge: {
        background: 'linear-gradient(90deg, #7b2ff7, #00d2ff)',
        color: 'white',
        padding: '4px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 'bold',
    },
    signalBuy: {
        padding: '4px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 'bold',
        background: 'rgba(0,230,118,0.15)',
        color: '#00e676',
        border: '1px solid #00e676',
    },
    signalSell: {
        padding: '4px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 'bold',
        background: 'rgba(255,82,82,0.15)',
        color: '#ff5252',
        border: '1px solid #ff5252',
    },
    signalNeutral: {
        padding: '4px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 'bold',
        background: 'rgba(255,171,64,0.15)',
        color: '#ffab40',
        border: '1px solid #ffab40',
    },
    chartWrapper: {
        background: '#0d1117',
        borderRadius: 10,
        padding: 6,
        marginBottom: 10,
        border: '1px solid #333',
    },
    chartToolbar: { display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' },
    toolBtn: {
        background: '#16213e',
        color: '#aaa',
        border: '1px solid #333',
        padding: '4px 8px',
        borderRadius: 6,
        fontSize: 10,
        cursor: 'pointer',
        transition: '0.2s',
        flex: 'none',
    },
    toolBtnActive: {
        background: '#7b2ff7',
        color: 'white',
        border: '1px solid #7b2ff7',
        padding: '4px 8px',
        borderRadius: 6,
        fontSize: 10,
        cursor: 'pointer',
        flex: 'none',
    },
    chartContainer: { position: 'relative', height: 220 }, // 높이 소폭 조정
    volContainer: { height: 40, marginTop: 4 },
    controls: { display: 'flex', gap: 6, marginBottom: 10 },
    tradeBtn: {
        flex: 1,
        padding: 12,
        border: 'none',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.2s',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    buyBtn: { background: 'linear-gradient(135deg, #00c853, #00e676)', color: '#000' },
    sellBtn: { background: 'linear-gradient(135deg, #d50000, #ff5252)', color: '#fff' },
    closeBtn: { background: 'linear-gradient(135deg, #ff6f00, #ffab40)', color: '#000' },
    startBtn: {
        width: '100%',
        background: 'linear-gradient(135deg, #7b2ff7, #00d2ff)',
        color: 'white',
        padding: 14,
        border: 'none',
        borderRadius: 12,
        fontSize: 16,
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.3s',
        letterSpacing: 1,
    },
    disabled: { opacity: 0.35, pointerEvents: 'none' },
    msgBase: {
        textAlign: 'center',
        padding: 6,
        borderRadius: 8,
        marginBottom: 8,
        fontWeight: 'bold',
        fontSize: 12,
        minHeight: 32,
        transition: 'opacity 0.3s',
    },
    msgSuccess: { background: 'rgba(0,230,118,0.15)', color: '#00e676', border: '1px solid rgba(0,230,118,0.3)' },
    msgError: { background: 'rgba(255,82,82,0.15)', color: '#ff5252', border: '1px solid rgba(255,82,82,0.3)' },
    msgInfo: { background: 'rgba(0,210,255,0.1)', color: '#00d2ff', border: '1px solid rgba(0,210,255,0.3)' },
    posInfo: {
        display: 'flex',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 10,
        fontSize: 11,
        flexWrap: 'wrap'
    },
    posLabel: { color: '#888' },
    posVal: { fontWeight: 'bold' },
    leaderboard: {
        background: '#16213e',
        padding: 10,
        borderRadius: 10,
        marginTop: 10,
        border: '1px solid #333',
    },
    lbTitle: { color: '#ffab40', marginBottom: 6, fontSize: 13, fontWeight: 'bold' },
    lbRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '4px 0',
        fontSize: 11,
        borderBottom: '1px solid #222',
    },
    diffSelector: { display: 'flex', gap: 4, marginBottom: 12, justifyContent: 'center', flexWrap: 'wrap' },
    diffBtn: {
        padding: '4px 10px',
        borderRadius: 8,
        fontSize: 11,
        cursor: 'pointer',
        border: '1px solid #444',
        background: '#16213e',
        color: '#aaa',
        transition: '0.2s',
    },
    diffBtnActive: {
        padding: '4px 10px',
        borderRadius: 8,
        fontSize: 11,
        cursor: 'pointer',
        border: '1px solid #7b2ff7',
        background: '#7b2ff7',
        color: '#fff',
    },
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    resultCard: {
        background: '#1a1a2e',
        border: '1px solid #444',
        borderRadius: 20,
        padding: 24,
        textAlign: 'center',
        maxWidth: 340,
        width: '90%',
    },
    resultBtn: {
        marginTop: 16,
        background: 'linear-gradient(135deg, #7b2ff7, #00d2ff)',
        color: 'white',
        border: 'none',
        padding: '12px 30px',
        borderRadius: 10,
        fontSize: 15,
        fontWeight: 'bold',
        cursor: 'pointer',
    },
    legendWrap: { display: 'flex', gap: 8, fontSize: 9, color: '#888', marginTop: 4, flexWrap: 'wrap' },
    legendItem: { display: 'flex', alignItems: 'center', gap: 2 },
    legendDot: (c) => ({ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block' }),
    liveDot: {
        width: 6,
        height: 6,
        background: '#ff5252',
        borderRadius: '50%',
        display: 'inline-block',
        marginRight: 4,
        animation: 'pulse 1s infinite',
    },
};

// ============ 15가지 패턴 ============
const getDiffMult = (diff) => {
    switch (diff) {
        case 'easy': return 0.8;
        case 'normal': return 1.2;
        case 'hard': return 1.8;
        case 'extreme': return 2.5;
        default: return 1;
    }
};

const PATTERNS = [
    {
        id: 'uptrend', name: '📈 강한 상승세', signal: 'buy',
        gen: (i, n, p, dm) => p + (Math.random() * 1.5 - 0.2) * dm,
    },
    {
        id: 'downtrend', name: '📉 강한 하락세', signal: 'sell',
        gen: (i, n, p, dm) => p - (Math.random() * 1.5 - 0.2) * dm,
    },
    {
        id: 'sideways', name: '➡️ 횡보', signal: 'neutral',
        gen: (i, n, p, dm) => {
            const bias = p < 1000 ? 0.2 : 0;
            return p + (Math.random() * 1.2 - 0.6 + bias) * dm;
        },
    },
    {
        id: 'v_bottom', name: '✅ V자 반등', signal: 'buy',
        gen: (i, n, p, dm) => i < n / 2 ? p - (Math.random() * 1.5 + 0.3) * dm : p + (Math.random() * 1.8 + 0.2) * dm,
    },
    {
        id: 'inv_v', name: '🔻 역V자 하락', signal: 'sell',
        gen: (i, n, p, dm) => i < n / 2 ? p + (Math.random() * 1.5 + 0.3) * dm : p - (Math.random() * 1.8 + 0.2) * dm,
    },
    {
        id: 'double_bottom', name: '🔵 이중 바닥', signal: 'buy',
        gen: (i, n, p, dm) => {
            const ph = i / n;
            if (ph < 0.3) return p - (Math.random() * 1.2 + 0.2) * dm;
            if (ph < 0.45) return p + (Math.random() * 1.2 + 0.2) * dm;
            if (ph < 0.7) return p - (Math.random() * 1.2 + 0.1) * dm;
            return p + (Math.random() * 1.5 + 0.3) * dm;
        },
    },
    {
        id: 'double_top', name: '🔴 이중 천장', signal: 'sell',
        gen: (i, n, p, dm) => {
            const ph = i / n;
            if (ph < 0.3) return p + (Math.random() * 1.2 + 0.2) * dm;
            if (ph < 0.45) return p - (Math.random() * 1.2 + 0.2) * dm;
            if (ph < 0.7) return p + (Math.random() * 1.2 + 0.1) * dm;
            return p - (Math.random() * 1.5 + 0.3) * dm;
        },
    },
    {
        id: 'head_shoulders', name: '👤 헤드앤숄더', signal: 'sell',
        gen: (i, n, p, dm) => {
            const ph = i / n;
            if (ph < 0.2) return p + (Math.random() * 1.2) * dm;
            if (ph < 0.3) return p - (Math.random() * 1.0) * dm;
            if (ph < 0.5) return p + (Math.random() * 1.8) * dm;
            if (ph < 0.65) return p - (Math.random() * 1.5) * dm;
            if (ph < 0.8) return p + (Math.random() * 1.0) * dm;
            return p - (Math.random() * 1.8 + 0.3) * dm;
        },
    },
    {
        id: 'inv_head_shoulders', name: '🙃 역헤드앤숄더', signal: 'buy',
        gen: (i, n, p, dm) => {
            const ph = i / n;
            if (ph < 0.2) return p - (Math.random() * 1.2) * dm;
            if (ph < 0.3) return p + (Math.random() * 1.0) * dm;
            if (ph < 0.5) return p - (Math.random() * 1.8) * dm;
            if (ph < 0.65) return p + (Math.random() * 1.5) * dm;
            if (ph < 0.8) return p - (Math.random() * 1.0) * dm;
            return p + (Math.random() * 1.8 + 0.3) * dm;
        },
    },
    {
        id: 'ascending_triangle', name: '🔺 상승 삼각형', signal: 'buy',
        gen: (i, n, p, dm) => {
            const ph = i / n;
            const osc = Math.sin(i * 0.5) * (dm * (1 - ph) * 3);
            return p + (ph * dm * 0.5) + osc + (Math.random() - 0.4) * dm;
        },
    },
    {
        id: 'descending_triangle', name: '🔻 하락 삼각형', signal: 'sell',
        gen: (i, n, p, dm) => {
            const ph = i / n;
            const osc = Math.sin(i * 0.5) * (dm * (1 - ph) * 3);
            return p - (ph * dm * 0.5) + osc + (Math.random() - 0.6) * dm;
        },
    },
    {
        id: 'bull_flag', name: '🏁 상승 깃발', signal: 'buy',
        gen: (i, n, p, dm) => {
            const ph = i / n;
            if (ph < 0.3) return p + (Math.random() * 2 + 0.3) * dm;
            if (ph < 0.7) return p - (Math.random() * 0.5) * dm;
            return p + (Math.random() * 1.8 + 0.2) * dm;
        },
    },
    {
        id: 'bear_flag', name: '🚩 하락 깃발', signal: 'sell',
        gen: (i, n, p, dm) => {
            const ph = i / n;
            if (ph < 0.3) return p - (Math.random() * 2 + 0.3) * dm;
            if (ph < 0.7) return p + (Math.random() * 0.5) * dm;
            return p - (Math.random() * 1.8 + 0.2) * dm;
        },
    },
    {
        id: 'cup_handle', name: '☕ 컵앤핸들', signal: 'buy',
        gen: (i, n, p, dm) => {
            const ph = i / n;
            if (ph < 0.5) {
                const depth = Math.sin(ph * Math.PI) * dm * 3;
                return p - depth + (Math.random() - 0.5) * dm;
            }
            if (ph < 0.75) return p - (Math.random() * 0.5) * dm;
            return p + (Math.random() * 2 + 0.3) * dm;
        },
    },
    {
        id: 'spike_crash', name: '💥 스파이크 폭락', signal: 'sell',
        gen: (i, n, p, dm) => {
            const ph = i / n;
            if (ph < 0.4) return p + (Math.random() * 1.2 - 0.3) * dm;
            if (ph < 0.5) return p + (Math.random() * 4) * dm;
            return p - (Math.random() * 3 + 1) * dm;
        },
    },
    {
        id: 'panic_sell', name: '💸 패닉 셀', signal: 'sell',
        gen: (i, n, p, dm) => p - (Math.random() * 3 + 0.5) * dm,
    },
    {
        id: 'to_the_moon', name: '🚀 투 더 문', signal: 'buy',
        gen: (i, n, p, dm) => {
            const ph = i / n;
            return p + (Math.random() * ph * 6 + 0.3) * dm;
        },
    },
    {
        id: 'dead_cat', name: '🐈 데드 캣 바운스', signal: 'sell',
        gen: (i, n, p, dm) => {
            const ph = i / n;
            if (ph < 0.3) return p - (Math.random() * 2.5 + 0.5) * dm;
            if (ph < 0.6) return p + (Math.random() * 1.2) * dm;
            return p - (Math.random() * 2 + 0.3) * dm;
        }
    },
    {
        id: 'spring', name: '🧼 바닥 털기', signal: 'buy',
        gen: (i, n, p, dm) => {
            const ph = i / n;
            if (ph < 0.2) return p - (Math.random() * 1.5 + 0.5) * dm;
            if (ph < 0.4) return p + (Math.random() * 1) * dm;
            return p + (Math.random() * 3 + 1) * dm;
        }
    },
    {
        id: 'accumulation', name: '🏗️ 바닥 매집', signal: 'buy',
        gen: (i, n, p, dm) => {
            const ph = i / n;
            const osc = Math.sin(i * 1.5) * dm * 1.5;
            if (ph < 0.7) return p + osc + (Math.random() - 0.4) * dm;
            return p + (Math.random() * 2.5 + 0.5) * dm;
        }
    },
];
// ============ 용어 사전 (Glossary) ============
const GLOSSARY = {
    // 차트 패턴
    '📈 강한 상승세': '주가가 지속적으로 올라가는 추세입니다. 매수세가 매도세보다 강해 가격이 계속 오릅니다.',
    '📉 강한 하락세': '주가가 지속적으로 내려가는 추세입니다. 매도세가 매수세보다 강해 가격이 계속 떨어집니다.',
    '➡️ 횡보': '주가가 큰 변동 없이 일정 범위 안에서 움직이는 상태입니다. 방향을 결정하지 못한 시장을 나타냅니다.',
    '✅ V자 반등': '주가가 급락한 뒤 빠르게 반등하여 V자 모양을 그리는 패턴입니다. 강한 매수세 유입 신호입니다.',
    '🔻 역V자 하락': '주가가 급등한 뒤 빠르게 하락하여 역V자 모양을 그리는 패턴입니다. 차익 실현 매물 출회를 의미합니다.',
    '🔵 이중 바닥': 'W 모양으로 두 번 바닥을 찍은 뒤 상승하는 패턴입니다. 강력한 지지선 확인 후 상승 전환 신호입니다.',
    '🔴 이중 천장': 'M 모양으로 두 번 고점을 찍은 뒤 하락하는 패턴입니다. 저항선 돌파 실패로 하락 전환 신호입니다.',
    '👤 헤드앤숄더': '머리와 양쪽 어깨 모양의 패턴으로, 상승 추세의 끝에 나타나는 대표적인 하락 반전 신호입니다.',
    '🙃 역헤드앤숄더': '뒤집힌 헤드앤숄더로, 하락 추세의 끝에 나타나는 강력한 상승 반전 신호입니다.',
    '🔺 상승 삼각형': '고점은 일정하고 저점이 점차 높아지는 삼각형 패턴입니다. 돌파 시 강한 상승이 예상됩니다.',
    '🔻 하락 삼각형': '저점은 일정하고 고점이 점차 낮아지는 삼각형 패턴입니다. 하락 돌파 시 큰 낙폭이 예상됩니다.',
    '🏁 상승 깃발': '급등 후 약간의 조정(깃발 모양)을 거쳐 다시 상승하는 패턴입니다. 추세 지속 신호입니다.',
    '🚩 하락 깃발': '급락 후 약간의 반등(깃발 모양)을 거쳐 다시 하락하는 패턴입니다. 하락 추세 지속 신호입니다.',
    '☕ 컵앤핸들': '찻잔과 손잡이 모양의 패턴으로, 바닥을 다진 후 강한 상승 돌파가 예상되는 매수 신호입니다.',
    '💥 스파이크 폭락': '급격한 가격 상승 후 더 급격한 폭락이 일어나는 패턴입니다. 거품 붕괴를 의미합니다.',
    '💸 패닉 셀': '공포에 의한 투매로 주가가 급격히 하락하는 현상입니다. 시장에 극심한 공포가 퍼진 상태입니다.',
    '🚀 투 더 문': '주가가 로켓처럼 급등하는 극단적 상승 패턴입니다. 강한 모멘텀과 FOMO 매수가 결합된 상태입니다.',
    '🐈 데드 캣 바운스': '급락 후 일시적 반등(죽은 고양이도 높은 곳에서 떨어뜨리면 튀긴다)이지만 다시 하락하는 패턴입니다.',
    '🧼 바닥 털기': '세력이 의도적으로 가격을 내려 개인 투자자의 물량을 털어낸 뒤 급등시키는 패턴입니다.',
    '🏗️ 바닥 매집': '저가에서 세력이 조용히 물량을 모으는 구간으로, 횡보 후 강한 상승이 나타납니다.',
    // 시그널
    '매수 신호': '현재 차트 패턴이 주가 상승을 시사합니다. 매수(BUY)를 고려할 타이밍입니다.',
    '매도 신호': '현재 차트 패턴이 주가 하락을 시사합니다. 보유 중인 포지션을 매도(SELL)할 타이밍입니다.',
    '관망': '방향성이 뚜렷하지 않아 매수/매도 모두 위험할 수 있습니다. 추세가 확인될 때까지 기다리세요.',
    // 보조지표
    '이평선(20)': '이동평균선(MA 20): 최근 20개 봉의 종가 평균을 이은 선입니다. 추세 방향을 판단하는 기본 지표로, 주가가 이평선 위면 상승 추세, 아래면 하락 추세로 봅니다.',
    '볼린저밴드': '이동평균선 위아래로 표준편차 2배 폭의 밴드를 그린 지표입니다. 밴드 상단 터치 시 과매수(하락 가능), 하단 터치 시 과매도(상승 가능)를 의미합니다.',
    '상대강도(RSI)': '상대강도지수(0~100): 최근 가격 변동의 상승/하락 크기를 비교한 지표입니다. 70 이상이면 과매수(하락 주의), 30 이하면 과매도(반등 기대)로 해석합니다.',
};
// ============ 유틸 ============
const shuffleArray = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

const calcMA = (arr, period) =>
    arr.map((_, i) => {
        if (i < period - 1) return null;
        let sum = 0;
        for (let j = i - period + 1; j <= i; j++) sum += arr[j];
        return sum / period;
    });

const calcStd = (arr) => {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(arr.map((v) => (v - mean) ** 2).reduce((a, b) => a + b, 0) / arr.length);
};

const calcRSI = (closes, period) => {
    const result = new Array(closes.length).fill(null);
    if (closes.length < period + 1) return result;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const d = closes[i] - closes[i - 1];
        if (d > 0) gains += d; else losses -= d;
    }
    let ag = gains / period, al = losses / period;
    result[period] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
    for (let i = period + 1; i < closes.length; i++) {
        const d = closes[i] - closes[i - 1];
        ag = (ag * (period - 1) + (d > 0 ? d : 0)) / period;
        al = (al * (period - 1) + (d < 0 ? -d : 0)) / period;
        result[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
    }
    return result;
};

const getGrade = (pct) => {
    if (pct >= 50) return '🏆 전설의 트레이더';
    if (pct >= 30) return '💎 다이아몬드';
    if (pct >= 15) return '🥇 골드';
    if (pct >= 5) return '🥈 실버';
    if (pct >= 0) return '🥉 브론즈';
    if (pct >= -10) return '📉 초보';
    return '💀 파산 위기';
};

const formatMoney = (v) => v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원';

// ============ 메인 컴포넌트 ============
const AITradingBattle = () => {
    // State
    const [chartType, setChartType] = useState('candle');
    const [indicators, setIndicators] = useState({ ma: false, bb: false, rsi: false });
    const [running, setRunning] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [showGuide, setShowGuide] = useState(true); // 가이드 모달 추가
    const [glossaryTip, setGlossaryTip] = useState(null); // 용어 설명 표시
    const [message, setMessage] = useState({ text: '', type: '', visible: false });
    const [scores, setScores] = useState([]);

    // Game ref (mutable game state — not triggering re-renders on every tick)
    const gameRef = useRef(null);
    const mainCanvasRef = useRef(null);
    const volCanvasRef = useRef(null);
    const animRef = useRef(null);
    const tickTimerRef = useRef(null);
    const countdownRef = useRef(null);
    const msgTimerRef = useRef(null);

    // For forcing UI stat updates at controlled rate
    const [uiState, setUiState] = useState({
        balance: 1000000,
        profitPct: 0,
        trades: 0,
        wins: 0,
        winRate: '-',
        timeLeft: 90,
        patternName: '-',
        patternSignal: 'neutral',
        position: null,
        currentPrice: 10000,
        positionPnL: 0,
    });
    const [resultData, setResultData] = useState({});

    // Chart type & indicator refs (so draw loop sees latest without re-render)
    const chartTypeRef = useRef(chartType);
    const indicatorsRef = useRef(indicators);

    useEffect(() => { chartTypeRef.current = chartType; }, [chartType]);
    useEffect(() => { indicatorsRef.current = indicators; }, [indicators]);

    // Load scores
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('tradingScores') || '[]');
            setScores(saved);
        } catch { setScores([]); }
    }, []);

    // Resize canvases
    const resizeCanvases = useCallback(() => {
        const mc = mainCanvasRef.current;
        const vc = volCanvasRef.current;
        if (mc && mc.parentElement) {
            mc.width = mc.parentElement.clientWidth;
            mc.height = mc.parentElement.clientHeight;
        }
        if (vc && vc.parentElement) {
            vc.width = vc.parentElement.clientWidth;
            vc.height = vc.parentElement.clientHeight;
        }
    }, []);

    useEffect(() => {
        resizeCanvases();
        window.addEventListener('resize', resizeCanvases);
        return () => window.removeEventListener('resize', resizeCanvases);
    }, [resizeCanvases]);

    // Draw idle chart
    useEffect(() => {
        if (!running && mainCanvasRef.current) {
            const mc = mainCanvasRef.current;
            const ctx = mc.getContext('2d');
            resizeCanvases();
            ctx.fillStyle = '#0d1117';
            ctx.fillRect(0, 0, mc.width, mc.height);
            ctx.fillStyle = '#333';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('게임을 시작하면 차트가 표시됩니다', mc.width / 2, mc.height / 2);
            ctx.textAlign = 'left';
        }
    }, [running, resizeCanvases]);

    // Show message helper
    const showMsg = useCallback((text, type) => {
        setMessage({ text, type, visible: true });
        clearTimeout(msgTimerRef.current);
        msgTimerRef.current = setTimeout(() => setMessage((p) => ({ ...p, visible: false })), 2500);
    }, []);

    // ============ Game Engine ============
    const initGame = useCallback(() => {
        const dm = getDiffMult('normal'); // 기본 난이도를 '보통' 배율로 고정
        const patterns = shuffleArray(PATTERNS);

        gameRef.current = {
            balance: 1000000,
            initBalance: 1000000,
            position: null,
            trades: 0,
            wins: 0,
            timeLeft: 60, // 모든 난이도 60초 통일
            candles: [],
            currentPrice: 10000,
            candleOpen: 10000,
            candleHigh: 10000,
            candleLow: 10000,
            ticksPerCandle: 8,
            candleTick: 0,
            patterns,
            patternIdx: 0,
            patternTick: 0,
            patternLength: 70 + Math.floor(Math.random() * 40),
            dm: dm * 50, // 원화 단위에 맞게 변동폭 조정
        };
    }, []);

    const getCurrentPattern = useCallback(() => {
        const g = gameRef.current;
        if (!g) return PATTERNS[0];
        if (g.patternIdx >= g.patterns.length) {
            g.patterns = shuffleArray(PATTERNS);
            g.patternIdx = 0;
        }
        return g.patterns[g.patternIdx];
    }, []);

    // ============ Trade & End Game ============
    const closePosition = useCallback(() => {
        const g = gameRef.current;
        if (!g || !g.position) return;
        let pnl;
        if (g.position.type === 'long') pnl = (g.currentPrice - g.position.entry) * g.position.size;
        else pnl = (g.position.entry - g.currentPrice) * g.position.size;
        g.balance += pnl;
        g.trades++;
        if (pnl > 0) g.wins++;
        showMsg(pnl > 0 ? `✅ 매도 완료! +${formatMoney(pnl)}` : `❌ 매도 완료! ${formatMoney(pnl)}`, pnl > 0 ? 'success' : 'error');
        g.position = null;
    }, [showMsg]);

    const endGame = useCallback(() => {
        const g = gameRef.current;
        if (!g) return;

        // Position check
        if (g.position) {
            closePosition();
        }

        clearInterval(tickTimerRef.current);
        clearInterval(countdownRef.current);
        cancelAnimationFrame(animRef.current);

        // 결과 산출
        const finalBalance = g.balance;
        const profit = finalBalance - g.initBalance;
        const pct = (profit / g.initBalance * 100);

        setResultData({
            profit,
            pct: pct.toFixed(2),
            trades: g.trades,
            winRate: g.trades > 0 ? (g.wins / g.trades * 100).toFixed(0) : '0',
            grade: getGrade(pct),
            balance: finalBalance
        });

        // Save
        let saved = [];
        try { saved = JSON.parse(localStorage.getItem('tradingScores') || '[]'); } catch { }
        saved.push({
            balance: finalBalance,
            pct: parseFloat(pct.toFixed(2)),
            diff: 'normal',
            date: new Date().toLocaleDateString()
        });
        saved.sort((a, b) => b.balance - a.balance);
        saved = saved.slice(0, 5);
        localStorage.setItem('tradingScores', JSON.stringify(saved));
        setScores(saved);

        setRunning(false);
        setShowResult(true);
    }, [closePosition]);

    const nextPattern = useCallback(() => {
        const g = gameRef.current;
        g.patternIdx++;
        g.patternTick = 0;
        g.patternLength = 70 + Math.floor(Math.random() * 40);
    }, []);

    const priceTick = useCallback(() => {
        const g = gameRef.current;
        if (!g) return;

        const pat = getCurrentPattern();
        g.patternTick++;

        let newPrice = pat.gen(g.patternTick, g.patternLength, g.currentPrice, g.dm);
        newPrice = Math.max(100, Math.min(50000, newPrice)); // Floor at 100
        g.currentPrice = newPrice;

        g.candleTick++;
        g.candleHigh = Math.max(g.candleHigh, newPrice);
        g.candleLow = Math.min(g.candleLow, newPrice);

        if (g.candleTick >= g.ticksPerCandle) {
            const vol = Math.abs(newPrice - g.candleOpen) * (50 + Math.random() * 100);
            g.candles.push({ o: g.candleOpen, h: g.candleHigh, l: g.candleLow, c: newPrice, v: vol });
            if (g.candles.length > 80) g.candles.shift();
            g.candleOpen = newPrice;
            g.candleHigh = newPrice;
            g.candleLow = newPrice;
            g.candleTick = 0;
        }

        if (g.patternTick >= g.patternLength) nextPattern();
    }, [getCurrentPattern, nextPattern, endGame]);

    // ============ Drawing ============
    const drawLineSeries = (ctx, data, len, pad, cw, toY, color, lw) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.beginPath();
        let started = false;
        data.forEach((v, i) => {
            if (v === null) return;
            const x = pad.l + (i + 0.5) * (cw / len);
            if (!started) { ctx.moveTo(x, toY(v)); started = true; }
            else ctx.lineTo(x, toY(v));
        });
        ctx.stroke();
    };

    const drawMainChart = useCallback(() => {
        const mc = mainCanvasRef.current;
        if (!mc) return;
        const ctx = mc.getContext('2d');
        const g = gameRef.current;
        if (!g) return;
        const w = mc.width, h = mc.height;
        ctx.clearRect(0, 0, w, h);

        const candles = g.candles;
        if (candles.length < 2) return;

        const pad = { t: 20, b: 20, l: 10, r: 70 };
        const cw = w - pad.l - pad.r;
        const ch = h - pad.t - pad.b;

        let allPrices = candles.flatMap((c) => [c.h, c.l]);
        allPrices.push(g.candleHigh, g.candleLow);
        let minP = Math.min(...allPrices);
        let maxP = Math.max(...allPrices);
        const range = maxP - minP || 1;
        minP -= range * 0.05;
        maxP += range * 0.05;
        const pRange = maxP - minP;

        const toY = (p) => pad.t + ch - ((p - minP) / pRange) * ch;
        const barW = Math.max(3, cw / (candles.length + 1) - 2);

        // Grid
        ctx.strokeStyle = '#1a2332';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = pad.t + (ch / 5) * i;
            ctx.beginPath();
            ctx.moveTo(pad.l, y);
            ctx.lineTo(w - pad.r, y);
            ctx.stroke();
            const price = maxP - (pRange / 5) * i;
            ctx.fillStyle = '#555';
            ctx.font = '10px monospace';
            ctx.fillText(formatMoney(price), w - pad.r + 5, y + 4);
        }

        const ind = indicatorsRef.current;
        const ct = chartTypeRef.current;

        // Bollinger Bands
        if (ind.bb && candles.length >= 20) {
            const closes = candles.map((c) => c.c);
            const ma20 = calcMA(closes, 20);
            const upper = [], lower = [];
            for (let i = 0; i < closes.length; i++) {
                if (ma20[i] === null) { upper.push(null); lower.push(null); continue; }
                const slice = closes.slice(Math.max(0, i - 19), i + 1);
                const std = calcStd(slice);
                upper.push(ma20[i] + std * 2);
                lower.push(ma20[i] - std * 2);
            }
            ctx.fillStyle = 'rgba(123,47,247,0.08)';
            ctx.beginPath();
            let started = false;
            for (let i = 0; i < candles.length; i++) {
                if (upper[i] === null) continue;
                const x = pad.l + (i + 0.5) * (cw / candles.length);
                if (!started) { ctx.moveTo(x, toY(upper[i])); started = true; }
                else ctx.lineTo(x, toY(upper[i]));
            }
            for (let i = candles.length - 1; i >= 0; i--) {
                if (lower[i] === null) continue;
                const x = pad.l + (i + 0.5) * (cw / candles.length);
                ctx.lineTo(x, toY(lower[i]));
            }
            ctx.closePath();
            ctx.fill();
            drawLineSeries(ctx, upper, candles.length, pad, cw, toY, '#7b2ff755', 1);
            drawLineSeries(ctx, lower, candles.length, pad, cw, toY, '#7b2ff755', 1);
        }

        // MA
        if (ind.ma && candles.length >= 5) {
            const closes = candles.map((c) => c.c);
            const ma20 = calcMA(closes, 20);
            drawLineSeries(ctx, ma20, candles.length, pad, cw, toY, '#ffab40', 2);
        }

        // Chart type
        if (ct === 'candle') {
            candles.forEach((c, i) => {
                const x = pad.l + (i + 0.5) * (cw / candles.length);
                const bull = c.c >= c.o;
                const color = bull ? '#00e676' : '#ff5252';
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, toY(c.h));
                ctx.lineTo(x, toY(c.l));
                ctx.stroke();
                const bodyTop = toY(Math.max(c.o, c.c));
                const bodyBot = toY(Math.min(c.o, c.c));
                const bodyH = Math.max(1, bodyBot - bodyTop);
                ctx.fillStyle = color;
                if (!bull) {
                    ctx.fillRect(x - barW / 2, bodyTop, barW, bodyH);
                } else {
                    ctx.strokeRect(x - barW / 2, bodyTop, barW, bodyH);
                }
            });
        } else if (ct === 'line') {
            ctx.strokeStyle = '#00d2ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            candles.forEach((c, i) => {
                const x = pad.l + (i + 0.5) * (cw / candles.length);
                i === 0 ? ctx.moveTo(x, toY(c.c)) : ctx.lineTo(x, toY(c.c));
            });
            ctx.stroke();
        } else if (ct === 'area') {
            const grad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
            grad.addColorStop(0, 'rgba(0,210,255,0.3)');
            grad.addColorStop(1, 'rgba(0,210,255,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(pad.l + 0.5 * (cw / candles.length), h - pad.b);
            candles.forEach((c, i) => {
                const x = pad.l + (i + 0.5) * (cw / candles.length);
                ctx.lineTo(x, toY(c.c));
            });
            ctx.lineTo(pad.l + (candles.length - 0.5) * (cw / candles.length), h - pad.b);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#00d2ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            candles.forEach((c, i) => {
                const x = pad.l + (i + 0.5) * (cw / candles.length);
                i === 0 ? ctx.moveTo(x, toY(c.c)) : ctx.lineTo(x, toY(c.c));
            });
            ctx.stroke();
        }

        // Position entry line
        if (g.position) {
            const ey = toY(g.position.entry);
            ctx.setLineDash([5, 3]);
            ctx.strokeStyle = g.position.type === 'long' ? '#00e676' : '#ff5252';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pad.l, ey);
            ctx.lineTo(w - pad.r, ey);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = g.position.type === 'long' ? '#00e676' : '#ff5252';
            ctx.font = 'bold 10px monospace';
            ctx.fillText((g.position.type === 'long' ? '매수' : '하락') + ' ' + formatMoney(g.position.entry), pad.l + 4, ey - 4);
        }

        // Current price tag
        const cpY = toY(g.currentPrice);
        ctx.fillStyle = '#00d2ff';
        ctx.fillRect(w - pad.r, cpY - 10, pad.r, 20);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(formatMoney(g.currentPrice), w - pad.r + 4, cpY + 4);
    }, []);

    const drawVolumeChart = useCallback(() => {
        const vc = volCanvasRef.current;
        if (!vc) return;
        const ctx = vc.getContext('2d');
        const g = gameRef.current;
        if (!g) return;
        const w = vc.width, h = vc.height;
        ctx.clearRect(0, 0, w, h);

        const candles = g.candles;
        if (candles.length < 2) return;
        const pad = { l: 10, r: 70 };
        const cw = w - pad.l - pad.r;
        const ind = indicatorsRef.current;

        if (ind.rsi && candles.length >= 15) {
            const closes = candles.map((c) => c.c);
            const rsi = calcRSI(closes, 14);
            const toRY = (v) => h - (v / 100) * h;
            ctx.fillStyle = 'rgba(0,230,118,0.05)';
            ctx.fillRect(pad.l, toRY(100), cw, toRY(70) - toRY(100));
            ctx.fillStyle = 'rgba(255,82,82,0.05)';
            ctx.fillRect(pad.l, toRY(30), cw, toRY(0) - toRY(30));
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = '#333';
            ctx.beginPath();
            ctx.moveTo(pad.l, toRY(70));
            ctx.lineTo(w - pad.r, toRY(70));
            ctx.moveTo(pad.l, toRY(30));
            ctx.lineTo(w - pad.r, toRY(30));
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.strokeStyle = '#00d2ff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            let started = false;
            rsi.forEach((v, i) => {
                if (v === null) return;
                const x = pad.l + (i + 0.5) * (cw / candles.length);
                if (!started) { ctx.moveTo(x, toRY(v)); started = true; }
                else ctx.lineTo(x, toRY(v));
            });
            ctx.stroke();
            ctx.fillStyle = '#555';
            ctx.font = '9px monospace';
            ctx.fillText('RSI', w - pad.r + 4, 10);
            return;
        }

        const maxV = Math.max(...candles.map((c) => c.v)) || 1;
        const barW = Math.max(2, cw / candles.length - 1);
        candles.forEach((c, i) => {
            const x = pad.l + (i + 0.5) * (cw / candles.length);
            const bh = (c.v / maxV) * (h - 4);
            const bull = c.c >= c.o;
            ctx.fillStyle = bull ? 'rgba(0,230,118,0.4)' : 'rgba(255,82,82,0.4)';
            ctx.fillRect(x - barW / 2, h - bh, barW, bh);
        });
    }, []);

    const drawAll = useCallback(() => {
        drawMainChart();
        drawVolumeChart();
        if (gameRef.current && running) {
            animRef.current = requestAnimationFrame(drawAll);
        }
    }, [drawMainChart, drawVolumeChart, running]);

    const handleTrade = useCallback((action) => {
        const g = gameRef.current;
        if (!g) return;
        if (action === 'buy') {
            if (g.position) return; // Already in a position
            g.position = { type: 'long', entry: g.currentPrice, size: 100 };
            showMsg('📈 매수 성공! 현재가: ' + formatMoney(g.currentPrice), 'info');
        } else if (action === 'sell') {
            if (!g.position) return; // No position to close
            closePosition();
        }
    }, [closePosition, showMsg]);



    // ============ UI Sync Timer ============
    const syncUI = useCallback(() => {
        const g = gameRef.current;
        if (!g) return;
        const pat = getCurrentPattern();
        let posPnL = 0;
        if (g.position) {
            posPnL = g.position.type === 'long'
                ? (g.currentPrice - g.position.entry) * g.position.size
                : (g.position.entry - g.currentPrice) * g.position.size;
        }
        setUiState({
            balance: g.balance,
            profitPct: (g.balance - g.initBalance) / g.initBalance * 100,
            trades: g.trades,
            wins: g.wins,
            winRate: g.trades > 0 ? (g.wins / g.trades * 100).toFixed(0) + '%' : '-',
            timeLeft: g.timeLeft,
            patternName: pat.name,
            patternSignal: pat.signal,
            position: g.position ? { ...g.position } : null,
            currentPrice: g.currentPrice,
            positionPnL: posPnL,
        });
    }, [getCurrentPattern]);

    // ============ Start Game ============
    const startGame = useCallback(() => {
        initGame();
        setRunning(true);
        setShowResult(false);
        setShowGuide(false); // 게임 시작 시 가이드 숨기기
        resizeCanvases();

        const g = gameRef.current;

        // Pre-generate candles
        for (let i = 0; i < 30; i++) {
            for (let t = 0; t < g.ticksPerCandle; t++) priceTick();
        }

        // Tick timer
        tickTimerRef.current = setInterval(() => {
            if (gameRef.current) priceTick();
        }, 200);

        // Countdown
        countdownRef.current = setInterval(() => {
            const gg = gameRef.current;
            if (!gg) return;
            gg.timeLeft--;
            if (gg.timeLeft <= 0) {
                endGame();
            }
        }, 1000);

        // UI sync
        const uiTimer = setInterval(() => {
            if (!gameRef.current) { clearInterval(uiTimer); return; }
            syncUI();
        }, 250);

        // Start draw loop
        requestAnimationFrame(function loop() {
            if (gameRef.current) {
                drawMainChart();
                drawVolumeChart();
                animRef.current = requestAnimationFrame(loop);
            }
        });
    }, [initGame, priceTick, endGame, resizeCanvases, syncUI, drawMainChart, drawVolumeChart]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearInterval(tickTimerRef.current);
            clearInterval(countdownRef.current);
            cancelAnimationFrame(animRef.current);
            clearTimeout(msgTimerRef.current);
        };
    }, []);

    const toggleIndicator = (key) => {
        setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const profitColor = uiState.profitPct >= 0 ? styles.profit : styles.loss;
    const signalStyle = uiState.patternSignal === 'buy' ? styles.signalBuy : uiState.patternSignal === 'sell' ? styles.signalSell : styles.signalNeutral;
    const signalText = uiState.patternSignal === 'buy' ? '매수 신호' : uiState.patternSignal === 'sell' ? '매도 신호' : '관망';
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

    return (
        <div style={styles.body}>
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <h1 style={styles.h1}>🤖 AI 트레이딩 Pro</h1>
                    <p style={styles.subtitle}>차트의 흐름을 읽고 매수/매도 타이밍을 잡으세요!</p>
                </div>



                {/* Stats Bar */}
                <div style={styles.topBar}>
                    <div style={styles.stats}>
                        <div style={styles.statItem}>
                            <div style={styles.statLabel}>자산</div>
                            <div style={{ ...styles.statValue, ...profitColor }}>{formatMoney(uiState.balance)}</div>
                        </div>
                        <div style={styles.statItem}>
                            <div style={styles.statLabel}>수익률</div>
                            <div style={{ ...styles.statValue, ...profitColor }}>
                                {(uiState.profitPct >= 0 ? '+' : '') + uiState.profitPct.toFixed(1) + '%'}
                            </div>
                            {running && (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginTop: 6,
                                    paddingTop: 6,
                                    borderTop: '1px solid rgba(255,255,255,0.1)',
                                    width: '100%'
                                }}>
                                    <div style={uiState.timeLeft <= 10 ? styles.timerDanger : styles.timerVal}>
                                        {uiState.timeLeft}s
                                    </div>
                                    <div style={{ fontSize: 9, color: '#888', marginTop: 2, fontWeight: 'normal' }}>남은시간</div>
                                </div>
                            )}
                        </div>
                        <div style={styles.statItem}>
                            <div style={styles.statLabel}>승률</div>
                            <div style={styles.statValue}>{uiState.winRate}</div>
                        </div>
                    </div>

                </div>

                {/* Pattern Info */}
                {running && (
                    <div style={styles.infoBar}>
                        <span style={{ ...styles.patternBadge, cursor: 'pointer' }}
                            onClick={() => setGlossaryTip(glossaryTip === uiState.patternName ? null : uiState.patternName)}
                        >{uiState.patternName}</span>
                        <span style={{ ...signalStyle, cursor: 'pointer' }}
                            onClick={() => setGlossaryTip(glossaryTip === signalText ? null : signalText)}
                        >{signalText}</span>
                    </div>
                )}

                {/* Glossary Tooltip */}
                {glossaryTip && GLOSSARY[glossaryTip] && (
                    <div style={{
                        background: 'rgba(123,47,247,0.1)',
                        border: '1px solid rgba(123,47,247,0.3)',
                        borderRadius: 10,
                        padding: '8px 12px',
                        marginBottom: 8,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                    }}>
                        <span style={{ fontSize: 14, shrink: 0 }}>📖</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 'bold', color: '#b388ff', marginBottom: 2 }}>{glossaryTip}</div>
                            <div style={{ fontSize: 11, color: '#ccc', lineHeight: '1.5' }}>{GLOSSARY[glossaryTip]}</div>
                        </div>
                        <span
                            style={{ fontSize: 12, color: '#666', cursor: 'pointer', padding: '0 4px' }}
                            onClick={() => setGlossaryTip(null)}
                        >✕</span>
                    </div>
                )}

                {/* Message */}
                <div
                    style={{
                        ...styles.msgBase,
                        ...(message.type === 'success' ? styles.msgSuccess : message.type === 'error' ? styles.msgError : styles.msgInfo),
                        opacity: message.visible ? 1 : 0,
                    }}
                >
                    {message.text}
                </div>

                {/* Chart */}
                <div style={styles.chartWrapper}>
                    <div style={styles.chartToolbar}>
                        {['candle', 'line', 'area'].map((t) => {
                            const labels = { candle: '캔들', line: '라인', area: '영역' };
                            return (
                                <button
                                    key={t}
                                    style={chartType === t ? styles.toolBtnActive : styles.toolBtn}
                                    onClick={() => setChartType(t)}
                                >
                                    {labels[t]}
                                </button>
                            );
                        })}
                        {['ma', 'bb', 'rsi'].map((ind) => {
                            const labels = { ma: '이평선(20)', bb: '볼린저밴드', rsi: '상대강도(RSI)' };
                            return (
                                <button
                                    key={ind}
                                    style={indicators[ind] ? styles.toolBtnActive : styles.toolBtn}
                                    onClick={() => {
                                        toggleIndicator(ind);
                                        setGlossaryTip(prev => prev === labels[ind] ? null : labels[ind]);
                                    }}
                                >
                                    {labels[ind]}
                                </button>
                            );
                        })}
                    </div>
                    <div style={styles.chartContainer}>
                        <canvas ref={mainCanvasRef} />
                    </div>
                    <div style={styles.volContainer}>
                        <canvas ref={volCanvasRef} />
                    </div>
                    <div style={styles.legendWrap}>
                        {indicators.ma && (
                            <div style={styles.legendItem}><span style={styles.legendDot('#ffab40')} />이평선(20)</div>
                        )}
                        {indicators.bb && (
                            <div style={styles.legendItem}><span style={styles.legendDot('#7b2ff7')} />볼린저밴드</div>
                        )}
                        {indicators.rsi && (
                            <div style={styles.legendItem}><span style={styles.legendDot('#00d2ff')} />상대강도(RSI)</div>
                        )}
                    </div>
                </div>

                {/* Position Info */}
                {running && uiState.position && (
                    <div style={styles.posInfo}>
                        <div>
                            <span style={styles.posLabel}>진입가: </span>
                            <span style={styles.posVal}>{formatMoney(uiState.position.entry)}</span>
                        </div>
                        <div>
                            <span style={styles.posLabel}>손익: </span>
                            <span style={{ ...styles.posVal, color: uiState.positionPnL >= 0 ? '#00e676' : '#ff5252' }}>
                                {(uiState.positionPnL >= 0 ? '+' : '') + formatMoney(uiState.positionPnL)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div style={{ ...styles.controls, ...(running ? {} : styles.disabled) }}>
                    {!uiState.position ? (
                        <button
                            style={{ ...styles.tradeBtn, ...styles.buyBtn, flex: 1 }}
                            onClick={() => handleTrade('buy')}
                            disabled={!running}
                        >
                            📉 매수 하기
                        </button>
                    ) : (
                        <button
                            style={{ ...styles.tradeBtn, ...styles.sellBtn, flex: 1 }}
                            onClick={() => handleTrade('sell')}
                            disabled={!running}
                        >
                            📈 매도 하기
                        </button>
                    )}
                </div>

                {/* Start Button */}
                {!running && (
                    <button style={styles.startBtn} onClick={startGame}>
                        🚀 게임 시작
                    </button>
                )}

                {/* Leaderboard */}
                <div style={styles.leaderboard}>
                    <div style={styles.lbTitle}>🏆 기록</div>
                    {scores.length === 0 ? (
                        <div style={{ color: '#666', fontSize: 13 }}>기록이 없습니다</div>
                    ) : (
                        scores.map((s, i) => (
                            <div key={i} style={styles.lbRow}>
                                <span>{medals[i]} {s.pct >= 0 ? '💰 수익' : '📉 손실'}</span>
                                <span style={{ color: s.pct >= 0 ? '#00e676' : '#ff5252', fontWeight: 'bold' }}>
                                    {formatMoney(s.balance)} ({s.pct >= 0 ? '+' : ''}{s.pct}%)
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Guide Overlay */}
            {showGuide && (
                <div style={styles.overlay}>
                    <div style={styles.resultCard}>
                        <h2 style={{ fontSize: 22, color: '#00d2ff', marginBottom: 16 }}>🎮 게임 방법</h2>
                        <div style={{ textAlign: 'left', fontSize: 13, lineHeight: '1.6', color: '#ccc', marginBottom: 20 }}>
                            1. 실시간으로 변하는 <b>캔들 차트</b>의 패턴을 분석하세요.<br />
                            2. 가격이 오를 것 같을 때 <b>[매수 하기]</b> 버튼을 누릅니다.<br />
                            3. 수익이 났을 때 <b>[매도 하기]</b> 버튼을 눌러 확정하세요.<br />
                            4. 제한 시간 내에 가장 높은 수익금을 달성하면 승리!<br />
                            <br />
                            <br />
                            <small style={{ color: '#888' }}>※ 팁: '매수 신호'가 보일 때를 노려보세요.</small><br />
                            <small style={{ color: '#00d2ff', fontWeight: 'bold' }}>💡 Tip : 직원들과 함께 게임진행 후 기록이 가장 낮은 사람이 커피 쏘기! ☕</small>
                        </div>
                        <button style={styles.resultBtn} onClick={() => setShowGuide(false)}>
                            이해했습니다
                        </button>
                    </div>
                </div>
            )}

            {showResult && (
                <div style={styles.overlay}>
                    <div style={styles.resultCard}>
                        <h2 style={{ fontSize: 24, marginBottom: 12, color: resultData.profit >= 0 ? '#00e676' : '#ff5252' }}>
                            {resultData.profit >= 0 ? '🎉 수익 달성!' : '😢 아쉬운 결과'}
                        </h2>
                        <div style={{ fontSize: 40, fontWeight: 'bold', margin: '10px 0', color: resultData.profit >= 0 ? '#00e676' : '#ff5252' }}>
                            {(resultData.profit >= 0 ? '+' : '') + formatMoney(resultData.profit || 0)}
                        </div>
                        <div style={{ color: '#888', fontSize: 14, margin: '8px 0' }}>
                            수익률: {resultData.pct}% | 등급: {resultData.grade}
                        </div>
                        <button style={styles.resultBtn} onClick={() => setShowResult(false)}>
                            다시 도전
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AITradingBattle;
