import React, { useEffect } from 'react';
import NavRail from '../HUD/NavRail';
// import Dock from '../HUD/Dock'; // Replaced by TimeSpiral
import GraphCanvas from '../Canvas/GraphCanvas';
import { useWindowStore } from '../../store/windowStore';
import { useStateStore } from '../../store/stateStore';
import { useGraphStore } from '../../store/graphStore';
import { useHarmonyStore } from '../../store/harmonyStore';
import WindowFrame from '../HUD/WindowFrame';
import NodePropertiesWindow from '../Windows/NodePropertiesWindow';
import AgentWindow from '../Modules/AgentWindow';

import StatePanel from '../HUD/StatePanel'; // Import StatePanel
import TimeChip from '../HUD/TimeChip'; // Import TimeChip
import SystemDock from '../HUD/SystemDock'; // Import SystemDock
import CoreWidget from '../HUD/CoreWidget'; // Import CoreWidget
import XpSummaryPanel from '../HUD/XpSummaryPanel'; // Import XpSummaryPanel
import GraphInfo from '../HUD/GraphInfo'; // Import GraphInfo
import { defaultTimeWindow, now } from '../../utils/temporal';
import NOWView from '../NOW/NOWView'; // Import NOWView

import { useOsShellStore } from '../../store/osShellStore'; // Use OS Shell Store

// ... existing imports

