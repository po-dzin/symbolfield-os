import React, { useEffect, useState } from 'react';
import { eventBus, EVENTS } from '../../core/events/EventBus';
import { spaceManager, type SpaceMeta } from '../../core/state/SpaceManager';
import { useAppStore } from '../../store/useAppStore';

const RecentsRail = () => {
    // Local state for spaces list
    const [spaces, setSpaces] = useState<SpaceMeta[]>([]);
    const showPlaygroundOnStation = useAppStore(state => state.showPlaygroundOnStation);

    useEffect(() => {
        const refresh = () => {
            if (showPlaygroundOnStation) {
                spaceManager.ensureOnboardingSpaces();
            }
            setSpaces(spaceManager.getSpacesWithOptions({ includePlayground: showPlaygroundOnStation }));
        };
        refresh();
        const unsub = [
            eventBus.on(EVENTS.SPACE_CREATED, refresh),
            eventBus.on(EVENTS.SPACE_RENAMED, refresh),
            eventBus.on(EVENTS.SPACE_DELETED, refresh)
        ];
        return () => unsub.forEach(fn => fn());
    }, [showPlaygroundOnStation]);

    const handleClick = (id: string) => {
        spaceManager.loadSpace(id);
    };

    if (spaces.length === 0) return null;

    const playground = spaceManager.getPlaygroundSpace();
    const recents = spaces.filter(space => space.id !== playground?.id);

    return (
        <div>
            <h2 className="text-[var(--semantic-color-text-muted)] text-[9px] font-medium uppercase tracking-[0.35em] mb-4">Recent</h2>
            <div className="space-y-3">
                {showPlaygroundOnStation && playground && (
                    <SpaceRow
                        key={playground.id}
                        item={playground}
                        onOpen={handleClick}
                        isPlayground
                    />
                )}
                {recents.map(item => (
                    <SpaceRow
                        key={item.id}
                        item={item}
                        onOpen={handleClick}
                    />
                ))}
            </div>
        </div>
    );
};

const SpaceRow = ({
    item,
    onOpen,
    isPlayground = false
}: {
    item: SpaceMeta;
    onOpen: (id: string) => void;
    isPlayground?: boolean;
}) => {
    const [menuOpen, setMenuOpen] = useState(false);

    const handleRename = () => {
        const next = window.prompt('Rename space', item.name);
        if (!next) return;
        spaceManager.renameSpace(item.id, next);
        setMenuOpen(false);
    };

    const handleDelete = () => {
        const confirmed = window.confirm('Move this space to trash? It will be kept for 30 days.');
        if (!confirmed) return;
        spaceManager.softDeleteSpace(item.id);
        setMenuOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => onOpen(item.id)}
                onMouseEnter={() => eventBus.emit(EVENTS.PORTAL_HOVERED, { spaceId: item.id })}
                onMouseLeave={() => eventBus.emit(EVENTS.PORTAL_HOVERED, {})}
                className="group flex items-center gap-3 w-full text-left focus-visible:outline-none hover:bg-[var(--semantic-color-text-primary)]/5 rounded-[var(--primitive-radius-card)] p-2 transition-all"
            >
                {/* Space Icon */}
                <div className="
                            w-8 h-8 rounded-[var(--primitive-radius-pill)] flex items-center justify-center flex-shrink-0
                            border transition-all duration-300
                            bg-[var(--semantic-color-text-primary)]/5 border-[var(--semantic-color-border-default)]
                            group-hover:bg-[var(--semantic-color-text-primary)]/10 group-hover:border-[var(--semantic-color-text-secondary)] group-hover:scale-110
                            group-focus-visible:ring-1 group-focus-visible:ring-[var(--semantic-color-text-primary)]/50
                        ">
                    <span className="text-[var(--semantic-color-text-primary)] group-hover:text-[var(--semantic-color-text-primary)] transition-colors text-xs font-mono opacity-80 group-hover:opacity-100">
                        ◇
                    </span>
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-[var(--semantic-color-text-secondary)] text-xs truncate group-hover:text-[var(--semantic-color-text-primary)] transition-colors">
                        {item.name}
                    </h3>
                    <p className="text-[var(--semantic-color-text-muted)] text-[8px] uppercase tracking-wider">
                        {isPlayground ? 'Playground' : new Date(item.lastAccessedAt).toLocaleDateString()}
                    </p>
                </div>
            </button>

            <button
                onClick={() => setMenuOpen(prev => !prev)}
                className="absolute right-0 top-1/2 -translate-y-1/2 px-2 text-[var(--semantic-color-text-muted)] hover:text-[var(--semantic-color-text-secondary)] text-xs transition-colors"
                aria-label="Space actions"
            >
                ⋯
            </button>

            {menuOpen && (
                <div className="absolute right-0 top-full mt-2 z-20 min-w-[140px] rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)] backdrop-blur p-1 text-xs shadow-lg">
                    <button
                        onClick={handleRename}
                        className="w-full text-left px-3 py-2 rounded-[8px] hover:bg-[var(--semantic-color-text-primary)]/10 text-[var(--semantic-color-text-secondary)]"
                    >
                        Rename
                    </button>
                    {!isPlayground && (
                        <button
                            onClick={handleDelete}
                            className="w-full text-left px-3 py-2 rounded-[8px] hover:bg-[var(--semantic-color-status-error)]/10 hover:text-[var(--semantic-color-status-error)] text-[var(--semantic-color-text-secondary)]"
                        >
                            Delete
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default RecentsRail;
