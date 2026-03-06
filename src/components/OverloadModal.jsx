import React from 'react';

/**
 * ⚠️ Google AI 서버 과부하 전용 안내창 (Modal)
 */
export default function OverloadModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-[#1c1c1e] w-[calc(100%-40px)] max-w-[340px] rounded-[28px] p-8 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col items-center text-center"
                onClick={e => e.stopPropagation()}
            >
                <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-amber-500 text-[32px] animate-pulse">
                        warning
                    </span>
                </div>

                <h3 className="text-[19px] font-bold text-toss-gray-900 dark:text-white mb-2">
                    서버 과부하 안내
                </h3>

                <p className="text-[14px] text-toss-gray-600 dark:text-gray-400 leading-relaxed mb-8">
                    현재 Google AI 서버가 일시적인 과부하 상태입니다.<br />
                    서비스 이용이 잠시 중단되었으니,<br />
                    <span className="font-semibold text-primary">잠시 후 다시 시도</span>해 주세요.
                </p>

                <button
                    onClick={onClose}
                    className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98]"
                >
                    확인
                </button>
            </div>
        </div>
    );
}
