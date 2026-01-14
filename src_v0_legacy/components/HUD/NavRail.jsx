import React from 'react';
import { useWindowStore } from '../../store/windowStore';
import { useGraphStore } from '../../store/graphStore'; // Import graphStore
import { useStateStore, TONES } from '../../store/stateStore';

const NAV_ITEMS = [
    { id: 'now', label: 'NOW', icon: <span className="block text-[24px] leading-none mb-1">•</span> },
    { id: 'graph', label: 'Graph', icon: <span className="block text-[24px] leading-none">◎</span> },
    { id: 'agent', label: 'Agent', icon: <span className="block text-[24px] leading-none font-bold">𓂀</span> },
    { id: 'log', label: 'Log', icon: <span className="block text-[24px] leading-none">≡</span> },
    { id: 'settings', label: 'Settings', icon: <span className="block text-[24px] leading-none font-bold">∴</span> }
];

const NavItem = ({ id, icon, label, activeTab, setActiveTab, activeColor, className = '' }) => {
    const isActive = activeTab === id;

    return (
        <button
            onClick={() => setActiveTab(id)}
            title={label}
            className={`relative w-[40px] h-[40px] flex items-center justify-center transition-all duration-300 group rounded-xl cursor-pointer hover:bg-white/5 ${className}`}
            style={{
                backgroundColor: isActive ? `${activeColor}15` : undefined
            }}
        >
            {/* Icon */}
            <div
                className={`text-2xl leading-none transition-colors duration-300 ${isActive ? '' : 'text-os-text-secondary group-hover:text-os-text-primary'}`}
                style={{
                    color: isActive ? activeColor : undefined,
                    filter: isActive ? `drop-shadow(0 0 8px ${activeColor})` : 'none'
                }}
            >
                {icon}
            </div>
        </button>
    );
};

import { useOsShellStore } from '../../store/osShellStore'; // Import osShellStore

// ... (NAV_ITEMS remains same)

