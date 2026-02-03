import React, { useEffect, useState } from 'react';
import { eventBus, EVENTS } from '../../core/events/EventBus';
import { spaceManager, type SpaceMeta } from '../../core/state/SpaceManager';
import { useAppStore } from '../../store/useAppStore';

const RecentsRail = () => {
    // Local state for spaces list
    const [spaces, setSpaces] = useState<SpaceMeta[]>([]);
    const showPlaygroundOnStation = useAppStore(state => state.showPlaygroundOnStation);

    useEffect(() => {
        const refresh = () => setSpaces(spaceManager.getSpaces());
        refresh();
        const unsub = [
            eventBus.on(EVENTS.SPACE_CREATED, refresh),
            eventBus.on(EVENTS.SPACE_RENAMED, refresh),
            eventBus.on(EVENTS.SPACE_DELETED, refresh)
        ];
        return () => unsub.forEach(fn => fn());
    }, []);

    const handleClick = (id: string) => {
        spaceManager.loadSpace(id);
    };

    if (spaces.length === 0) return null;

    const playground = spaceManager.getPlaygroundSpace();
    const recents = spaces.filter(space => space.id !== playground?.id);

    return (
        <div>
            <h2 className="text-white/80 text-[9px] font-medium uppercase tracking-[0.35em] mb-4">Recent</h2>
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
                className="group flex items-center gap-3 w-full text-left focus-visible:outline-none hover:bg-white/5 rounded-2xl p-2 -mx-2 transition-all"
            >
                {/* Space Icon */}
                <div className="
                            w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                            border transition-all duration-300
                            bg-white/5 border-white/10
                            group-hover:bg-white/10 group-hover:border-white/30 group-hover:scale-110
                            group-focus-visible:ring-1 group-focus-visible:ring-white/50
                        ">
                    <span className="text-white/90 group-hover:text-white transition-colors text-xs font-mono">
                        ◇
                    </span>
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-white/90 text-xs truncate group-hover:text-white transition-colors">
                        {item.name}
                    </h3>
                    <p className="text-white/60 text-[8px] uppercase tracking-wider">
                        {isPlayground ? 'Playground' : new Date(item.lastAccessedAt).toLocaleDateString()}
                    </p>
                </div>
            </button>

            <button
                onClick={() => setMenuOpen(prev => !prev)}
                className="absolute right-0 top-1/2 -translate-y-1/2 px-2 text-white/40 hover:text-white/70 text-xs"
                aria-label="Space actions"
            >
                ⋯
            </button>

            {menuOpen && (
                <div className="absolute right-0 top-full mt-2 z-20 min-w-[140px] rounded-xl border border-white/10 bg-black/80 backdrop-blur p-1 text-xs">
                    <button
                        onClick={handleRename}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-white/80"
                    >
                        Rename
                    </button>
                    {!isPlayground && (
                        <button
                            onClick={handleDelete}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/20 text-red-200"
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
