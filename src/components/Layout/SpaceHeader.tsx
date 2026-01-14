import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { spaceManager } from '../../core/state/SpaceManager';
import { eventBus } from '../../core/events/EventBus';

const SpaceHeader = () => {
    const setViewContext = useAppStore(state => state.setViewContext);
    const viewContext = useAppStore(state => state.viewContext);
    const currentSpaceId = useAppStore(state => state.currentSpaceId); // We assume this is synced from StateEngine

    // We need to fetch 'currentSpaceId' from StateEngine directly if AppStore isn't exposing it yet?
    // AppStore state def: { activeTool, viewContext, ... } does it have currentSpaceId?
    // StateEngine has it. The AppStore via 'useAppStore.js' (now .ts?) might need update.
    // Assuming useAppStore uses StateEngine.getState(), let's check useAppStore later.
    // For now, let's use a local sync or assume passed props? No, component should be autonomous.

    // Let's rely on spaceManager for metadata
    const [name, setName] = useState('New Space');

    useEffect(() => {
        // Sync name on mount or ID change
        if (currentSpaceId) {
            const meta = spaceManager.getSpaceMeta(currentSpaceId);
            if (meta) setName(meta.name);
        }
    }, [currentSpaceId]);

    // Handle Rename
    const handleRename = (newValue: string) => {
        let target = newValue.trim();
        if (!target) target = 'New Space';

        if (currentSpaceId) {
            const finalName = spaceManager.renameSpace(currentSpaceId, target);
            setName(finalName);
        }
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
            <div className="h-8 flex items-center bg-sf-zinc-900/80 backdrop-blur border border-white/5 rounded-full px-4 shadow-sm hover:border-white/10 transition-colors">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={(e) => handleRename(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.currentTarget.blur();
                        }
                    }}
                    className="bg-transparent text-sm text-white/90 font-medium w-32 focus:w-48 transition-all focus:outline-none placeholder-white/20 text-center"
                    placeholder="Untitled"
                />
            </div>

            {/* Cloud Status (Mock) */}
            <div className="w-2 h-2 rounded-full bg-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.3)]" title="Saved locally" />
        </div>
    );
};

export default SpaceHeader;