const MainLayout = () => {
    // 1. Get OS Shell State
    const { activeTab, layoutMode } = useOsShellStore();

    // Legacy mapping (temp) until we switch all components
    const graphMode = activeTab === 'now' ? 'NOW' : 'GRAPH';

    // Window store only needed for window management now, not activeTab
    const { windows, resetWindows, navRailWidth, isNavCollapsed } = useWindowStore();
    const { mode, temporal, setTimeWindow } = useStateStore(); // 'mode' here is Color Mode (LUMA/Dark), confuse with graphMode?
    // Let's rename destructuring if needed, but 'mode' from useStateStore is purely visual/tone.
    const { isUltraEnabled, toggleUltraMode } = useHarmonyStore();


    // Temporal Dock handlers
    const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

    const handleScaleChange = (newKind) => {
        const newWindow = defaultTimeWindow(newKind, now());
        setTimeWindow(newWindow);
    };

    const handleOpenCalendar = () => {
        setIsCalendarOpen(true);
    };

    useEffect(() => {
        resetWindows();
        // Sync harmonics with state store initially and on updates
        useHarmonyStore.getState().syncWithStateStore();
        // Subscribe to stateStore changes to keep harmonics in sync
        const unsubscribe = useStateStore.subscribe(() => {
            useHarmonyStore.getState().syncWithStateStore();
        });
        return () => unsubscribe();
    }, []);

    // Dynamic Background based on Mode
    const getBackgroundStyle = () => {
        switch (mode) {
            case 'DEEP':
                return 'bg-[#050505]'; // Pure Void
            case 'FLOW':
                return 'bg-gradient-to-br from-[#1c1d21] via-[#151619] to-[#0e0f11]'; // Crystalline Neutral
            case 'LUMA':
                return 'bg-[#e9ddc6]'; // Warm Light Beige (L~86)
            default:
                return 'bg-os-dark';
        }
    };

    // Updated renderTabContent using osShell activeTab ('graph', 'now' etc lower case)
    const renderTabContent = () => {
        // Map store keys to UI logic
        // 'graph', 'now' -> Handled by Canvas layer
        if (activeTab === 'graph' || activeTab === 'now') return null;

        switch (activeTab) {
            case 'hud': // assuming lowercase
                return null;
            case 'agent':
                return (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="pointer-events-auto w-[800px] h-[600px]">
                            <WindowFrame
                                id="agent-main"
                                title="Agent"
                                glyph="𓂀"
                                initialPosition={{ x: 0, y: 0 }}
                                isStatic
                                style={{ zIndex: windows['agent-main']?.zIndex }}
                            >
                                <AgentWindow />
                            </WindowFrame>
                        </div>
                    </div>
                );
            case 'log':
                return (
                    // ... (Log Content)
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="pointer-events-auto w-[600px] h-[400px]">
                            <WindowFrame
                                id="log-main"
                                title="System Log"
                                glyph="≡"
                                initialPosition={{ x: 0, y: 0 }}
                                isStatic
                                style={{ zIndex: windows['log-main']?.zIndex }}
                            >
                                <div className="text-os-text-secondary p-4 font-mono text-sm selectable-text">
                                    <div className="text-os-cyan mb-2">SYSTEM ONLINE // V.0.3.0</div>
                                    <div className="opacity-70">Initializing Core... OK</div>
                                    <div className="opacity-70">Loading Modules... OK</div>
                                    <div className="opacity-70">Connecting to Neural Net... OK</div>
                                    <div className="mt-4 text-os-text-primary">Waiting for input...</div>
                                </div>
                            </WindowFrame>
                        </div>
                    </div>
                );
            case 'settings':
                return (
                    // ... (Settings Content)
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="pointer-events-auto w-[500px] h-[600px]">
                            <WindowFrame
                                id="settings-main"
                                title="Settings"
                                glyph="∷"
                                initialPosition={{ x: 0, y: 0 }}
                                isStatic
                                style={{ zIndex: windows['settings-main']?.zIndex }}
                            >
                                <div className="p-6 space-y-6">
                                    <div>
                                        <h3 className="text-os-text-primary font-bold mb-2">Visuals</h3>
                                        <div className="flex items-center justify-between text-os-text-secondary">
                                            <span>Glass Blur</span>
                                            <span className="text-os-cyan">High</span>
                                        </div>
                                        <div className="flex items-center justify-between text-os-text-secondary mt-2">
                                            <span>Animations</span>
                                            <span className="text-os-cyan">On</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-os-text-primary font-bold mb-2">Audio</h3>
                                        <div className="flex items-center justify-between text-os-text-secondary">
                                            <span>Ambience</span>
                                            <span className="text-os-cyan">50%</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-os-glass-border">
                                        <h3 className="text-os-text-primary font-bold mb-2">Experimental</h3>
                                        <div className="flex items-center justify-between text-os-text-secondary mb-3">
                                            <span>Ultra-Harmony Mode</span>
                                            <button
                                                onClick={toggleUltraMode}
                                                className={`w-10 h-5 rounded-full transition-colors duration-300 relative ${isUltraEnabled ? 'bg-os-cyan' : 'bg-os-glass-border'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${isUltraEnabled ? 'left-6' : 'left-1'}`} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between text-os-text-secondary">
                                            <span>B&W UI Mode</span>
                                            <button
                                                onClick={() => setGrayscale(!isGrayscale)}
                                                className={`w-10 h-5 rounded-full transition-colors duration-300 relative ${isGrayscale ? 'bg-white' : 'bg-os-glass-border'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-black transition-all duration-300 ${isGrayscale ? 'left-6' : 'left-1'}`} />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-os-text-primary font-bold mb-2">Visuals</h3>
                                        <div className="flex items-center justify-between text-os-text-secondary">
                                            <span>Glass Blur</span>
                                            <span className="text-os-cyan">High</span>
                                        </div>
                                        <div className="flex items-center justify-between text-os-text-secondary mt-2">
                                            <span>Animations</span>
                                            <span className="text-os-cyan">On</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-os-text-primary font-bold mb-2">Audio</h3>
                                        <div className="flex items-center justify-between text-os-text-secondary">
                                            <span>Ambience</span>
                                            <span className="text-os-cyan">50%</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-os-glass-border">
                                        <h3 className="text-os-text-primary font-bold mb-2">Experimental</h3>
                                        <div className="flex items-center justify-between text-os-text-secondary mb-3">
                                            <span>Ultra-Harmony Mode</span>
                                            <button
                                                onClick={toggleUltraMode}
                                                className={`w-10 h-5 rounded-full transition-colors duration-300 relative ${isUltraEnabled ? 'bg-os-cyan' : 'bg-os-glass-border'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${isUltraEnabled ? 'left-6' : 'left-1'}`} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between text-os-text-secondary">
                                            <span>B&W UI Mode</span>
                                            <button
                                                onClick={() => setGrayscale(!isGrayscale)}
                                                className={`w-10 h-5 rounded-full transition-colors duration-300 relative ${isGrayscale ? 'bg-white' : 'bg-os-glass-border'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-black transition-all duration-300 ${isGrayscale ? 'left-6' : 'left-1'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </WindowFrame>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const { isGrayscale, setGrayscale } = useStateStore(); // Removed duplicate isGrayscale definition
    const { nodes } = useGraphStore(); // Extracted nodes

    return (
        <div className={`relative w-screen h-screen overflow-hidden grid transition-colors duration-1000 ${getBackgroundStyle()} ${mode === 'LUMA' ? 'mode-luma' : ''} ${mode === 'FLOW' ? 'mode-flow' : ''}`}
            style={{
                filter: isGrayscale ? 'grayscale(100%)' : 'none',
                gridTemplateColumns: `${isNavCollapsed ? 72 : navRailWidth}px 1fr`
            }}
        >
            {/* Layer 0: The Infinite Canvas (Background) OR NOW View */}

            {/* RENDER LOGIC: 
                - If activeTab is 'now' -> Show NOW View
                - If activeTab is 'graph' -> Show GraphCanvas
                - If activeTab is 'agent'/'log' -> Show GraphCanvas (dimmed) + Overlay? 
                    Usually Graph is always present in background unless Fullscreen NOW. 
                    Let's assume Graph is visible unless NOW.
            */}

            {activeTab === 'now' ? (
                <div className="absolute inset-0 z-[100] bg-[#050505]">
                    <NOWView />
                </div>
            ) : (
                <div className={`absolute inset-0 z-[var(--z-canvas)] ${mode === 'LUMA' ? 'opacity-100 mix-blend-normal' : 'opacity-50 mix-blend-screen'}`}>
                    <GraphCanvas isEditMode={activeTab === 'graph'} />
                </div>
            )}

            {/* Nav Rail - Column 1 (0.146W) */}
            < div className="relative z-[var(--z-trinity)] col-start-1 border-r border-os-glass-border bg-os-glass/5 backdrop-blur-sm" >
                <NavRail />
            </div >

            {/* Main Content Area - Spans Graph Only (Col 2) */}
            <div className="relative h-full col-start-2 flex flex-col">
                <main className="flex-1 relative">
                    {/* Content specific to the main area can go here if needed */}
                </main>
                <SystemDock
                    timeWindow={temporal.timeWindow}
                    onScaleChange={handleScaleChange}
                    onOpenCalendar={handleOpenCalendar}
                />
            </div>

            {/* GLOBAL LAYERS (Overlay everything) */}

            {/* Layer 2: Core Overlays */}
            <div className="absolute inset-0 pointer-events-none z-[var(--z-core-overlays)]">
                <CoreWidget />
            </div>

            {/* Layer 3: Floating Windows (Tab Content) */}
            <div className="absolute inset-0 pointer-events-none z-[var(--z-windows)]">
                {renderTabContent()}
            </div>

            {/* Layer 4: Floating Windows (Node Properties, etc.) */}
            <div className="absolute inset-0 pointer-events-none z-[var(--z-windows)]">
                {Object.values(windows) // Correctly uses hook value
                    .filter(w => w.isOpen && !w.isMinimized)
                    .map(win => {
                        if (win.id.startsWith('node-properties-') || win.id === 'unified-node-properties') {
                            const node = nodes.find(n => n.id === win.data?.id); // Correctly uses hook value
                            if (!node) return null;

                            return (
                                <div key={win.id} className="pointer-events-none absolute inset-0">
                                    <WindowFrame
                                        id={win.id}
                                        title={win.id.startsWith('node-properties') || win.id === 'unified-node-properties' ? '' : win.title}
                                        glyph={win.id.startsWith('node-properties') || win.id === 'unified-node-properties' ? null : win.glyph}
                                        initialPosition={win.position}
                                        style={{
                                            zIndex: win.zIndex,
                                            ...(win.id.startsWith('node-properties') || win.id === 'unified-node-properties'
                                                ? { width: 'fit-content', height: 'auto', minWidth: 'auto', minHeight: 'auto' }
                                                : {})
                                        }}
                                    >
                                        <NodePropertiesWindow
                                            node={node}
                                            onClose={() => useWindowStore.getState().closeWindow(win.id)} // Close action is fine to be inline? Contract says logic in stores. But useStore.getState().action() in event handler is technically "safe" from render loop but bad style. Better: const { closeWindow } = useWindow();
                                        />
                                    </WindowFrame>
                                </div>
                            );
                        }
                        return null;
                    })
                }
            </div>

            {/* Layer 5: XP Summary */}
            {
                activeTab === 'HUD' && (
                    <div className="absolute inset-0 pointer-events-none z-[var(--z-xp-summary)]">
                        <XpSummaryPanel />
                    </div>
                )
            }

            {/* Layer 5: Trinity (State) */}
            <div className="absolute inset-0 pointer-events-none z-[var(--z-trinity)]">
                <StatePanel />
                <GraphInfo />
            </div>
        </div >
    );
};

export default MainLayout;
