import React, { useState } from 'react';
import aiToolsData from '../data/aiTools.json';

export default function AIDirectory() {
    const { updatedAt, insight, categories } = aiToolsData;
    const [activeCat, setActiveCat] = useState(categories[0]?.id || '');
    const [searchQuery, setSearchQuery] = useState('');

    const currentCat = categories.find(c => c.id === activeCat);

    // 검색 필터
    const filteredTools = currentCat?.tools.filter(tool => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            tool.name.toLowerCase().includes(q) ||
            tool.desc.toLowerCase().includes(q) ||
            tool.tags.some(t => t.toLowerCase().includes(q))
        );
    }) || [];

    // 업데이트 날짜
    const dateLabel = updatedAt
        ? new Date(updatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
        : '';

    return (
        <div className="flex-1 overflow-y-auto no-scrollbar pb-28">

            {/* ── AI 인사이트 카드 ── */}
            {insight && (
                <div className="mx-5 mt-4 p-4 bg-gradient-to-br from-primary/5 to-blue-50 dark:from-primary/10 dark:to-gray-900 rounded-[20px] border border-primary/10">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">auto_awesome</span>
                        <span className="text-[13px] font-bold text-primary">AI 트렌드 인사이트</span>
                        <span className="text-[11px] text-toss-gray-400 dark:text-gray-500 ml-auto">{dateLabel}</span>
                    </div>
                    <p className="text-[13px] text-toss-gray-700 dark:text-gray-300 leading-relaxed">
                        {insight}
                    </p>
                </div>
            )}

            {/* ── 검색 ── */}
            <div className="px-5 pt-4 pb-2">
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-toss-gray-300 dark:text-gray-600 text-[20px]">search</span>
                    <input
                        type="text"
                        placeholder="AI 도구 검색 (예: 번역, PPT, 코딩)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-toss-gray-50 dark:bg-gray-900 border border-toss-gray-100 dark:border-gray-800 rounded-2xl pl-10 pr-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/30 dark:text-white"
                    />
                </div>
            </div>

            {/* ── 카테고리 탭 ── */}
            <div className="border-b border-toss-gray-100 dark:border-gray-800">
                <div className="flex overflow-x-auto no-scrollbar px-5 gap-1 py-1">
                    {categories.map(cat => {
                        const isActive = activeCat === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => { setActiveCat(cat.id); setSearchQuery(''); }}
                                className={`shrink-0 px-3.5 py-2.5 text-[12px] font-semibold rounded-2xl transition-all ${isActive
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'bg-toss-gray-50 dark:bg-gray-900 text-toss-gray-500 dark:text-gray-500'
                                    }`}
                            >
                                {cat.emoji} {cat.name.replace(/ *&.*/, '')}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── 카테고리 헤더 ── */}
            {currentCat && (
                <div className="px-5 pt-4 pb-2">
                    <h3 className="text-[17px] font-bold text-toss-gray-800 dark:text-white">
                        {currentCat.emoji} {currentCat.name}
                    </h3>
                    <p className="text-[12px] text-toss-gray-500 dark:text-gray-500 mt-0.5">
                        {currentCat.desc} · {filteredTools.length}개 도구
                    </p>
                </div>
            )}

            {/* ── 도구 리스트 ── */}
            <div className="px-5 space-y-3 pb-5">
                {filteredTools.map((tool) => (
                    <a
                        key={tool.name}
                        href={tool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-4 rounded-[20px] bg-white dark:bg-[#1a1a1a] border border-toss-gray-100 dark:border-gray-800 hover:border-primary/30 hover:shadow-md transition-all active:scale-[0.98]"
                    >
                        <div className="flex items-start gap-3">
                            {/* 아이콘 영역 */}
                            <div className="w-11 h-11 rounded-2xl bg-toss-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0 text-lg font-bold">
                                {tool.name.charAt(0)}
                            </div>

                            <div className="flex-1 min-w-0">
                                {/* 이름 + 트렌딩 */}
                                <div className="flex items-center gap-2">
                                    <h4 className="text-[15px] font-bold text-toss-gray-800 dark:text-white truncate">
                                        {tool.name}
                                    </h4>
                                    {tool.trending && (
                                        <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-red-50 dark:bg-red-900/20 text-[10px] font-bold text-red-500">
                                            🔥 HOT
                                        </span>
                                    )}
                                </div>

                                {/* 회사 */}
                                <p className="text-[11px] text-toss-gray-400 dark:text-gray-500 mt-0.5">
                                    {tool.company}
                                </p>

                                {/* 설명 */}
                                <p className="text-[13px] text-toss-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                                    {tool.desc}
                                </p>

                                {/* 하단: 가격 + 태그 */}
                                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${tool.pricing.startsWith('무료')
                                            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                            : 'bg-toss-gray-50 dark:bg-gray-800 text-toss-gray-500 dark:text-gray-400'
                                        }`}>
                                        {tool.pricing}
                                    </span>
                                    {tool.tags.slice(0, 3).map(tag => (
                                        <span key={tag} className="text-[10px] text-toss-gray-400 dark:text-gray-600 bg-toss-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded-md">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <span className="material-symbols-outlined text-[16px] text-toss-gray-200 dark:text-gray-700 shrink-0 mt-1">
                                open_in_new
                            </span>
                        </div>
                    </a>
                ))}

                {filteredTools.length === 0 && (
                    <div className="text-center py-12 text-[14px] text-toss-gray-400 dark:text-gray-500">
                        "{searchQuery}" 검색 결과가 없습니다
                    </div>
                )}
            </div>
        </div>
    );
}