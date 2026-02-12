import React from 'react';
import type { DocSnapshot } from '@blocksuite/store';
import { useAppStore } from '../../store/useAppStore';
import { useGraphStore } from '../../store/useGraphStore';
import { NodeBuilder } from './NodeBuilder';

const serializeSnapshot = (snapshot: unknown): string => {
    try {
        return JSON.stringify(snapshot ?? null);
    } catch {
        return '';
    }
};

const formatTimestamp = (value: unknown): string => {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || 'Unknown';
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'Unknown';
    return new Date(value).toLocaleString();
};

const normalizeTags = (raw: unknown): string => {
    if (Array.isArray(raw)) {
        return raw
            .map(entry => (typeof entry === 'string' ? entry.trim() : ''))
            .filter(Boolean)
            .join(', ');
    }
    if (typeof raw === 'string') return raw;
    return '';
};

const firstNonEmptyString = (...values: unknown[]): string => {
    for (const value of values) {
        if (typeof value !== 'string') continue;
        const trimmed = value.trim();
        if (trimmed) return trimmed;
    }
    return '';
};

const NodeView = () => {
    const viewContext = useAppStore(state => state.viewContext);
    const activeScope = useAppStore(state => state.activeScope);
    const exitNode = useAppStore(state => state.exitNode);
    const nodes = useGraphStore(state => state.nodes);
    const updateNode = useGraphStore(state => state.updateNode);

    const isNodeView = viewContext === 'node';
    const node = React.useMemo(() => {
        if (!isNodeView || !activeScope) return null;
        return nodes.find(n => n.id === activeScope) ?? null;
    }, [isNodeView, activeScope, nodes]);

    const initialSnapshot = React.useMemo(() => {
        if (!node) return null;
        const candidate = node.data?.docSnapshot;
        return candidate ?? null;
    }, [node]);

    const legacyContent = React.useMemo(() => {
        if (!node) return '';
        return typeof node.data?.content === 'string' ? node.data.content : '';
    }, [node]);

    const nodeLabel = React.useMemo(() => {
        if (!node) return 'Untitled Node';
        return typeof node.data?.label === 'string' ? node.data.label : 'Untitled Node';
    }, [node]);

    const nodeIcon = React.useMemo(() => {
        if (!node) return '';
        return typeof node.data?.icon_value === 'string' ? node.data.icon_value : '';
    }, [node]);

    const createdAt = React.useMemo(
        () => formatTimestamp(node?.created_at ?? node?.data?.created),
        [node?.created_at, node?.data?.created]
    );
    const updatedAt = React.useMemo(
        () => formatTimestamp(node?.updated_at ?? node?.data?.updated),
        [node?.updated_at, node?.data?.updated]
    );
    const ownerName = React.useMemo(() => {
        if (!node) return 'Owner';
        return firstNonEmptyString(
            node.data?.owner,
            node.data?.createdBy,
            node.meta?.owner,
            node.meta?.createdBy
        ) || 'Owner';
    }, [node]);
    const storedTags = React.useMemo(() => normalizeTags(node?.data?.tags), [node?.data?.tags]);

    const [titleDraft, setTitleDraft] = React.useState('Untitled Node');
    const [tagsDraft, setTagsDraft] = React.useState('');

    const lastSavedSnapshotRef = React.useRef('');

    React.useEffect(() => {
        lastSavedSnapshotRef.current = serializeSnapshot(initialSnapshot);
    }, [node?.id, initialSnapshot]);

    React.useEffect(() => {
        setTitleDraft(nodeLabel);
    }, [node?.id, nodeLabel]);

    React.useEffect(() => {
        setTagsDraft(storedTags);
    }, [node?.id, storedTags]);

    const handleSnapshotChange = React.useCallback((snapshot: DocSnapshot) => {
        if (!isNodeView || !node) return;

        const serialized = serializeSnapshot(snapshot);
        if (serialized === lastSavedSnapshotRef.current) return;

        updateNode(node.id, {
            data: {
                docSnapshot: snapshot,
                contentFormat: 'blocksuite.page.v1'
            }
        });

        lastSavedSnapshotRef.current = serialized;
    }, [isNodeView, node, updateNode]);

    const commitTitle = React.useCallback(() => {
        if (!node) return;
        const nextTitle = titleDraft.trim() || 'Untitled Node';
        if (nextTitle === nodeLabel) {
            if (nextTitle !== titleDraft) setTitleDraft(nextTitle);
            return;
        }
        updateNode(node.id, {
            data: {
                label: nextTitle
            }
        });
        setTitleDraft(nextTitle);
    }, [node, nodeLabel, titleDraft, updateNode]);

    const commitTags = React.useCallback(() => {
        if (!node) return;
        const normalized = tagsDraft
            .split(',')
            .map(part => part.trim())
            .filter(Boolean);

        updateNode(node.id, {
            data: {
                tags: normalized
            }
        });
        setTagsDraft(normalized.join(', '));
    }, [node, tagsDraft, updateNode]);

    const handleIconToggle = React.useCallback(() => {
        if (!node) return;
        const nextIcon = nodeIcon.trim() ? '' : '◉';
        updateNode(node.id, {
            data: {
                icon_value: nextIcon
            }
        });
    }, [node, nodeIcon, updateNode]);

    if (!isNodeView || !activeScope || !node) return null;

    return (
        <div className="relative w-full h-full flex flex-col bg-[var(--semantic-color-bg-canvas)]" data-view="node">
            <div className="flex-1 overflow-auto p-[var(--primitive-space-panel-padding)] pt-[var(--component-topbar-height)] max-w-5xl mx-auto w-full mt-12">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="text-sm text-[var(--semantic-color-text-muted)]">
                        Node dimension: isolated editor state with BlockSuite tools. Changes save automatically.
                    </div>
                    <button
                        type="button"
                        onClick={exitNode}
                        className="h-8 px-3 rounded-[var(--primitive-radius-pill)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)] text-[11px] uppercase tracking-[0.14em] text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] transition-colors shrink-0"
                    >
                        Space
                    </button>
                </div>
                <div className="mb-4 rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/45 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 text-sm text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] transition-colors"
                            onClick={handleIconToggle}
                        >
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-app)]/60 text-xs">
                                {nodeIcon.trim() || '◌'}
                            </span>
                            <span>{nodeIcon.trim() ? 'Remove icon' : 'Add icon'}</span>
                        </button>
                        <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--semantic-color-text-muted)]">
                            Node Properties
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="text-[10px] uppercase tracking-[0.16em] text-[var(--semantic-color-text-muted)]" htmlFor="node-title-input">
                            Title
                        </label>
                        <input
                            id="node-title-input"
                            value={titleDraft}
                            onChange={(event) => setTitleDraft(event.target.value)}
                            onBlur={commitTitle}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    (event.currentTarget as HTMLInputElement).blur();
                                }
                            }}
                            className="mt-1 w-full rounded-[var(--primitive-radius-input)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-app)]/55 px-3 py-2 text-sm text-[var(--semantic-color-text-primary)] outline-none focus:border-[var(--semantic-color-border-subtle)]"
                            placeholder="Untitled Node"
                            aria-label="Node title"
                        />
                    </div>

                    <div className="mb-3">
                        <label className="text-[10px] uppercase tracking-[0.16em] text-[var(--semantic-color-text-muted)]" htmlFor="node-tags-input">
                            Tags
                        </label>
                        <input
                            id="node-tags-input"
                            value={tagsDraft}
                            onChange={(event) => setTagsDraft(event.target.value)}
                            onBlur={commitTags}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    (event.currentTarget as HTMLInputElement).blur();
                                }
                            }}
                            className="mt-1 w-full rounded-[var(--primitive-radius-input)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-app)]/55 px-3 py-2 text-sm text-[var(--semantic-color-text-primary)] outline-none focus:border-[var(--semantic-color-border-subtle)]"
                            placeholder="alpha, beta"
                            aria-label="Node tags"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-xs text-[var(--semantic-color-text-secondary)] sm:grid-cols-3">
                        <div className="rounded-[var(--primitive-radius-input)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-app)]/55 px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--semantic-color-text-muted)]">Created</div>
                            <div className="mt-1">{createdAt}</div>
                        </div>
                        <div className="rounded-[var(--primitive-radius-input)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-app)]/55 px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--semantic-color-text-muted)]">Updated</div>
                            <div className="mt-1">{updatedAt}</div>
                        </div>
                        <div className="rounded-[var(--primitive-radius-input)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-app)]/55 px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--semantic-color-text-muted)]">Owner</div>
                            <div className="mt-1">{ownerName}</div>
                        </div>
                    </div>
                </div>
                <NodeBuilder
                    key={node.id}
                    nodeLabel={nodeLabel}
                    initialSnapshot={initialSnapshot}
                    legacyContent={legacyContent}
                    onSnapshotChange={handleSnapshotChange}
                    onActivity={() => {
                        // "Live" signal - eventually dispatch to NowCore
                        // console.log('Activity detected in node:', node.id);
                    }}
                />
            </div>

        </div>
    );
};

export default NodeView;
