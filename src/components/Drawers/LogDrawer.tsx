/**
 * LogDrawer.jsx
 * Timeline / Event Log Drawer (Bottom).
 * Toggle via TimeChip or Dock.
 */

import React from 'react';
// import { useAppStore } from '../../store/useAppStore'; 

interface LogDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

const LogDrawer = ({ isOpen, onClose }: LogDrawerProps) => {
    if (!isOpen) return null;

    return (
        <div className="absolute bottom-0 left-0 right-0 h-[30vh] z-[var(--z-drawer)] animate-slide-up">
            <div className="glass-panel w-full h-full rounded-b-none border-b-0 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-2 border-b border-white/10 bg-black/20">
                    <span className="text-xs uppercase tracking-widest text-text-secondary">Temporal Log</span>
                    <button onClick={onClose} className="hover:text-white">✕</button>
                </div>

                {/* Content Placeholder */}
                <div className="flex-1 p-4 overflow-auto">
                    <div className="text-sm text-text-meta font-mono">
                        {/* Mock Timeline */}
                        <div className="mb-2 opacity-50">Today</div>
                        <div className="pl-2 border-l border-white/10 flex flex-col gap-2">
                            <div>10:42 <span className="text-white">Node Created</span></div>
                            <div>09:15 <span className="text-emerald-400">Ritual Complete</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogDrawer;
