import React from 'react';
import aiData from '../data/aiDirectory.json';

const AIDirectory = () => {
    const { categories } = aiData;

    return (
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 bg-white dark:bg-[#111111]">
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-primary">psychology</span>
                    <h2 className="text-2xl font-bold dark:text-white">AI 기술 디렉토리</h2>
                </div>
                <p className="text-toss-gray-600 dark:text-gray-400 text-sm">
                    이 서비스에 적용된 최신 AI 및 프론트엔드 기술 스택입니다.
                </p>
            </div>

            <div className="space-y-4">
                {Object.entries(categories).map(([name, info], idx) => (
                    <div key={idx} className="p-5 rounded-[24px] bg-toss-gray-50 dark:bg-gray-900/50 border border-toss-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-2xl">{info.icon}</span>
                            <h3 className="text-lg font-bold dark:text-white">{name}</h3>
                        </div>
                        <p className="text-sm text-toss-gray-600 dark:text-gray-400 leading-relaxed">
                            {info.description}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-8 p-6 bg-primary/5 dark:bg-primary/10 rounded-[28px] border border-primary/10">
                <h4 className="font-bold text-primary mb-2">AI 에이전트 정보</h4>
                <p className="text-xs text-toss-gray-600 dark:text-gray-400 leading-relaxed">
                    본 서비스는 하이브리드 AI 구조를 사용합니다. 실시간 데이터는 고성능 크롤러가 수집하며,
                    데이터의 맥락 분석과 사용자 피드백은 Gemini 모델이 담당하여 안정성과 지능을 동시에 확보합니다.
                </p>
            </div>
        </div>
    );
};

export default AIDirectory;
