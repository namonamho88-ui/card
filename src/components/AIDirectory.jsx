import React, { useState, useMemo } from 'react';
import aiDirectoryRaw from '../data/aiDirectory.json';

// ──────────────────────────────────────────
// 숫자 포맷
// ──────────────────────────────────────────
function fmt(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return '오늘';
    if (days < 7) return `${days}일 전`;
    if (days < 30) return `${Math.floor(days / 7)}주 전`;
    return `${Math.floor(days / 30)}개월 전`;
}

// ──────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────
export default function AIDirectory() {
    const { updatedAt, categories } = aiDirectoryRaw;
    const categoryNames = Object.keys(categories);

    const [activeCat, setActiveCat] = useState(categoryNames[0]);
    const [expandedTask, setExpandedTask] = useState(null);
    const [viewMode, setViewMode] = useState('trending'); // trending | popular

    const currentCat = categories[activeCat];

    // 업데이트 날짜 포맷
    const updatedLabel = useMemo(() => {
        if (!updatedAt) return '';
        const d = new Date(updatedAt);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} 업데이트`;
    }, [updatedAt]);

    return (
        <div className="flex-1 overflow-y-auto no-scrollbar pb-28">
            {/* ── 상단 설명 ── */}
            <div className="px-5 pt-5 pb-3">
                <p className="text-[13px] text-toss-gray-500 dark:text-gray-400 mb-1">
                    HuggingFace 기반 · {updatedLabel}
                </p>
                <p className="text-[14px] text-toss-gray-600 dark:text-gray-400 leading-relaxed">
                    AI 기술을 카테고리별로 탐색하고, 각 분야에서 지금 가장 주목받는 모델을 확인하세요.
                </p>
            </div>

            {/* ── 카테고리 탭 ── */}
            <div className="border-b border-toss-gray-100 dark:border-gray-800">
                <div className="flex overflow-x-auto no-scrollbar px-5 gap-1">
                    {categoryNames.map(name => {
                        const cat = categories[name];
                        const isActive = activeCat === name;
                        return (
                            <button
                                key={name}
                                onClick={() => { setActiveCat(name); setExpandedTask(null); }}
                                className={`shrink-0 px-4 py-3 text-[13px] font-semibold rounded-t-xl transition-all border-b-2 ${isActive
                                        ? 'border-primary text-primary bg-primary/5 dark:bg-primary/10'
                                        : 'border-transparent text-toss-gray-500 dark:text-gray-500'
                                    }`}
                            >
                                {cat.icon} {name.replace(/ *\(.*\)/, '')}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── 카테고리 헤더 ── */}
            <div className="px-5 pt-5 pb-3">
                <h3 className="text-[18px] font-bold text-toss-gray-800 dark:text-white flex items-center gap-2">
                    <span className="text-2xl">{currentCat.icon}</span>
                    {activeCat}
                </h3>
                <p className="text-[13px] text-toss-gray-500 dark:text-gray-400 mt-1">
                    {currentCat.description}
                </p>
            </div>

            {/* ── 태스크 카드 목록 ── */}
            <div className="px-5 space-y-3 pb-5">
                {currentCat.tasks.map((task) => {
                    const isExpanded = expandedTask === task.tag;
                    const models = task[viewMode] || [];

                    return (
                        <div
                            key={task.tag}
                            className={`rounded-[20px] border transition-all duration-300 ${isExpanded
                                    ? 'border-primary/30 bg-white dark:bg-[#1a1a1a] shadow-lg shadow-primary/5'
                                    : 'border-toss-gray-100 dark:border-gray-800 bg-toss-gray-50 dark:bg-[#1a1a1a]'
                                }`}
                        >
                            {/* 태스크 헤더 (클릭 가능) */}
                            <button
                                onClick={() => setExpandedTask(isExpanded ? null : task.tag)}
                                className="w-full flex items-center gap-3 p-4 text-left"
                            >
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isExpanded ? 'bg-primary/10' : 'bg-toss-gray-100 dark:bg-gray-800'
                                    }`}>
                                    <span className={`material-symbols-outlined text-[20px] ${isExpanded ? 'text-primary' : 'text-toss-gray-500 dark:text-gray-400'
                                        }`}>{task.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[15px] font-bold ${isExpanded ? 'text-primary' : 'text-toss-gray-800 dark:text-white'
                                        }`}>
                                        {task.label}
                                    </p>
                                    <p className="text-[12px] text-toss-gray-500 dark:text-gray-500 truncate">
                                        {task.desc}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {task.totalModels && (
                                        <span className="text-[11px] text-toss-gray-400 dark:text-gray-500 bg-toss-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                            {task.totalModels}
                                        </span>
                                    )}
                                    <span className={`material-symbols-outlined text-[18px] text-toss-gray-300 dark:text-gray-600 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''
                                        }`}>expand_more</span>
                                </div>
                            </button>

                            {/* 확장 영역: 모델 리스트 */}
                            {isExpanded && (
                                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                                    {/* 정렬 토글 */}
                                    <div className="flex gap-2 mb-3">
                                        <button
                                            onClick={() => setViewMode('trending')}
                                            className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all ${viewMode === 'trending'
                                                    ? 'bg-primary text-white'
                                                    : 'bg-toss-gray-100 dark:bg-gray-800 text-toss-gray-600 dark:text-gray-400'
                                                }`}
                                        >
                                            🔥 트렌딩
                                        </button>
                                        <button
                                            onClick={() => setViewMode('popular')}
                                            className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all ${viewMode === 'popular'
                                                    ? 'bg-primary text-white'
                                                    : 'bg-toss-gray-100 dark:bg-gray-800 text-toss-gray-600 dark:text-gray-400'
                                                }`}
                                        >
                                            ⬇️ 다운로드순
                                        </button>
                                    </div>

                                    {/* 모델 리스트 */}
                                    {models.length > 0 ? (
                                        <div className="space-y-2">
                                            {models.map((model, idx) => (
                                                <a
                                                    key={model.id}
                                                    href={model.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-gray-900/50 border border-toss-gray-100 dark:border-gray-800 hover:border-primary/30 transition-all active:scale-[0.98]"
                                                >
                                                    {/* 순위 */}
                                                    <span className={`text-[14px] font-black w-5 text-center ${idx === 0 ? 'text-yellow-500' :
                                                            idx === 1 ? 'text-gray-400' :
                                                                idx === 2 ? 'text-amber-600' :
                                                                    'text-toss-gray-300 dark:text-gray-600'
                                                        }`}>
                                                        {idx + 1}
                                                    </span>

                                                    {/* 모델 정보 */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[13px] font-bold text-toss-gray-800 dark:text-white truncate">
                                                            {model.id}
                                                        </p>
                                                        <div className="flex items-center gap-3 mt-0.5">
                                                            <span className="text-[11px] text-toss-gray-400 dark:text-gray-500">
                                                                ⬇️ {fmt(model.downloads)}
                                                            </span>
                                                            <span className="text-[11px] text-toss-gray-400 dark:text-gray-500">
                                                                ❤️ {fmt(model.likes)}
                                                            </span>
                                                            {model.library && (
                                                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-medium">
                                                                    {model.library}
                                                                </span>
                                                            )}
                                                            {model.lastModified && (
                                                                <span className="text-[10px] text-toss-gray-300 dark:text-gray-600">
                                                                    {timeAgo(model.lastModified)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <span className="material-symbols-outlined text-[16px] text-toss-gray-200 dark:text-gray-700 shrink-0">
                                                        open_in_new
                                                    </span>
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-[13px] text-toss-gray-400 dark:text-gray-500">
                                            데이터를 불러오지 못했습니다
                                        </div>
                                    )}

                                    {/* HuggingFace 링크 */}
                                    <a
                                        href={`https://huggingface.co/models?pipeline_tag=${task.tag}&sort=trending`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-1 mt-3 py-2.5 rounded-xl bg-toss-gray-50 dark:bg-gray-800 text-[12px] font-semibold text-toss-gray-500 dark:text-gray-400 hover:text-primary transition-colors"
                                    >
                                        HuggingFace에서 더 보기
                                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                    </a>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
