import React, { useEffect, useState } from 'react';
import { eventBus, EVENTS } from '../../core/events/EventBus';
import { spaceManager, type SpaceMeta } from '../../core/state/SpaceManager';
import { useAppStore } from '../../store/useAppStore';

const INITIAL_RECENTS_TIMESTAMP = Date.now();

const RecentsRail = ({ selectedSpaceId }: { selectedSpaceId?: string | null }) => {
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
    const SevenDays = 7 * 24 * 60 * 60 * 1000;
    const now = INITIAL_RECENTS_TIMESTAMP;

    const recents = spaces
        .filter(space => space.id !== playground?.id)
        .filter(space => (now - (space.lastAccessedAt || 0)) < SevenDays)
        .sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0));

    return (
        <div className="space-y-1">
            {showPlaygroundOnStation && playground && (
                <SpaceRow
                    key={playground.id}
                    item={playground}
                    onOpen={handleClick}
                    isSelected={selectedSpaceId === playground.id}
                    isPlayground
                />
            )}
            {recents.map(item => (
                <SpaceRow
                    key={item.id}
                    item={item}
                    onOpen={handleClick}
                    isSelected={selectedSpaceId === item.id}
                />
            ))}
            {recents.length === 0 && !showPlaygroundOnStation && (
                <div className="text-[var(--semantic-color-text-muted)] text-[10px] italic py-2">No recent spaces</div>
            )}
        </div>
    );
};

const SpaceRow = ({
    item,
    onOpen,
    isSelected = false,
    isPlayground = false
}: {
    item: SpaceMeta;
    onOpen: (id: string) => void;
    isSelected?: boolean;
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
        <div className="relative group/row">
            <button
                onClick={() => onOpen(item.id)}
                onMouseEnter={() => eventBus.emit(EVENTS.PORTAL_HOVERED, { spaceId: item.id })}
                onMouseLeave={() => eventBus.emit(EVENTS.PORTAL_HOVERED, {})}
                data-state={isSelected ? 'active' : 'inactive'}
                className="ui-drawer-row group flex items-center gap-3 w-full text-left focus-visible:outline-none px-2 py-1.5"
            >
                {/* Space Icon (Empty Placeholder Circle) */}
                <div className={`
                            w-5 h-5 rounded-full flex-shrink-0
                            border-[1.5px] transition-all duration-300
                            ${isSelected ? 'border-[var(--semantic-color-text-primary)] opacity-100' : 'border-[var(--semantic-color-text-muted)] opacity-40 group-hover:opacity-100 group-hover:border-[var(--semantic-color-text-secondary)]'}
                        `} />

                {/* Label */}
                <div className="flex-1 min-w-0">
                    <h3 className={`text-[13px] truncate transition-colors font-medium ${isSelected ? 'text-[var(--semantic-color-text-primary)]' : ''}`}>
                        {item.name}
                    </h3>
                </div>
            </button>

            <button
                onClick={() => setMenuOpen(prev => !prev)}
                className="absolute right-1 top-1/2 -translate-y-1/2 px-2 text-[var(--semantic-color-text-muted)] hover:text-[var(--semantic-color-text-secondary)] text-xs transition-colors"
                aria-label="Space actions"
            >
                ⋯
            </button>

            {menuOpen && (
                <div className="absolute right-0 top-full mt-2 z-20 min-w-[140px] rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)] backdrop-blur p-1 text-xs shadow-lg">
                    <button
                        onClick={handleRename}
                        className="ui-selectable ui-shape-soft w-full text-left px-3 py-2 text-[var(--semantic-color-text-secondary)]"
                    >
                        Rename
                    </button>
                    {!isPlayground && (
                        <button
                            onClick={handleDelete}
                            className="ui-selectable ui-shape-soft w-full text-left px-3 py-2 hover:bg-[var(--semantic-color-status-error)]/10 hover:text-[var(--semantic-color-status-error)] text-[var(--semantic-color-text-secondary)]"
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
