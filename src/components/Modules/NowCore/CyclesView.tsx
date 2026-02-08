import React from 'react';

export const CyclesView: React.FC = () => {
    return (
        <div className="flex-1 overflow-auto space-y-8 text-sm no-scrollbar pb-6">
            <div className="glass-panel glass-panel-strong p-6 rounded-[var(--component-panel-radius)] border border-[var(--semantic-color-border-default)]">
                <div className="flex items-center justify-between mb-6">
                    <button className="text-[10px] text-[var(--semantic-color-text-muted)] hover:text-[var(--semantic-color-text-primary)] transition-colors uppercase tracking-[0.2em] font-bold">Feb 2026</button>
                    <div className="flex gap-4">
                        <button className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/10 text-xs">{"<"}</button>
                        <button className="px-2 text-[9px] uppercase tracking-widest font-bold opacity-60 hover:opacity-100 transition-opacity">Today</button>
                        <button className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/10 text-xs">{">"}</button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="text-[9px] uppercase tracking-widest text-[var(--semantic-color-text-muted)] text-center py-2 font-bold">{day}</div>
                    ))}
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => {
                        const isToday = day === 8;
                        const hasActivity = [1, 2, 4, 6, 7].includes(day);
                        return (
                            <button
                                key={day}
                                className={`relative h-10 rounded-lg flex flex-col items-center justify-center text-xs transition-all border ${isToday
                                    ? 'bg-[var(--semantic-color-action-primary)]/20 text-[var(--semantic-color-action-primary)] font-bold border-[var(--semantic-color-action-primary)]/30'
                                    : hasActivity
                                        ? 'border-transparent hover:bg-white/5 text-[var(--semantic-color-text-secondary)]'
                                        : 'border-transparent text-[var(--semantic-color-text-muted)] opacity-40 hover:opacity-100'
                                    }`}
                            >
                                <span>{day}</span>
                                {hasActivity && !isToday && (
                                    <div className="absolute bottom-1.5 flex gap-0.5">
                                        <div className="w-1 h-1 rounded-full bg-[var(--semantic-color-text-primary)]/60" />
                                        {day === 4 && <div className="w-1 h-1 rounded-full bg-[var(--semantic-color-action-primary)]/60" />}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-8 flex justify-between px-2">
                    <div className="text-center">
                        <div className="text-[var(--semantic-color-text-secondary)] text-[10px] uppercase font-bold tracking-widest opacity-60">Created</div>
                        <div className="text-lg font-mono text-[var(--semantic-color-text-primary)]">14</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[var(--semantic-color-text-secondary)] text-[10px] uppercase font-bold tracking-widest opacity-60">Modified</div>
                        <div className="text-lg font-mono text-[var(--semantic-color-status-success)]">32</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[var(--semantic-color-text-secondary)] text-[10px] uppercase font-bold tracking-widest opacity-60">Time</div>
                        <div className="text-lg font-mono text-[var(--semantic-color-text-primary)]">12h</div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--semantic-color-text-secondary)] opacity-60 px-1">Cycle Activity</div>
                <div className="space-y-3">
                    {[
                        { name: 'Core Architecture', time: '14:20', type: 'Node' },
                        { name: 'Style Manifest', time: '11:05', type: 'File' },
                        { name: 'Entity_v05', time: 'Yesterday', type: 'Cluster' }
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-4 group cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-lg transition-all">
                            <div className="w-8 h-8 rounded-lg bg-[var(--semantic-color-text-primary)]/5 flex items-center justify-center text-[var(--semantic-color-text-muted)] group-hover:text-[var(--semantic-color-text-primary)]">
                                {item.type === 'Node' ? '☉' : item.type === 'File' ? '📄' : '⬡'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[13px] text-[var(--semantic-color-text-primary)] font-medium truncate">{item.name}</div>
                                <div className="text-[10px] text-[var(--semantic-color-text-muted)] uppercase tracking-wider">{item.type}</div>
                            </div>
                            <div className="text-[10px] font-mono text-[var(--semantic-color-text-muted)]">{item.time}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
