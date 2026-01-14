import React from 'react';
import { useWindowStore } from '../../store/windowStore';

const CoreWidget = () => {
    const { isCoreMinimized, toggleCoreMinimize, coreMode } = useWindowStore();

    if (!isCoreMinimized) return null;

    const isPrism = coreMode === 'PRISM';

    return (
        <div className="absolute bottom-6 right-6 z-50">
            <button
                onClick={toggleCoreMinimize}
                className={`
                    w-16 h-16 rounded-full flex items-center justify-center
                    border border-os-glass-border backdrop-blur-md shadow-lg
                    transition-all duration-300 hover:scale-110
                    ${isPrism ? 'bg-white/10' : 'bg-black/80'}
                `}
            >
                <span className={`text-2xl ${isPrism ? 'animate-spin' : 'animate-pulse'}`}>
                    {isPrism ? '🌈' : '🕳'}
                </span>

                {/* Status Dot */}
                <div className="absolute top-0 right-0 w-3 h-3 rounded-full bg-os-green border-2 border-os-dark" />
            </button>

            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] tracking-widest text-os-text-meta uppercase whitespace-nowrap">
                CORE // MIN
            </div>
        </div>
    );
};

export default CoreWidget;
