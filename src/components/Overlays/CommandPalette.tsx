/**
 * CommandPalette.jsx
 * Minimal command palette overlay for v0.5.
 */

import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { spaceManager } from '../../core/state/SpaceManager';
import { eventBus } from '../../core/events/EventBus';

const CommandPalette = () => {
    const paletteOpen = useAppStore(state => state.paletteOpen);
    const closePalette = useAppStore(state => state.closePalette);
    const viewContext = useAppStore(state => state.viewContext);
    const activeTool = useAppStore(state => state.activeTool);
    const showGrid = useAppStore(state => state.showGrid);
    const showEdges = useAppStore(state => state.showEdges);
    const gridSnapEnabled = useAppStore(state => state.gridSnapEnabled);
    const showStationLabels = useAppStore(state => state.showStationLabels);
    const setViewContext = useAppStore(state => state.setViewContext);
    const toggleSettings = useAppStore(state => state.toggleSettings);
    const setTool = useAppStore(state => state.setTool);
    const setShowGrid = useAppStore(state => state.setShowGrid);
    const setShowEdges = useAppStore(state => state.setShowEdges);
    const toggleGridSnap = useAppStore(state => state.toggleGridSnap);
    const setShowStationLabels = useAppStore(state => state.setShowStationLabels);
    const exitNow = useAppStore(state => state.exitNow);
    const isHome = viewContext === 'home';

    const [query, setQuery] = React.useState('');
    const [selectedIndex, setSelectedIndex] = React.useState(0);

    type Command = {
        id: string;
        label: string;
        hint?: string;
        shortcut?: string;
        keywords?: string[];
        scope?: 'any' | 'home' | 'field';
        when?: () => boolean;
        action: () => void;
    };

    const commands = React.useMemo<Command[]>(() => {
        const list: Command[] = [
            {
                id: 'new-space',
                label: 'New Space',
                hint: 'Create and enter',
                shortcut: 'N',
                keywords: ['space', 'create', 'new'],
                scope: 'any',
                action: async () => {
                    const id = spaceManager.createSpace('New Space');
                    await spaceManager.loadSpace(id);
                }
            },
            {
                id: 'station',
                label: 'Go to Station',
                hint: 'Return to station',
                shortcut: 'Home',
                keywords: ['station', 'home'],
                scope: 'field',
                action: () => setViewContext('home')
            },
            {
                id: 'exit-now',
                label: 'Exit Now',
                hint: 'Return to space view',
                shortcut: 'Esc',
                keywords: ['now', 'exit'],
                scope: 'field',
                when: () => viewContext === 'now',
                action: () => exitNow()
            },
            {
                id: 'settings',
                label: 'Settings',
                hint: 'Toggle settings drawer',
                shortcut: 'Ctrl/Cmd + ,',
                keywords: ['settings', 'prefs'],
                scope: 'field',
                action: () => toggleSettings()
            },
            {
                id: 'account-settings',
                label: 'Account Settings',
                hint: 'Open station account panel',
                keywords: ['account', 'profile', 'settings'],
                scope: 'home',
                action: () => eventBus.emit('UI_SIGNAL', { type: 'OPEN_ACCOUNT_SETTINGS', x: 0, y: 0 })
            },
            {
                id: 'tool-link',
                label: activeTool === 'link' ? 'Link Mode: On' : 'Link Mode: Off',
                hint: 'Toggle link tool',
                shortcut: 'L',
                keywords: ['link', 'tool'],
                scope: 'field',
                action: () => setTool(activeTool === 'link' ? 'pointer' : 'link')
            },
            {
                id: 'grid-visibility',
                label: showGrid ? 'Grid: On' : 'Grid: Off',
                hint: 'Toggle grid',
                keywords: ['grid', 'visibility'],
                scope: 'field',
                action: () => setShowGrid(!showGrid)
            },
            {
                id: 'grid-snap',
                label: gridSnapEnabled ? 'Grid Snap: On' : 'Grid Snap: Off',
                hint: 'Toggle grid snap',
                keywords: ['grid', 'snap'],
                scope: 'field',
                action: () => toggleGridSnap()
            },
            {
                id: 'edges-visibility',
                label: showEdges ? 'Edges: On' : 'Edges: Off',
                hint: 'Toggle edges',
                keywords: ['edges', 'links'],
                scope: 'field',
                action: () => setShowEdges(!showEdges)
            },
            {
                id: 'station-labels',
                label: showStationLabels ? 'Station Labels: On' : 'Station Labels: Off',
                hint: 'Toggle station labels',
                keywords: ['station', 'labels'],
                scope: 'home',
                action: () => setShowStationLabels(!showStationLabels)
            }
        ];
        return list;
    }, [
        activeTool,
        exitNow,
        gridSnapEnabled,
        setShowEdges,
        setShowGrid,
        setShowStationLabels,
        setTool,
        setViewContext,
        showEdges,
        showGrid,
        showStationLabels,
        toggleGridSnap,
        toggleSettings,
        viewContext
    ]);

    const visibleCommands = React.useMemo(() => {
        const trimmed = query.trim().toLowerCase();
        const scope = isHome ? 'home' : 'field';
        const scoped = commands.filter(cmd => {
            const scopeMatch = (cmd.scope ?? 'any') === 'any' || cmd.scope === scope;
            const whenMatch = cmd.when ? cmd.when() : true;
            return scopeMatch && whenMatch;
        });
        if (!trimmed) return scoped;
        return scoped.filter(cmd => {
            const hay = [cmd.label, cmd.hint, ...(cmd.keywords ?? [])].join(' ').toLowerCase();
            return hay.includes(trimmed);
        });
    }, [commands, isHome, query]);

    React.useEffect(() => {
        if (!paletteOpen) return;
        setSelectedIndex(0);
    }, [query, visibleCommands.length, paletteOpen]);

    const runCommand = (cmd?: Command) => {
        if (!cmd) return;
        cmd.action();
        closePalette();
    };

    if (!paletteOpen) return null;

    return (
        <div className="absolute inset-0 z-[var(--z-drawer)] bg-black/25 backdrop-blur-[2px] flex items-start justify-center pt-[10vh]">
            <div className="glass-panel w-[680px] p-5 flex flex-col gap-4 bg-black/55">
                <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-text-secondary">Omni Input</span>
                    <button onClick={closePalette} className="text-text-secondary hover:text-text-primary">✕</button>
                </div>
                <input
                    autoFocus
                    placeholder="Search or type /command..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            closePalette();
                            return;
                        }
                        if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            if (visibleCommands.length === 0) return;
                            setSelectedIndex((prev) => (prev + 1) % visibleCommands.length);
                            return;
                        }
                        if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            if (visibleCommands.length === 0) return;
                            setSelectedIndex((prev) => (prev - 1 + visibleCommands.length) % visibleCommands.length);
                            return;
                        }
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            runCommand(visibleCommands[selectedIndex]);
                        }
                    }}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-base text-text-primary outline-none"
                />
                <div className="text-[11px] text-text-meta flex items-center justify-between">
                    <span>Ctrl/Cmd + K — omni search + commands (v0.5).</span>
                    <span>↑↓ navigate • Enter run • Esc close</span>
                </div>
                <div className="flex flex-col gap-1.5">
                    {visibleCommands.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-text-meta">No matches.</div>
                    ) : (
                        visibleCommands.map((action, index) => (
                            <button
                                key={action.id}
                                onClick={() => runCommand(action)}
                                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm text-left ${
                                    index === selectedIndex
                                        ? 'bg-white/10 text-text-primary'
                                        : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-text-primary">{action.label}</span>
                                    {action.hint && <span className="text-text-meta">{action.hint}</span>}
                                </div>
                                {action.shortcut && <span className="text-text-meta">{action.shortcut}</span>}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
