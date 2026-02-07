/**
 * App.tsx
 * Root of the v0.5 Application.
 */

import { useEffect } from 'react';
import Shell from './components/Layout/Shell';
import { useGraphStore } from './store/useGraphStore';
import { useAppStore } from './store/useAppStore';
import { useSelectionStore } from './store/useSelectionStore';
import { useAreaStore } from './store/useAreaStore';
import { eventBus } from './core/events/EventBus';
import { initUndoManager } from './core/undo/UndoManager';
import { initAudioBus } from './core/audio/AudioBus';
import { initEventLog, eventLog } from './core/events/EventLog';
import { initSfContentSync } from './core/storage/SfContentSync';

function App() {
    const addNode = useGraphStore(state => state.addNode);
    const addEdge = useGraphStore(state => state.addEdge);

    // Seed some initial data for testing
    useEffect(() => {
        const stopAudio = initAudioBus();
        const stopUndo = initUndoManager();
        const stopEventLog = initEventLog();
        const stopSfContentSync = initSfContentSync();

        // Expose store for tests
        if (typeof window !== 'undefined') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__GRAPH_STORE__ = useGraphStore;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__APP_STORE__ = useAppStore;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__SELECTION_STORE__ = useSelectionStore;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__AREA_STORE__ = useAreaStore;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__EVENT_BUS__ = eventBus;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__EVENT_LOG__ = eventLog;
        }

        return () => {
            if (stopAudio) stopAudio();
            if (stopUndo) stopUndo();
            if (stopEventLog) stopEventLog();
            if (stopSfContentSync) stopSfContentSync();
        };
    }, [addNode, addEdge]);

    return (
        <>
            <Shell />
        </>
    );
}

export default App;
