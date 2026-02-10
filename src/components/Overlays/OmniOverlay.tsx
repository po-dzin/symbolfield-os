/**
 * OmniOverlay.tsx
 * The global command and search interface.
 * Replaces CommandPalette.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { spaceManager } from '../../core/state/SpaceManager';
import { eventBus } from '../../core/events/EventBus';
import { CapsuleTabs } from '../Common';

type OmniScope = 'station' | 'space' | 'note';

interface OmniCommand {
    id: string;
    label: string;
    hint?: string;
    shortcut?: string;
    keywords?: string[];
    scope?: OmniScope | 'any';
    action: () => void;
}

const OmniOverlay: React.FC = () => {
    // App State
    const paletteOpen = useAppStore(state => state.paletteOpen);
    const closePalette = useAppStore(state => state.closePalette);
    const viewContext = useAppStore(state => state.viewContext);
    const setTool = useAppStore(state => state.setTool);
    const activeTool = useAppStore(state => state.activeTool);
    const toggleSettings = useAppStore(state => state.toggleSettings);
    const omniQuery = useAppStore(state => state.omniQuery);
    const setOmniQuery = useAppStore(state => state.setOmniQuery);

    // Local State
    const [scope, setScope] = useState<OmniScope>(
        viewContext === 'home' ? 'station' : viewContext === 'node' ? 'note' : 'space'
    );
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const cycleScope = (direction: 1 | -1 = 1) => {
        setScope(prev => {
            const ids: OmniScope[] = ['station', 'space', 'note'];
            const index = Math.max(0, ids.indexOf(prev));
            const next = (index + direction + ids.length) % ids.length;
            return ids[next] ?? 'station';
        });
    };

    const scopeItems = useMemo(() => ([
        { id: 'station', label: 'Station' },
        { id: 'space', label: 'Space' },
        { id: 'note', label: 'Node' }
    ]), []);

    // Focus input on open
    useEffect(() => {
        if (paletteOpen) {
            requestAnimationFrame(() => inputRef.current?.focus());
        } else {
            setOmniQuery(''); // Reset on close
        }
    }, [paletteOpen, setOmniQuery]);

    // --- mock commands (migration from CommandPalette) ---
    const commands = useMemo<OmniCommand[]>(() => [
        {
            id: 'new-space',
            label: 'New Space',
            hint: 'Create and enter',
            shortcut: 'N',
            keywords: ['new', 'space', 'create'],
            scope: 'any',
            action: async () => {
                const id = spaceManager.createSpace('New Space');
                await spaceManager.loadSpace(id);
            }
        },
        {
            id: 'go-station',
            label: 'Go to Station',
            hint: 'Return to root',
            shortcut: 'Home',
            keywords: ['station', 'home', 'exit'],
            scope: 'any',
            action: () => eventBus.emit('UI_SIGNAL', { type: 'EXIT_TO_STATION', x: 0, y: 0 })
        },
        {
            id: 'toggle-settings',
            label: viewContext === 'home' ? 'Station Settings' : viewContext === 'node' ? 'Node Settings' : 'Space Settings',
            hint: viewContext === 'home'
                ? 'Open station preferences'
                : viewContext === 'node'
                    ? 'Open node context preferences'
                    : 'Open space preferences',
            shortcut: 'Cmd+,',
            keywords: ['settings', 'config'],
            scope: 'any',
            action: () => toggleSettings()
        },
        {
            id: 'toggle-link-tool',
            label: 'Toggle Link Tool',
            hint: activeTool === 'link' ? 'Turn off' : 'Turn on',
            shortcut: 'L',
            keywords: ['link', 'connect', 'tool'],
            scope: 'space',
            action: () => setTool(activeTool === 'link' ? 'pointer' : 'link')
        }
    ], [activeTool, toggleSettings, setTool, viewContext]);

    // Filter Logic
    const filteredItems = useMemo(() => {
        const query = omniQuery.trim().toLowerCase();
        const isCommandMode = query.startsWith('/');
        const isTagMode = query.startsWith('#');
        const cleanQuery = (isCommandMode || isTagMode) ? query.slice(1).trim() : query;

        // If empty, show recent/suggested based on scope (mock)
        if (!cleanQuery && !isCommandMode && !isTagMode) {
            return commands.filter(c => c.scope === 'any' || c.scope === scope);
        }

        return commands.filter(cmd => {
            // Scope match (loose)
            if (cmd.scope !== 'any' && cmd.scope !== scope) return false;

            // Content match
            const content = `${cmd.label} ${cmd.hint} ${cmd.keywords?.join(' ')}`.toLowerCase();
            return content.includes(cleanQuery);
        });
    }, [omniQuery, commands, scope]);

    // Handlers
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            closePalette();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            cycleScope(e.shiftKey ? -1 : 1);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => (i + 1) % filteredItems.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => (i - 1 + filteredItems.length) % filteredItems.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const item = filteredItems[selectedIndex];
            if (item) {
                item.action();
                closePalette();
            }
        }
    };

    if (!paletteOpen) return null;

    return (
        <div className="fixed inset-0 z-[var(--component-z-omni)] flex items-start justify-center pt-[15vh]">
            <div className="absolute inset-0 bg-black/50" onClick={closePalette} />
            <div className="w-[var(--component-omni-width)] flex flex-col gap-2 animate-scale-in origin-top relative z-10">

                {/* Main Input Box */}
                <div className="glass-panel rounded-[var(--primitive-radius-input)] shadow-2xl overflow-hidden flex flex-col">

                    {/* Header: Scope Switcher + Input */}
                    <div className="flex items-center px-4 py-3 gap-3 border-b border-[var(--semantic-color-border-default)]/50">
                        {/* Scope Chip */}
                        <CapsuleTabs
                            items={scopeItems}
                            activeId={scope}
                            onSelect={(id) => setScope(id as OmniScope)}
                            onCycle={cycleScope}
                            title="Current scope (Tab to switch)"
                        />

                        <input
                            ref={inputRef}
                            className="flex-1 bg-transparent border-none outline-none text-[var(--semantic-color-text-primary)] placeholder-[var(--semantic-color-text-muted)] text-lg"
                            placeholder={scope === 'station' ? "Search Station..." : "Type /cmd or search..."}
                            value={omniQuery}
                            onChange={e => {
                                setOmniQuery(e.target.value);
                                setSelectedIndex(0);
                            }}
                            onKeyDown={handleKeyDown}
                        />

                        <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded border border-[var(--semantic-color-border-default)] text-[10px] text-[var(--semantic-color-text-muted)] font-mono">ESC</span>
                        </div>
                    </div>

                    {/* Results List */}
                    <div className="max-h-[60vh] overflow-y-auto p-2">
                        {filteredItems.length === 0 ? (
                            <div className="p-8 text-center text-[var(--semantic-color-text-muted)] italic">
                                No results found.
                            </div>
                        ) : (
                            filteredItems.map((item, idx) => (
                                <button
                                    key={item.id}
                                    data-state={idx === selectedIndex ? 'active' : 'inactive'}
                                    className="ui-selectable w-full text-left px-4 py-3 rounded-[8px] flex items-center justify-between transition-colors"
                                    onClick={() => {
                                        item.action();
                                        closePalette();
                                    }}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                >
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-medium">{item.label}</span>
                                        {item.hint && <span className="text-xs opacity-70">{item.hint}</span>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {item.keywords && (
                                            <div className="flex gap-1">
                                                {item.keywords.slice(0, 2).map(k => (
                                                    <span key={k} className="text-[10px] opacity-40 px-1 rounded bg-[var(--semantic-color-border-default)]/30">#{k}</span>
                                                ))}
                                            </div>
                                        )}
                                        {item.shortcut && (
                                            <span className="text-xs font-mono opacity-50 border border-[var(--semantic-color-border-default)] px-1.5 rounded">{item.shortcut}</span>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Footer: Hints */}
                    <div className="bg-[var(--semantic-color-bg-app)]/50 px-4 py-2 text-[10px] text-[var(--semantic-color-text-muted)] border-t border-[var(--semantic-color-border-default)] flex items-center gap-4">
                        <span><strong className="text-[var(--semantic-color-text-secondary)]">Tab</strong> to switch scope</span>
                        <span><strong className="text-[var(--semantic-color-text-secondary)]">/</strong> for commands</span>
                        <span><strong className="text-[var(--semantic-color-text-secondary)]">#</strong> for tags</span>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default OmniOverlay;
