import React from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { useGraphStore } from '../../../store/useGraphStore';

const NodeProperties = () => {
    const activeScope = useAppStore(state => state.activeScope);
    const nodes = useGraphStore(state => state.nodes);

    // Find the active node
    const node = nodes.find(n => n.id === activeScope);

    if (!node) {
        return (
            <div className="p-4 text-[var(--semantic-color-text-muted)] text-sm">
                No node selected.
            </div>
        );
    }

    const { label, type } = node.data || {};

    return (
        <div className="flex flex-col gap-6">
            {/* Header / Identity */}
            <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wider text-[var(--semantic-color-text-muted)] font-mono">
                    Node Label
                </label>
                <input
                    type="text"
                    defaultValue={typeof label === 'string' ? label : ''}
                    className="w-full bg-transparent border-b border-[var(--semantic-color-border-default)] text-[var(--semantic-color-text-primary)] font-medium text-lg focus:outline-none focus:border-[var(--semantic-color-action-primary)] transition-colors py-1"
                />
            </div>

            {/* Type & Tags */}
            <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wider text-[var(--semantic-color-text-muted)] font-mono">
                    Type
                </label>
                <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-[var(--semantic-color-bg-surface-hover)] rounded text-xs font-mono text-[var(--semantic-color-text-secondary)] border border-[var(--semantic-color-border-default)]">
                        {typeof type === 'string' ? type : 'generic'}
                    </span>
                </div>
            </div>

            {/* Position */}
            <div className="p-4 rounded-[var(--primitive-radius-md)] bg-[var(--semantic-color-bg-surface-hover)] flex flex-col gap-3">
                <div className="flex justify-between text-xs">
                    <span className="text-[var(--semantic-color-text-muted)]">ID</span>
                    <span className="font-mono text-[var(--semantic-color-text-secondary)] opacity-70 truncate max-w-[120px]" title={node.id}>
                        {node.id}
                    </span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-[var(--semantic-color-text-muted)]">Position X</span>
                    <span className="font-mono text-[var(--semantic-color-text-secondary)]">
                        {Math.round(node.position.x)}
                    </span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-[var(--semantic-color-text-muted)]">Position Y</span>
                    <span className="font-mono text-[var(--semantic-color-text-secondary)]">
                        {Math.round(node.position.y)}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-4 border-t border-[var(--semantic-color-border-default)]">
                <button className="w-full py-2 px-4 rounded-[var(--primitive-radius-sm)] text-sm font-medium text-[var(--semantic-color-text-secondary)] hover:bg-[var(--semantic-color-bg-surface-hover)] hover:text-[var(--semantic-color-text-primary)] transition-colors flex items-center justify-center gap-2">
                    <span>Convert Type...</span>
                </button>
                <button className="w-full py-2 px-4 rounded-[var(--primitive-radius-sm)] text-sm font-medium text-[var(--semantic-color-status-error)] hover:bg-[var(--semantic-color-status-error)]/10 transition-colors flex items-center justify-center gap-2">
                    <span>Delete Node</span>
                </button>
            </div>
        </div>
    );
};

export default NodeProperties;
