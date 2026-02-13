import React from 'react';
import type { DocSnapshot } from '@blocksuite/store';
import { BlockSuiteEngine, type BlockSuiteEngineOptions } from '../../core/blocksuite/BlockSuiteEngine';

type NodeBuilderProps = {
    nodeLabel?: string;
    initialSnapshot: unknown;
    legacyContent?: string;
    onSnapshotChange: (snapshot: DocSnapshot) => void;
    onActivity?: () => void;
};

export interface NodeBuilderHandle {
    appendMarkdown: (markdown: string) => Promise<void>;
    focus: () => void;
}

export const NodeBuilder = React.forwardRef<NodeBuilderHandle, NodeBuilderProps>(({
    nodeLabel,
    initialSnapshot,
    legacyContent,
    onSnapshotChange,
    onActivity
}, ref) => {
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const engineRef = React.useRef<BlockSuiteEngine | null>(null);
    const initialSnapshotRef = React.useRef(initialSnapshot);
    const legacyContentRef = React.useRef(legacyContent);
    const [canUndo, setCanUndo] = React.useState(false);
    const [canRedo, setCanRedo] = React.useState(false);
    const [activeTemplate, setActiveTemplate] = React.useState<'heading' | 'task' | 'code' | null>(null);
    const [contextMenuOpen, setContextMenuOpen] = React.useState(false);
    const [contextMenuPos, setContextMenuPos] = React.useState({ x: 12, y: 44 });

    // Refs for latest props to avoid re-instantiating engine
    const onSnapshotChangeRef = React.useRef(onSnapshotChange);
    const onActivityRef = React.useRef(onActivity);

    React.useEffect(() => {
        onSnapshotChangeRef.current = onSnapshotChange;
        onActivityRef.current = onActivity;
    }, [onSnapshotChange, onActivity]);

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Instantiate the Engine
        const engineOptions: BlockSuiteEngineOptions = {
            container,
            initialSnapshot: initialSnapshotRef.current,
            onSnapshotChange: (snap) => onSnapshotChangeRef.current(snap),
            onActivity: () => {
                onActivityRef.current?.();
            },
            onHistoryStateChange: (state) => {
                setCanUndo(state.canUndo);
                setCanRedo(state.canRedo);
            }
        };
        if (typeof legacyContentRef.current === 'string') {
            engineOptions.legacyContent = legacyContentRef.current;
        }

        const engine = new BlockSuiteEngine(engineOptions);

        engineRef.current = engine;
        const history = engine.getHistoryState();
        setCanUndo(history.canUndo);
        setCanRedo(history.canRedo);

        return () => {
            engine.dispose();
            engineRef.current = null;
        };
    }, []); // Mount once per node. Parent remounts with key={node.id}.

    const insertTemplate = async (template: 'heading' | 'task' | 'code') => {
        const engine = engineRef.current;
        if (!engine) return;
        setActiveTemplate(template);
        try {
            await engine.insertTemplate(template);
            engine.focus();
        } catch (error) {
            console.warn('Failed to insert BlockSuite template', error);
        } finally {
            setActiveTemplate(null);
        }
    };

    React.useImperativeHandle(ref, () => ({
        appendMarkdown: async (markdown: string) => {
            const engine = engineRef.current;
            if (!engine) return;
            await engine.appendMarkdown(markdown);
            engine.focus();
        },
        focus: () => {
            engineRef.current?.focus();
        }
    }), []);

    const openContextMenuAt = React.useCallback((x: number, y: number) => {
        const root = rootRef.current;
        if (!root) return;
        const width = root.clientWidth;
        const height = root.clientHeight;
        const menuWidth = 220;
        const menuHeight = 292;
        const clampedX = Math.max(10, Math.min(x, Math.max(10, width - menuWidth - 10)));
        const clampedY = Math.max(42, Math.min(y, Math.max(42, height - menuHeight - 10)));
        setContextMenuPos({ x: clampedX, y: clampedY });
        setContextMenuOpen(true);
    }, []);

    const handleContextMenu = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        openContextMenuAt(event.clientX - rect.left, event.clientY - rect.top);
    }, [openContextMenuAt]);

    React.useEffect(() => {
        if (!contextMenuOpen) return;
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (!target) return;
            if (rootRef.current?.contains(target)) return;
            setContextMenuOpen(false);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setContextMenuOpen(false);
            }
        };
        window.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [contextMenuOpen]);

    const runContextAction = React.useCallback(async (action: () => Promise<void> | void) => {
        setContextMenuOpen(false);
        await action();
    }, []);

    const handlePasteText = React.useCallback(async () => {
        if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
            window.alert('Clipboard text is unavailable in this environment.');
            return;
        }
        const text = await navigator.clipboard.readText();
        if (!text.trim()) {
            window.alert('Clipboard text is empty.');
            return;
        }
        await engineRef.current?.appendMarkdown(text);
        engineRef.current?.focus();
    }, []);

    const blobToDataUrl = React.useCallback((blob: Blob): Promise<string> => (
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
            reader.onerror = () => reject(new Error('Unable to read clipboard image'));
            reader.readAsDataURL(blob);
        })
    ), []);

    const handlePasteImage = React.useCallback(async () => {
        if (typeof navigator === 'undefined' || !navigator.clipboard) {
            window.alert('Clipboard image is unavailable in this environment.');
            return;
        }
        const clipboard = navigator.clipboard as Clipboard & { read?: () => Promise<ClipboardItem[]> };
        if (typeof clipboard.read !== 'function') {
            window.alert('Clipboard image paste requires browser clipboard read support.');
            return;
        }
        const items = await clipboard.read();
        for (const item of items) {
            const imageType = item.types.find(type => type.startsWith('image/'));
            if (!imageType) continue;
            const blob = await item.getType(imageType);
            if (blob.size > 2_500_000) {
                window.alert('Clipboard image is too large. Please use Import for larger files.');
                return;
            }
            const dataUrl = await blobToDataUrl(blob);
            if (!dataUrl) continue;
            await engineRef.current?.appendMarkdown(`![Clipboard image](${dataUrl})`);
            engineRef.current?.focus();
            return;
        }
        window.alert('No image found in clipboard.');
    }, [blobToDataUrl]);

    const compactButtonClass = 'ui-selectable h-8 min-w-8 px-2.5 rounded-[var(--primitive-radius-pill)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/70 text-[11px] uppercase tracking-[0.12em] text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed';
    const iconButtonClass = 'ui-selectable h-8 w-8 rounded-full border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/70 text-[13px] text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed';

    return (
        <div
            ref={rootRef}
            className="relative rounded-[var(--component-panel-radius)] border border-[var(--semantic-color-border-default)]/80 bg-[var(--semantic-color-bg-surface)]/62 backdrop-blur-md p-3 shadow-[0_10px_34px_rgba(0,0,0,0.24)]"
            onContextMenu={handleContextMenu}
        >
            <button
                type="button"
                className={`absolute top-5 right-5 z-[2] ${compactButtonClass} px-3`}
                onClick={(event) => {
                    const root = rootRef.current;
                    if (!root) return;
                    const rect = root.getBoundingClientRect();
                    openContextMenuAt(event.clientX - rect.left - 160, event.clientY - rect.top + 8);
                }}
                title="Open context menu"
            >
                •••
            </button>

            <div
                className="h-[66vh] overflow-hidden rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)]/55 bg-[var(--semantic-color-bg-app)]/35"
                onPointerDown={() => engineRef.current?.focus()}
            >
                <div ref={containerRef} className="h-full w-full" />
            </div>

            {contextMenuOpen && (
                <div
                    className="absolute z-[80] min-w-[220px] rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/95 backdrop-blur-lg p-1.5 shadow-2xl"
                    style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
                    onContextMenu={(event) => event.preventDefault()}
                >
                    <button
                        type="button"
                        className={`${iconButtonClass} ${canUndo ? '' : 'opacity-40'} w-full justify-start px-2.5 gap-2 rounded-[var(--primitive-radius-input)]`}
                        disabled={!canUndo}
                        onClick={() => { void runContextAction(() => engineRef.current?.undo()); }}
                    >
                        <span className="w-4 text-center">↶</span>
                        <span className="text-[11px] uppercase tracking-[0.12em]">Undo</span>
                    </button>
                    <button
                        type="button"
                        className={`${iconButtonClass} ${canRedo ? '' : 'opacity-40'} w-full justify-start px-2.5 gap-2 rounded-[var(--primitive-radius-input)]`}
                        disabled={!canRedo}
                        onClick={() => { void runContextAction(() => engineRef.current?.redo()); }}
                    >
                        <span className="w-4 text-center">↷</span>
                        <span className="text-[11px] uppercase tracking-[0.12em]">Redo</span>
                    </button>
                    <div className="my-1 h-px bg-[var(--semantic-color-border-default)]/80" />
                    <button
                        type="button"
                        className={`${iconButtonClass} w-full justify-start px-2.5 gap-2 rounded-[var(--primitive-radius-input)]`}
                        disabled={activeTemplate !== null}
                        onClick={() => { void runContextAction(() => insertTemplate('heading')); }}
                    >
                        <span className="w-4 text-center">H1</span>
                        <span className="text-[11px] uppercase tracking-[0.12em]">Heading</span>
                    </button>
                    <button
                        type="button"
                        className={`${iconButtonClass} w-full justify-start px-2.5 gap-2 rounded-[var(--primitive-radius-input)]`}
                        disabled={activeTemplate !== null}
                        onClick={() => { void runContextAction(() => insertTemplate('task')); }}
                    >
                        <span className="w-4 text-center">☑</span>
                        <span className="text-[11px] uppercase tracking-[0.12em]">Task</span>
                    </button>
                    <button
                        type="button"
                        className={`${iconButtonClass} w-full justify-start px-2.5 gap-2 rounded-[var(--primitive-radius-input)]`}
                        disabled={activeTemplate !== null}
                        onClick={() => { void runContextAction(() => insertTemplate('code')); }}
                    >
                        <span className="w-4 text-center">{'{}'}</span>
                        <span className="text-[11px] uppercase tracking-[0.12em]">Code</span>
                    </button>
                    <div className="my-1 h-px bg-[var(--semantic-color-border-default)]/80" />
                    <button
                        type="button"
                        className={`${iconButtonClass} w-full justify-start px-2.5 gap-2 rounded-[var(--primitive-radius-input)]`}
                        onClick={() => { void runContextAction(handlePasteText); }}
                    >
                        <span className="w-4 text-center">⌘</span>
                        <span className="text-[11px] uppercase tracking-[0.12em]">Paste Text</span>
                    </button>
                    <button
                        type="button"
                        className={`${iconButtonClass} w-full justify-start px-2.5 gap-2 rounded-[var(--primitive-radius-input)]`}
                        onClick={() => { void runContextAction(handlePasteImage); }}
                    >
                        <span className="w-4 text-center">◨</span>
                        <span className="text-[11px] uppercase tracking-[0.12em]">Paste Image</span>
                    </button>
                    <div className="my-1 h-px bg-[var(--semantic-color-border-default)]/80" />
                    <button
                        type="button"
                        className={`${iconButtonClass} w-full justify-start px-2.5 gap-2 rounded-[var(--primitive-radius-input)]`}
                        onClick={() => { void runContextAction(() => engineRef.current?.focus()); }}
                    >
                        <span className="w-4 text-center">⌕</span>
                        <span className="text-[11px] uppercase tracking-[0.12em]">Focus</span>
                    </button>
                </div>
            )}
        </div>
    );
});

NodeBuilder.displayName = 'NodeBuilder';
