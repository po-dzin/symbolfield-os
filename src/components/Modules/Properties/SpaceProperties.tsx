import React, { useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { spaceManager } from '../../../core/state/SpaceManager';

const SpaceProperties = () => {
    const currentSpaceId = useAppStore(state => state.currentSpaceId);

    // Get space metadata
    const meta = spaceManager.getSpaceMeta(currentSpaceId);

    const [name, setName] = useState(meta?.name || '');
    const [description, setDescription] = useState(meta?.description || '');

    // Handle updates (mock for now, or direct to spaceManager if method exists)
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setName(e.target.value);
        // TODO: debounce save to spaceManager
    };

    if (!meta) {
        return (
            <div className="p-4 text-[var(--semantic-color-text-muted)] text-sm">
                No space selected.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header / Identity */}
            <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wider text-[var(--semantic-color-text-muted)] font-mono">
                    Space Name
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={handleNameChange}
                    className="w-full bg-transparent border-b border-[var(--semantic-color-border-default)] text-[var(--semantic-color-text-primary)] font-medium text-lg focus:outline-none focus:border-[var(--semantic-color-action-primary)] transition-colors py-1"
                />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wider text-[var(--semantic-color-text-muted)] font-mono">
                    Description
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full bg-[var(--semantic-color-bg-surface-hover)] rounded-[var(--primitive-radius-sm)] border border-transparent focus:border-[var(--semantic-color-action-primary)] p-3 text-sm text-[var(--semantic-color-text-secondary)] resize-none focus:outline-none transition-all"
                    placeholder="Add a description..."
                />
            </div>

            {/* Stats / Metadata */}
            <div className="p-4 rounded-[var(--primitive-radius-md)] bg-[var(--semantic-color-bg-surface-hover)] flex flex-col gap-3">
                <div className="flex justify-between text-xs">
                    <span className="text-[var(--semantic-color-text-muted)]">ID</span>
                    <span className="font-mono text-[var(--semantic-color-text-secondary)] opacity-70 truncate max-w-[120px]" title={currentSpaceId}>
                        {currentSpaceId}
                    </span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-[var(--semantic-color-text-muted)]">Created</span>
                    <span className="text-[var(--semantic-color-text-secondary)]">
                        {new Date().toLocaleDateString()} {/* Mock */}
                    </span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-[var(--semantic-color-text-muted)]">Nodes</span>
                    <span className="text-[var(--semantic-color-text-secondary)]">
                        {/* Mock count or fetch from graph */}
                        24
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-4 border-t border-[var(--semantic-color-border-default)]">
                <button className="w-full py-2 px-4 rounded-[var(--primitive-radius-sm)] text-sm font-medium text-[var(--semantic-color-text-secondary)] hover:bg-[var(--semantic-color-bg-surface-hover)] hover:text-[var(--semantic-color-text-primary)] transition-colors flex items-center justify-center gap-2">
                    <span>Export Space</span>
                </button>
                <button className="w-full py-2 px-4 rounded-[var(--primitive-radius-sm)] text-sm font-medium text-[var(--semantic-color-status-error)] hover:bg-[var(--semantic-color-status-error)]/10 transition-colors flex items-center justify-center gap-2">
                    <span>Archive Space</span>
                </button>
            </div>
        </div>
    );
};

export default SpaceProperties;
