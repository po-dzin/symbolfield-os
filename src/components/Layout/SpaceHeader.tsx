import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import OmniInputCollapsed from '../Omni/OmniInputCollapsed';
import { spaceManager } from '../../core/state/SpaceManager';
import { graphEngine } from '../../core/graph/GraphEngine';
import { eventBus } from '../../core/events/EventBus';
import coreGlyph from '../../assets/core-glyph.svg';

const SpaceHeader = () => {
    const setViewContext = useAppStore(state => state.setViewContext);
    const viewContext = useAppStore(state => state.viewContext);
    const currentSpaceId = useAppStore(state => state.currentSpaceId);
    const fieldScopeId = useAppStore(state => state.fieldScopeId);
    const contextMenuMode = useAppStore(state => state.contextMenuMode);
    const setContextMenuMode = useAppStore(state => state.setContextMenuMode);
    const showGrid = useAppStore(state => state.showGrid);
    const setShowGrid = useAppStore(state => state.setShowGrid);
    const gridSnapEnabled = useAppStore(state => state.gridSnapEnabled);
    const setGridSnapEnabled = useAppStore(state => state.setGridSnapEnabled);
    const showEdges = useAppStore(state => state.showEdges);
    const setShowEdges = useAppStore(state => state.setShowEdges);
    const showHud = useAppStore(state => state.showHud);
    const setShowHud = useAppStore(state => state.setShowHud);
    const showCounters = useAppStore(state => state.showCounters);
    const setShowCounters = useAppStore(state => state.setShowCounters);
    const settingsOpen = useAppStore(state => state.settingsOpen);
    const closeSettings = useAppStore(state => state.closeSettings);

    // Let's rely on spaceManager for metadata
    const [name, setName] = useState('New Space');
    const [spaceName, setSpaceName] = useState('New Space');
    const [isEditingName, setIsEditingName] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);
    const [viewSettingsOpen, setViewSettingsOpen] = useState(false);
    const [isHoveringTitle, setIsHoveringTitle] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const nameInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        // Sync name on mount or ID change
        if (!currentSpaceId) return;
        const meta = spaceManager.getSpaceMeta(currentSpaceId);
        const nextSpaceName = meta?.name ?? 'New Space';
        setSpaceName(nextSpaceName);
        if (fieldScopeId) {
            const node = graphEngine.getNode(fieldScopeId);
            const label = typeof (node?.data as any)?.label === 'string' ? (node?.data as any).label : '';
            setName(label.trim() || 'Cluster');
        } else {
            setName(nextSpaceName);
        }
    }, [currentSpaceId, fieldScopeId]);

    useEffect(() => {
        if (!menuOpen) return;
        const handleClick = (e: MouseEvent) => {
            const target = e.target as Node | null;
            if (!menuRef.current || !target) return;
            if (menuRef.current.contains(target)) return;
            setMenuOpen(false);
            setInfoOpen(false);
            setViewSettingsOpen(false);
            closeSettings();
        };
        window.addEventListener('mousedown', handleClick);
        return () => window.removeEventListener('mousedown', handleClick);
    }, [menuOpen, closeSettings]);

    useEffect(() => {
        if (!settingsOpen) return;
        setMenuOpen(true);
        setViewSettingsOpen(true);
    }, [settingsOpen]);

    useEffect(() => {
        if (menuOpen) return;
        if (settingsOpen) closeSettings();
    }, [menuOpen, settingsOpen, closeSettings]);

    // Handle Rename
    const handleRename = (newValue: string) => {
        let target = newValue.trim();
        if (!target) target = 'New Space';

        if (fieldScopeId) {
            const node = graphEngine.getNode(fieldScopeId);
            if (node) {
                graphEngine.updateNode(fieldScopeId, { data: { ...(node.data as any), label: target } });
                setName(target);
            }
            return;
        }
        if (currentSpaceId) {
            const finalName = spaceManager.renameSpace(currentSpaceId, target);
            setName(finalName);
            setSpaceName(finalName);
        }
    };

    const handleExport = () => {
        if (!currentSpaceId) return;
        const meta = spaceManager.getSpaceMeta(currentSpaceId);
        const data = graphEngine.exportData();
        const payload = {
            spaceId: currentSpaceId,
            meta,
            nodes: data.nodes,
            edges: data.edges
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const safeName = (meta?.name ?? 'space').replace(/[^a-z0-9-_]+/gi, '_');
        link.download = `symbolfield-${safeName}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const raw = String(reader.result ?? '');
                const parsed = JSON.parse(raw) as { nodes?: any[]; edges?: any[] };
                if (!parsed.nodes || !parsed.edges) return;
                graphEngine.importData({ nodes: parsed.nodes as any, edges: parsed.edges as any });
                spaceManager.saveCurrentSpace();
            } catch {
                // ignore
            }
        };
        reader.readAsText(file);
    };

    if (viewContext === 'home') return null;

    const TogglePill = ({ checked, onToggle, labelOn = 'ON', labelOff = 'OFF' }: { checked: boolean; onToggle: () => void; labelOn?: string; labelOff?: string }) => (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onToggle}
            className={`relative w-16 h-7 rounded-full border transition-colors ${checked ? 'bg-white/20 border-white/30' : 'bg-white/10 border-white/20'}`}
        >
            <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold transition-all ${checked ? 'text-white/80' : 'opacity-0'} z-10`}>
                {labelOn}
            </span>
            <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold transition-all ${checked ? 'opacity-0' : 'text-white/80'} z-10`}>
                {labelOff}
            </span>
            <span className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-sm transition-all ${checked ? 'right-0.5 bg-white' : 'left-0.5 bg-white'}`} />
        </button>
    );

    return (
        <div className="absolute top-4 left-4 right-4 z-50 flex items-center gap-3">
            <div className="flex items-center gap-3">
                {/* Logo / Home Button */}
                <button
                    onClick={() => eventBus.emit('UI_SIGNAL', { type: 'EXIT_TO_STATION', x: 0, y: 0 })}
                    className="w-8 h-8 rounded-full bg-sf-zinc-900 border border-white/5 flex items-center justify-center hover:border-white/20 transition-all shadow-sm group"
                    title="Return to Station"
                >
                    <img src={coreGlyph} alt="Core" className="w-8 h-8 opacity-70" />
                </button>

            {/* Space Name Input */}
            <div
                className="flex items-center gap-2 bg-sf-zinc-900/80 backdrop-blur border border-white/5 rounded-2xl px-4 py-2 shadow-sm hover:border-white/10 transition-colors"
                onMouseEnter={() => setIsHoveringTitle(true)}
                onMouseLeave={() => setIsHoveringTitle(false)}
            >
                {fieldScopeId && isHoveringTitle && !isEditingName && (
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                        {spaceName} /
                    </span>
                )}
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={(e) => {
                        setIsEditingName(false);
                        handleRename(e.target.value);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.currentTarget.blur();
                        }
                    }}
                    onFocus={() => setIsEditingName(true)}
                    ref={nameInputRef}
                    className={`bg-transparent text-sm text-white/90 font-medium ${isEditingName ? 'w-40' : 'w-32'} transition-[width] duration-200 ease-out focus:outline-none placeholder-white/20 text-center`}
                    placeholder="Untitled"
                />
            </div>

            {/* Cloud Status (Mock) */}
            <div className="w-2 h-2 rounded-full bg-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.3)]" title="Saved locally" />

            {/* Space Menu */}
            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setMenuOpen(prev => {
                        const next = !prev;
                        if (!next) {
                            setInfoOpen(false);
                            setViewSettingsOpen(false);
                            closeSettings();
                        }
                        return next;
                    })}
                    className="w-8 h-8 rounded-full bg-sf-zinc-900/70 border border-white/5 flex items-center justify-center text-white/70 hover:text-white hover:border-white/20 transition-all"
                    title="Space menu"
                >
                    ⋯
                </button>
                {menuOpen && (
                    <div
                        className="absolute left-0 top-full mt-2 min-w-[220px] glass-panel glass-panel-strong p-2 flex flex-col gap-1 z-[var(--z-drawer)]"
                        style={{ overflow: 'visible' }}
                    >
                        <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 px-2 pt-1">
                            Space
                        </div>
                        <button
                            onClick={() => {
                                nameInputRef.current?.focus();
                                nameInputRef.current?.select();
                                setMenuOpen(false);
                            }}
                            className="w-full text-left px-2 py-1 rounded-lg text-sm text-white/70 hover:bg-white/5"
                        >
                            Rename
                        </button>
                        <button
                            onClick={() => setInfoOpen(prev => !prev)}
                            className="w-full text-left px-2 py-1 rounded-lg text-sm text-white/70 hover:bg-white/5"
                        >
                            Info
                        </button>
                        <button
                            onClick={handleExport}
                            className="w-full text-left px-2 py-1 rounded-lg text-sm text-white/70 hover:bg-white/5"
                        >
                            Export
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full text-left px-2 py-1 rounded-lg text-sm text-white/70 hover:bg-white/5"
                        >
                            Import
                        </button>
                        <button
                            onClick={() => {
                                if (!currentSpaceId) return;
                                spaceManager.toggleFavorite(currentSpaceId);
                                setMenuOpen(false);
                            }}
                            className="w-full text-left px-2 py-1 rounded-lg text-sm text-white/70 hover:bg-white/5"
                        >
                            {currentSpaceId && spaceManager.getSpaceMeta(currentSpaceId)?.favorite ? 'Unfavorite' : 'Favorite'}
                        </button>
                        <button
                            onClick={() => {
                                setMenuOpen(false);
                                setInfoOpen(false);
                            }}
                            className="w-full text-left px-2 py-1 rounded-lg text-sm text-white/40 cursor-not-allowed"
                            title="History coming soon"
                        >
                            History
                        </button>
                        <button
                            onClick={() => setViewSettingsOpen(prev => !prev)}
                            className="w-full text-left px-2 py-1 rounded-lg text-sm text-white/70 hover:bg-white/5 flex items-center justify-between"
                        >
                            <span>View settings</span>
                            <span className="text-white/40">›</span>
                        </button>
                        <div className="h-px bg-white/10 my-1" />
                        <button
                            onClick={() => {
                                if (!currentSpaceId) return;
                                if (confirm('Move space to trash?')) {
                                    spaceManager.softDeleteSpace(currentSpaceId);
                                }
                            }}
                            className="w-full text-left px-2 py-1 rounded-lg text-sm text-red-300 hover:bg-red-500/15"
                        >
                            Move to trash
                        </button>

                        {infoOpen && currentSpaceId && (
                            <div className="mt-2 px-2 py-2 rounded-lg bg-black/40 border border-white/10 text-[11px] text-white/60 space-y-1">
                                {(() => {
                                    const meta = spaceManager.getSpaceMeta(currentSpaceId);
                                    const nodes = graphEngine.getNodes().length;
                                    const edges = graphEngine.getEdges().length;
                                    return (
                                        <>
                                            <div>id: {currentSpaceId}</div>
                                            <div>created: {meta ? new Date(meta.createdAt).toLocaleDateString() : '—'}</div>
                                            <div>updated: {meta ? new Date(meta.updatedAt).toLocaleDateString() : '—'}</div>
                                            <div>nodes: {nodes} • edges: {edges}</div>
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                        {viewSettingsOpen && (
                            <div className="absolute left-full top-0 ml-3 min-w-[240px] glass-panel glass-panel-strong p-2 flex flex-col gap-2 z-[var(--z-drawer)]">
                                <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 px-2 pt-1">
                                    View settings
                                </div>
                                <div className="flex items-center justify-between text-sm text-white/70 px-2 py-1">
                                    <span>Context menu mode</span>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={contextMenuMode === 'radial'}
                                        onClick={() => setContextMenuMode(contextMenuMode === 'bar' ? 'radial' : 'bar')}
                                        className={`relative w-16 h-7 rounded-full border transition-colors ${contextMenuMode === 'radial' ? 'bg-white/20 border-white/30' : 'bg-white/10 border-white/20'}`}
                                        title={contextMenuMode === 'radial' ? 'Radial' : 'Bar'}
                                    >
                                        <span
                                            className={`absolute left-2 top-1/2 -translate-y-1/2 text-[11px] transition-all ${contextMenuMode === 'bar' ? 'text-white' : 'text-white/40'}`}
                                        >
                                            —
                                        </span>
                                        <span
                                            className={`absolute right-2 top-1/2 -translate-y-1/2 transition-all ${contextMenuMode === 'radial' ? 'text-white' : 'text-white/40'}`}
                                        >
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="block">
                                                <path
                                                    d="M4 13.5A8 8 0 0 1 12 6a8 8 0 0 1 8 7.5"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                        </span>
                                        <span
                                            className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-sm transition-all ${contextMenuMode === 'radial' ? 'right-0.5 bg-white' : 'left-0.5 bg-white'}`}
                                        >
                                            <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-semibold ${contextMenuMode === 'radial' ? 'text-black/80' : 'text-black/70'}`}>
                                                {contextMenuMode === 'radial' ? (
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="block">
                                                        <path
                                                            d="M5 13A7 7 0 0 1 12 6a7 7 0 0 1 7 7"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                        />
                                                    </svg>
                                                ) : (
                                                    '—'
                                                )}
                                            </span>
                                        </span>
                                    </button>
                                </div>
                                <div className="flex items-center justify-between text-sm text-white/70 px-2 py-1">
                                    <span>Show grid</span>
                                    <TogglePill checked={showGrid} onToggle={() => setShowGrid(!showGrid)} />
                                </div>
                                <div className="flex items-center justify-between text-sm text-white/70 px-2 py-1">
                                    <span>Grid snap</span>
                                    <TogglePill checked={gridSnapEnabled} onToggle={() => setGridSnapEnabled(!gridSnapEnabled)} />
                                </div>
                                <div className="flex items-center justify-between text-sm text-white/70 px-2 py-1">
                                    <span>Show edges</span>
                                    <TogglePill checked={showEdges} onToggle={() => setShowEdges(!showEdges)} />
                                </div>
                                <div className="flex items-center justify-between text-sm text-white/70 px-2 py-1">
                                    <span>HUD chips</span>
                                    <TogglePill checked={showHud} onToggle={() => setShowHud(!showHud)} />
                                </div>
                                <div className="flex items-center justify-between text-sm text-white/70 px-2 py-1">
                                    <span>HUD counters</span>
                                    <TogglePill checked={showCounters} onToggle={() => setShowCounters(!showCounters)} />
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        handleImport(file);
                        e.currentTarget.value = '';
                        setMenuOpen(false);
                    }}
                />
            </div>
            </div>

            <div className="flex-1 flex justify-center">
                <OmniInputCollapsed
                    className="w-full max-w-md"
                    inputClassName="block w-full px-4 py-2 bg-sf-zinc-900/70 border border-white/10 rounded-full text-white/90 placeholder-white/40 focus:outline-none focus:bg-sf-zinc-900/90 focus:border-white/30 transition-all text-sm"
                />
            </div>
        </div>
    );
};

export default SpaceHeader;