const NavRail = () => {
    const { dockZIndex, focusDock, navRailWidth, setNavRailWidth, windows, updateWindowPosition, isNavCollapsed, toggleNavCollapse } = useWindowStore();
    const { toneId } = useStateStore();
    const { nodes, selection } = useGraphStore(); // Keep nodes for fallback logic

    // Use osShellStore
    const { activeTab, setTab, enterNOW } = useOsShellStore();
    const { viewMode } = useGraphStore(); // Renamed mode to viewMode
    // But wait, line 76 uses 'mode' for LUMA check. Is that graphStore mode or stateStore mode?
    // "const { mode } = useStateStore();" is at line 4? No, line 4 imports it.
    // Line 46: const { toneId } = useStateStore();
    // Line 51: const { mode } = useGraphStore(); -> This was likely wrong if it wanted LUMA.
    // GraphStore mode was GRAPH/NOW. StateStore mode is FLOW/LUMA.
    // Line 76: const activeColor = mode === 'LUMA' ...
    // So NavRail was checking graphStore.mode for LUMA? That would always be false (offsetting to default color).
    // I should fix this to use useStateStore for mode (LUMA).
    // And if it needs viewMode, use viewMode.

    // Let's check imports. uses stateStore line 4.
    // Let's fetch mode from useStateStore.

    // Replacement:
    const { mode } = useStateStore();

    // Active item matches activeTab directly now (both lowercase)
    const activeItem = activeTab;

    const handleTabClick = (id) => {
        if (id === 'now') {
            // 1. Try currently selected node
            if (selection.length > 0) {
                enterNOW(selection[0]);
                return;
            }
            // 2. Fallback to Core
            const coreNode = nodes.find(n => n.entity.type === 'core');
            if (coreNode) {
                enterNOW(coreNode.id);
            }
            return;
        }

        // For other tabs (graph, log, etc.) - Direct set
        setTab(id);
    };
    const currentTone = TONES.find(t => t.id === toneId) || TONES[0];
    const activeColor = mode === 'LUMA' ? currentTone.lumaColor : currentTone.color;

    // Convert hex to RGB
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '140, 195, 205';
    };
    const accentRGB = hexToRgb(activeColor);

    // Drag Logic
    const [isDragging, setIsDragging] = React.useState(false);

    React.useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;

            // Auto-expand if dragging starts
            if (isNavCollapsed) {
                toggleNavCollapse();
            }

            // Update width
            const newWidth = Math.max(72, Math.min(e.clientX, window.innerWidth));
            setNavRailWidth(newWidth);

            // Push Windows
            Object.values(windows).forEach(win => {
                if (win.isOpen && !win.isMinimized && !win.isStatic) {
                    const padding = 20;
                    if (win.position.x < newWidth + padding) {
                        updateWindowPosition(win.id, { ...win.position, x: newWidth + padding });
                    }
                }
            });
        };

        const handleMouseUp = (e) => {
            if (!isDragging) return;
            setIsDragging(false);

            // Check for Full Screen Trigger (> 80% width)
            if (e.clientX > window.innerWidth * 0.8) {
                console.log('🚀 NavRail Full Screen Trigger -> Switch to HUD Mode');
                setTab('hud');
                // Reset width with animation (handled by CSS transition if we add it, or just snap back)
                setNavRailWidth(window.innerWidth * 0.146);
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, setNavRailWidth, setTab, isNavCollapsed, toggleNavCollapse, windows, updateWindowPosition]);

    return (
        <nav
            className="absolute left-0 top-0 h-full py-6 
            backdrop-blur-xl flex flex-col items-start justify-start transition-all duration-300 ease-out"
            style={{
                width: isNavCollapsed ? '72px' : (navRailWidth || '14.6vw'), // Collapsed (Icons) vs Dynamic
                background: 'var(--surface-1-bg)',
                borderRight: `var(--panel-stroke-width) solid rgba(${accentRGB}, 0.35)`,
                boxShadow: `0 0 20px rgba(${accentRGB}, 0.22)`,
                zIndex: dockZIndex,
                overflow: 'visible'
            }}
            onClickCapture={focusDock}
        >
            {/* Drag Handle for Resizing */}
            <div
                className="absolute right-0 top-0 bottom-0 w-1 z-40 cursor-col-resize hover:bg-white/20 transition-colors"
                onMouseDown={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
            />{/* Fixed Icon Strip (Left) */}
            <div className="absolute left-0 top-0 bottom-0 w-[72px] flex flex-col items-center justify-center z-20 bg-transparent pointer-events-none">
                <div className="pointer-events-auto flex flex-col py-6 gap-8">
                    {NAV_ITEMS.map((item, index) => (
                        <NavItem
                            key={item.id}
                            {...item}
                            activeTab={activeItem}
                            setActiveTab={handleTabClick}
                            activeColor={activeColor}
                            className={item.id === 'now' ? 'mb-4' : ''}
                        />
                    ))}
                </div>
            </div>

            {/* Toggle Arrow at Bottom - Aligned with SystemDock */}
            <div className="absolute left-0 bottom-4 w-[72px] flex justify-center z-30">
                <button
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${mode === 'LUMA' ? 'hover:bg-black/5' : 'hover:bg-white/5'}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleNavCollapse();
                    }}
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="transition-transform duration-300"
                        style={{
                            transform: isNavCollapsed ? 'rotate(0deg)' : 'rotate(180deg)'
                        }}
                    >
                        <path
                            d="M6 12L10 8L6 4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity="0.5"
                        />
                    </svg>
                </button>
            </div>

            {/* Content Area (Right of Strip) */}
            <div
                className={`absolute left-[72px] top-0 bottom-0 right-0 flex flex-col p-6 overflow-hidden transition-opacity duration-300 ${isNavCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                style={{ width: `calc(100% - 72px)` }}
            >
                <div className="text-os-text-primary font-bold mb-4 opacity-50 tracking-widest text-xs">
                    {activeTab.toUpperCase()} VIEW
                </div>
                {/* Placeholder for future content (Chat, Logs, etc.) */}
                <div className="flex-1 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-os-text-secondary text-sm">
                    {activeTab} Content Area
                </div>
            </div>
        </nav>
    );
};

export default NavRail;
