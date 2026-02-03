import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { spaceManager } from '../../core/state/SpaceManager';
import { graphEngine } from '../../core/graph/GraphEngine';

const SpaceHeader = () => {
    const setViewContext = useAppStore(state => state.setViewContext);
    const viewContext = useAppStore(state => state.viewContext);
    const currentSpaceId = useAppStore(state => state.currentSpaceId);
    const openSettings = useAppStore(state => state.openSettings);
    const fieldScopeId = useAppStore(state => state.fieldScopeId);

    // Let's rely on spaceManager for metadata
    const [name, setName] = useState('New Space');
    const [spaceName, setSpaceName] = useState('New Space');
    const [isEditingName, setIsEditingName] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);
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
        };
        window.addEventListener('mousedown', handleClick);
        return () => window.removeEventListener('mousedown', handleClick);
    }, [menuOpen]);

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

    return (
        <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
            {/* Logo / Home Button */}
            <button
                onClick={() => setViewContext('home')}
                className="w-8 h-8 rounded-full bg-sf-zinc-900 border border-white/5 flex items-center justify-center text-sf-zinc-400 hover:text-white hover:border-white/20 transition-all shadow-sm group"
                title="Return to Station"
            >
                <span className="text-[10px] font-bold opacity-50 group-hover:opacity-100 transition-opacity">SF</span>
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
                    onClick={() => setMenuOpen(prev => !prev)}
                    className="w-8 h-8 rounded-full bg-sf-zinc-900/70 border border-white/5 flex items-center justify-center text-white/70 hover:text-white hover:border-white/20 transition-all"
                    title="Space menu"
                >
                    ⋯
                </button>
                {menuOpen && (
                    <div className="absolute left-0 top-full mt-2 min-w-[220px] glass-panel p-2 flex flex-col gap-1 z-[var(--z-ui)]">
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
                            onClick={() => {
                                setMenuOpen(false);
                                openSettings();
                            }}
                            className="w-full text-left px-2 py-1 rounded-lg text-sm text-white/70 hover:bg-white/5"
                        >
                            Settings…
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
    );
};

export default SpaceHeader;
