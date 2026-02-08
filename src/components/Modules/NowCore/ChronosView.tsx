import React from 'react';

export const ChronosView: React.FC = () => {
    return (
        <div className="flex-1 overflow-auto space-y-6 text-sm no-scrollbar pb-6">
            <div className="flex items-center justify-between px-1">
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--semantic-color-text-secondary)] opacity-60">Temporal Log</div>
                <div className="text-[10px] text-[var(--semantic-color-text-muted)] italic">Live Updating...</div>
            </div>

            <div className="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-[var(--semantic-color-border-default)]/30">
                {[
                    {
                        date: 'Today', events: [
                            { t: '13:51', desc: 'HUD Refinement applied', cat: 'UI' },
                            { t: '13:48', desc: 'NowCore Structural Sync', cat: 'SYSTEM' },
                            { t: '11:20', desc: 'Entity "Core" created in playground', cat: 'DOMAIN' },
                            { t: '10:04', desc: 'Focus Ritual: Morning Sync complete', cat: 'RITUAL' }
                        ]
                    },
                    {
                        date: 'Yesterday', events: [
                            { t: '18:30', desc: 'Workspace optimization performed', cat: 'MAINTENANCE' },
                            { t: '14:15', desc: 'Deep Field Expansion: Wave 2', cat: 'DOMAIN' }
                        ]
                    }
                ].map((group, i) => (
                    <div key={i} className="space-y-4">
                        <div className="text-[10px] uppercase tracking-widest font-bold text-[var(--semantic-color-text-muted)] bg-[var(--primitive-color-n0-deepest)] w-fit px-2 ml-1 relative z-10">
                            {group.date}
                        </div>
                        <div className="space-y-6">
                            {group.events.map((ev, j) => (
                                <div key={j} className="relative pl-8 group">
                                    <div className="absolute left-2 top-1.5 w-2 h-2 rounded-full border border-[var(--semantic-color-border-default)] bg-black z-10 group-hover:bg-[var(--semantic-color-text-primary)] transition-colors" />
                                    <div className="flex items-start gap-3">
                                        <span className="text-[11px] font-mono text-[var(--semantic-color-text-muted)] opacity-60 mt-0.5">{ev.t}</span>
                                        <div className="flex-1">
                                            <div className="text-[13px] text-[var(--semantic-color-text-primary)] leading-snug group-hover:translate-x-1 transition-transform">{ev.desc}</div>
                                            <div className="text-[9px] uppercase tracking-[0.15em] font-bold text-[var(--semantic-color-text-muted)] opacity-40 mt-1">{ev.cat}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
