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

export const NodeBuilder: React.FC<NodeBuilderProps> = ({
    nodeLabel,
    initialSnapshot,
    legacyContent,
    onSnapshotChange,
    onActivity
}) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const engineRef = React.useRef<BlockSuiteEngine | null>(null);
    const initialSnapshotRef = React.useRef(initialSnapshot);
    const legacyContentRef = React.useRef(legacyContent);
    const [canUndo, setCanUndo] = React.useState(false);
    const [canRedo, setCanRedo] = React.useState(false);
    const [activeTemplate, setActiveTemplate] = React.useState<'heading' | 'task' | 'code' | null>(null);

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

    const buttonClass = 'h-8 px-3 rounded-[var(--primitive-radius-pill)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)] text-[11px] uppercase tracking-[0.12em] text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] hover:border-[var(--semantic-color-border-subtle)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

    return (
        <div className="rounded-2xl border border-white/5 bg-black/20 p-2 shadow-inner">
            <div className="mb-2 rounded-xl border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/30 px-3 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--semantic-color-text-muted)]">Node Builder</div>
                    <div className="text-xs text-[var(--semantic-color-text-secondary)] truncate">{nodeLabel || 'Untitled Node'}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" className={buttonClass} onClick={() => engineRef.current?.undo()} disabled={!canUndo} title="Undo">Undo</button>
                    <button type="button" className={buttonClass} onClick={() => engineRef.current?.redo()} disabled={!canRedo} title="Redo">Redo</button>
                    <button type="button" className={buttonClass} onClick={() => { void insertTemplate('heading'); }} disabled={activeTemplate !== null} title="Insert heading">H1</button>
                    <button type="button" className={buttonClass} onClick={() => { void insertTemplate('task'); }} disabled={activeTemplate !== null} title="Insert task">Task</button>
                    <button type="button" className={buttonClass} onClick={() => { void insertTemplate('code'); }} disabled={activeTemplate !== null} title="Insert code block">Code</button>
                    <button type="button" className={buttonClass} onClick={() => engineRef.current?.focus()} title="Focus editor">Focus</button>
                </div>
            </div>
            <div ref={containerRef} className="h-[65vh] overflow-hidden rounded-xl" />
        </div>
    );
};
