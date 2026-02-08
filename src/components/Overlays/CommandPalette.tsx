/**
 * Omni Input Expanded
 * Expanded omni input overlay for v0.5.
 */

import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { spaceManager } from '../../core/state/SpaceManager';
import { eventBus } from '../../core/events/EventBus';

const OmniInputExpanded = () => {
    const paletteOpen = useAppStore(state => state.paletteOpen);
    const closePalette = useAppStore(state => state.closePalette);
    const viewContext = useAppStore(state => state.viewContext);
    const activeTool = useAppStore(state => state.activeTool);
    const showGrid = useAppStore(state => state.showGrid);
    const showEdges = useAppStore(state => state.showEdges);
    const gridSnapEnabled = useAppStore(state => state.gridSnapEnabled);
    const showStationLabels = useAppStore(state => state.showStationLabels);
    const omniQuery = useAppStore(state => state.omniQuery);
    const setOmniQuery = useAppStore(state => state.setOmniQuery);
    const setTool = useAppStore(state => state.setTool);
    const setShowGrid = useAppStore(state => state.setShowGrid);
    const setShowEdges = useAppStore(state => state.setShowEdges);
    const toggleGridSnap = useAppStore(state => state.toggleGridSnap);
    const setShowStationLabels = useAppStore(state => state.setShowStationLabels);
    const exitNode = useAppStore(state => state.exitNode);
    const toggleSettings = useAppStore(state => state.toggleSettings);
    const isHome = viewContext === 'home';

    const [selectedIndex, setSelectedIndex] = React.useState(0);
    const inputRef = React.useRef<HTMLInputElement | null>(null);

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
                action: () => eventBus.emit('UI_SIGNAL', { type: 'EXIT_TO_STATION', x: 0, y: 0 })
            },
            {
                id: 'exit-node',
                label: 'Exit Node',
                hint: 'Return to space view',
                shortcut: 'Esc',
                keywords: ['node', 'exit'],
                scope: 'field',
                when: () => viewContext === 'node',
                action: () => exitNode()
            },
            {
                id: 'settings',
                label: isHome ? 'Station Settings' : 'Space Settings',
                hint: isHome ? 'Open station preferences' : 'Open space preferences',
                shortcut: 'Ctrl/Cmd + ,',
                keywords: ['settings', isHome ? 'station' : 'space'],
                scope: 'any',
                action: () => {
                    if (isHome) {
                        eventBus.emit('UI_SIGNAL', { type: 'OPEN_ACCOUNT_SETTINGS', x: 0, y: 0 });
                    } else {
                        toggleSettings();
                    }
                }
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
        exitNode,
        gridSnapEnabled,
        setShowEdges,
        setShowGrid,
        setShowStationLabels,
        setTool,
        showEdges,
        showGrid,
        showStationLabels,
        toggleSettings,
        toggleGridSnap,
        viewContext,
        isHome
    ]);

    const visibleCommands = React.useMemo(() => {
        const trimmed = omniQuery.trim().toLowerCase();
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
    }, [commands, isHome, omniQuery]);

    React.useEffect(() => {
        if (!paletteOpen) return;
        setSelectedIndex(0);
    }, [omniQuery, visibleCommands.length, paletteOpen]);

    React.useEffect(() => {
        if (!paletteOpen) return;
        requestAnimationFrame(() => inputRef.current?.focus());
    }, [paletteOpen]);

    const runCommand = (cmd?: Command) => {
        if (!cmd) return;
        cmd.action();
        closePalette();
    };

    React.useEffect(() => {
        if (!paletteOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            closePalette();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [paletteOpen, closePalette]);

    if (!paletteOpen) return null;

    return (
        <div className="absolute inset-0 z-[var(--z-drawer)] bg-[var(--primitive-color-n0-deepest)]/50 backdrop-blur-[2px] flex items-start justify-center pt-[10vh]">
            <div className="glass-panel w-[680px] p-[var(--primitive-space-panel-padding)] flex flex-col gap-[var(--primitive-space-gap-section-min)] rounded-[var(--primitive-radius-panel)] border border-[var(--semantic-color-border-default)]">
                <div className="flex items-center justify-between">
                    <span className="text-[var(--primitive-type-label-size)] uppercase tracking-[0.2em] text-[var(--semantic-color-text-secondary)]">Omni Input — Expanded</span>
                    <button onClick={closePalette} className="text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] px-2">✕</button>
                </div>
                <input
                    autoFocus
                    placeholder="Search or type /command..."
                    value={omniQuery}
                    onChange={(e) => setOmniQuery(e.target.value)}
                    ref={inputRef}
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
                    className="w-full bg-[var(--semantic-color-bg-app)] border border-[var(--semantic-color-border-default)] rounded-[var(--primitive-radius-input)] px-4 py-3 text-base text-[var(--semantic-color-text-primary)] outline-none placeholder:text-[var(--semantic-color-text-muted)] focus:border-[var(--semantic-color-action-primary)] transition-colors"
                />
                <div className="text-[10px] text-[var(--semantic-color-text-muted)] flex items-center justify-between uppercase tracking-wider">
                    <span>Ctrl/Cmd + K — expand Omni Input.</span>
                    <span>↑↓ navigate • Enter run • Esc collapse</span>
                </div>
                <div className="flex flex-col gap-1">
                    {visibleCommands.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-[var(--semantic-color-text-muted)]">No matches.</div>
                    ) : (
                        visibleCommands.map((action, index) => (
                            <button
                                key={action.id}
                                onClick={() => runCommand(action)}
                                className={`flex items-center justify-between rounded-[8px] px-3 py-2 text-sm text-left transition-colors ${index === selectedIndex
                                        ? 'bg-[var(--semantic-color-text-primary)]/10 text-[var(--semantic-color-text-primary)]'
                                        : 'text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] hover:bg-[var(--semantic-color-text-primary)]/5'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={index === selectedIndex ? 'text-[var(--semantic-color-text-primary)]' : 'text-[var(--semantic-color-text-secondary)]'}>{action.label}</span>
                                    {action.hint && <span className="text-[var(--semantic-color-text-muted)] text-xs">{action.hint}</span>}
                                </div>
                                {action.shortcut && <span className="text-[var(--semantic-color-text-muted)] font-mono text-xs opacity-70">{action.shortcut}</span>}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default OmniInputExpanded;
