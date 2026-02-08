import React, { useState } from 'react';
import data from '../data/aiDirectory.json';

function fmt(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
}

export default function AIDirectory() {
    const { updatedAt, insight, daily, directory } = data;
    const [activeTab, setActiveTab] = useState('daily');  // 'daily' | 카테고리id
    const [searchQuery, setSearchQuery] = useState('');

    const dateLabel = updatedAt
        ? new Date(updatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
        : '';

    const activeCat = directory.find(c => c.id === activeTab);

    // 검색 필터
    const filteredTools = activeCat?.tools.filter(t => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.tags?.some(tag => tag.toLowerCase().includes(q));
    }) || [];

    return (
        <div className="flex-1 overflow-y-auto no-scrollbar pb-28">

            {/* ── 인사이트 ── */}
            {insight && (
                <div className="mx-5 mt-4 p-4 bg-gradient-to-br from-primary/5 to-blue-50 dark:from-primary/10 dark:to-gray-900 rounded-[20px] border border-primary/10">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">auto_awesome</span>
                        <span className="text-[13px] font-bold text-primary">오늘의 AI 트렌드</span>
                        <span className="text-[11px] text-toss-gray-400 ml-auto">{dateLabel}</span>
                    </div>
                    <p className="text-[13px] text-toss-gray-700 dark:text-gray-300 leading-relaxed">{insight}</p>
                </div>
            )}

            {/* ── 검색 ── */}
            <div className="px-5 pt-4 pb-2">
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-toss-gray-300 text-[20px]">search</span>
                    <input
                        type="text"
                        placeholder="AI 도구 검색 (예: 번역, PPT, 코딩)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-toss-gray-50 dark:bg-gray-900 border border-toss-gray-100 dark:border-gray-800 rounded-2xl pl-10 pr-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/30 dark:text-white"
                    />
                </div>
            </div>

            {/* ── 탭: 오늘의 발견 + 카테고리들 ── */}
            <div className="border-b border-toss-gray-100 dark:border-gray-800">
                <div className="flex overflow-x-auto no-scrollbar px-5 gap-1 py-1">
                    {/* 오늘의 발견 탭 */}
                    <button
                        onClick={() => { setActiveTab('daily'); setSearchQuery(''); }}
                        className={`shrink-0 px-3.5 py-2.5 text-[12px] font-semibold rounded-2xl transition-all ${activeTab === 'daily'
                                ? 'bg-primary text-white shadow-sm'
                                : 'bg-toss-gray-50 dark:bg-gray-900 text-toss-gray-500'
                            }`}
                    >
                        🆕 오늘의 발견
                    </button>
                    {/* 카테고리 탭 */}
                    {directory.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => { setActiveTab(cat.id); setSearchQuery(''); }}
                            className={`shrink-0 px-3.5 py-2.5 text-[12px] font-semibold rounded-2xl transition-all ${activeTab === cat.id
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'bg-toss-gray-50 dark:bg-gray-900 text-toss-gray-500'
                                }`}
                        >
                            {cat.emoji} {cat.name.replace(/ *&.*/, '').replace(/ *\(.*/, '')}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 오늘의 발견 콘텐츠 ── */}
            {activeTab === 'daily' && (
                <div className="px-5 pt-4 space-y-6 pb-5">

                    {/* 신규 AI 제품 */}
                    <section>
                        <h3 className="text-[16px] font-bold text-toss-gray-800 dark:text-white mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[20px]">rocket_launch</span>
                            오늘의 신규 AI 제품
                        </h3>
                        {daily?.newProducts?.length > 0 ? (
                            <div className="space-y-2.5">
                                {daily.newProducts.map((p, i) => (
                                    <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3.5 rounded-[18px] bg-white dark:bg-[#1a1a1a] border border-toss-gray-100 dark:border-gray-800 hover:border-primary/30 transition-all active:scale-[0.98]">
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-100 dark:from-primary/20 dark:to-gray-800 flex items-center justify-center text-[14px] font-black text-primary shrink-0">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[14px] font-bold text-toss-gray-800 dark:text-white truncate">{p.name}</p>
                                                <span className="shrink-0 text-[11px] text-orange-500 font-bold">▲ {p.votesCount}</span>
                                            </div>
                                            <p className="text-[12px] text-toss-gray-500 dark:text-gray-400 truncate mt-0.5">{p.tagline}</p>
                                            {p.category && (
                                                <span className="inline-block mt-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-medium">
                                                    {p.category}
                                                </span>
                                            )}
                                        </div>
                                        <span className="material-symbols-outlined text-[16px] text-toss-gray-200 shrink-0">open_in_new</span>
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[13px] text-toss-gray-400 text-center py-6">오늘 수집된 신규 제품이 없습니다</p>
                        )}
                    </section>

                    {/* 트렌딩 논문 */}
                    <section>
                        <h3 className="text-[16px] font-bold text-toss-gray-800 dark:text-white mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[20px]">science</span>
                            AI 트렌딩 논문
                        </h3>
                        {daily?.trendingPapers?.length > 0 ? (
                            <div className="space-y-2.5">
                                {daily.trendingPapers.map((p, i) => (
                                    <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                                        className="block p-3.5 rounded-[18px] bg-white dark:bg-[#1a1a1a] border border-toss-gray-100 dark:border-gray-800 hover:border-primary/30 transition-all active:scale-[0.98]">
                                        <div className="flex items-start gap-2">
                                            <span className="text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md shrink-0 mt-0.5">
                                                ❤️ {p.upvotes}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-bold text-toss-gray-800 dark:text-white leading-snug">{p.title}</p>
                                                <p className="text-[11px] text-toss-gray-400 dark:text-gray-500 mt-1 line-clamp-2">{p.summary}</p>
                                                {p.authors?.length > 0 && (
                                                    <p className="text-[10px] text-toss-gray-300 mt-1">{p.authors.join(', ')}</p>
                                                )}
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[13px] text-toss-gray-400 text-center py-6">오늘 수집된 논문이 없습니다</p>
                        )}
                    </section>
                </div>
            )}

            {/* ── 카테고리별 도구 리스트 (기존 큐레이션) ── */}
            {activeCat && (
                <div className="px-5 pt-4 pb-5">
                    <h3 className="text-[17px] font-bold text-toss-gray-800 dark:text-white mb-1">
                        {activeCat.emoji} {activeCat.name}
                    </h3>
                    <p className="text-[12px] text-toss-gray-500 mb-4">{activeCat.desc} · {filteredTools.length}개</p>

                    <div className="space-y-3">
                        {filteredTools.map(tool => (
                            <a key={tool.name} href={tool.url} target="_blank" rel="noopener noreferrer"
                                className="block p-4 rounded-[20px] bg-white dark:bg-[#1a1a1a] border border-toss-gray-100 dark:border-gray-800 hover:border-primary/30 hover:shadow-md transition-all active:scale-[0.98]">
                                <div className="flex items-start gap-3">
                                    <div className="w-11 h-11 rounded-2xl bg-toss-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0 text-lg font-bold text-toss-gray-600 dark:text-gray-300">
                                        {tool.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[15px] font-bold text-toss-gray-800 dark:text-white">{tool.name}</p>
                                        <p className="text-[11px] text-toss-gray-400 mt-0.5">{tool.company}</p>
                                        <p className="text-[13px] text-toss-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">{tool.desc}</p>
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${tool.pricing?.startsWith('무료')
                                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600'
                                                    : 'bg-toss-gray-50 dark:bg-gray-800 text-toss-gray-500'
                                                }`}>{tool.pricing}</span>
                                            {tool.tags?.slice(0, 3).map(tag => (
                                                <span key={tag} className="text-[10px] text-toss-gray-400 bg-toss-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded-md">#{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-[16px] text-toss-gray-200 shrink-0 mt-1">open_in_new</span>
                                </div>
                            </a>
                        ))}
                        {filteredTools.length === 0 && (
                            <p className="text-center py-10 text-[13px] text-toss-gray-400">"{searchQuery}" 검색 결과가 없습니다</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
