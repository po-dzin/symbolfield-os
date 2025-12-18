
import { create } from 'zustand';
import { CONSTANTS } from '../engine/harmonics';

export const useWindowStore = create((set) => ({
    windows: {}, // { [id]: { id, title, glyph, isOpen, isMinimized, zIndex, position } }
    activeWindowId: null,
    nextZIndex: 100,
    dockZIndex: 50, // Initial dock z-index

    focusDock: () => set((state) => ({
        dockZIndex: state.nextZIndex,
        nextZIndex: state.nextZIndex + 1,
        activeWindowId: null // Optional: deselect window when dock is focused? Or keep active? User said "click dock -> above window".
    })),

    // Layout State
    navRailWidth: window.innerWidth * 0.146, // Default 14.6vw in pixels
    setNavRailWidth: (width) => set({ navRailWidth: width }),
    isNavCollapsed: true, // Default collapsed
    toggleNavCollapse: () => set((state) => ({ isNavCollapsed: !state.isNavCollapsed })),

    // Spec v0.2 State
    // activeTab moved to osShellStore (SSoT)
    xpState: {
        hp: 50, // 🪨
        ep: 50, // 💧
        mp: 50, // 🔥
        sp: 50, // 🌬️
        np: 100 // 🕳/🌈
    },
    timeSpiralState: {
        expanded: false,
        breathPhase: 'inhale' // inhale, hold, exhale
    },

    updateXP: (type, value) => set((state) => ({
        xpState: { ...state.xpState, [type]: value }
    })),
    toggleTimeSpiral: () => set((state) => ({
        timeSpiralState: { ...state.timeSpiralState, expanded: !state.timeSpiralState.expanded }
    })),

    toggleWindowPin: (id) => set((state) => ({
        windows: {
            ...state.windows,
            [id]: {
                ...state.windows[id],
                isPinned: !state.windows[id].isPinned
            }
        }
    })),

    // Harmonic Window Sizes
    // Agent: 2x Base Width (544px), 2x Base Height (336px)
    // Settings: 1x Base Width (272px) -> maybe too small? Let's try 1.5x or 2x vertical.
    // Spec says "34U x 21U or multiples".
    // Let's use:
    // Agent: 2W x 2H (544 x 336)
    // Log: 2W x 2H (544 x 336)
    // Settings: 2W x 3H (544 x 504) - needs height

    isCoreMinimized: false,
    coreStatus: 'SOURCE', // 'SOURCE' | 'EXIST'

    toggleCoreMinimize: () => set((state) => ({ isCoreMinimized: !state.isCoreMinimized })),
    setCoreStatus: (status) => set({ coreStatus: status }),

    // Legacy support (mapped to status)
    deleteCore: () => set({ coreStatus: 'SOURCE' }),
    createCore: () => set({ coreStatus: 'EXIST' }),

    // Onboarding tooltip
    onboardingTooltip: null, // { message: string, startTime: number }
    showOnboardingTooltip: (message, duration = 2000) => {
        set({ onboardingTooltip: { message, startTime: Date.now() } });
        setTimeout(() => {
            set({ onboardingTooltip: null });
        }, duration);
    },
    hideOnboardingTooltip: () => set({ onboardingTooltip: null }),

    openWindow: (id, config) => set((state) => {
        if (state.windows[id]) {
            // If already open, just focus it
            return {
                activeWindowId: id,
                windows: {
                    ...state.windows,
                    [id]: {
                        ...state.windows[id],
                        ...config, // Merge new config (title, data, glyph)
                        isOpen: true,
                        isMinimized: false,
                        zIndex: state.nextZIndex
                    }
                },
                nextZIndex: state.nextZIndex + 1
            };
        }

        // Calculate cascade position
        const openCount = Object.values(state.windows).filter(w => w.isOpen).length;
        const cascadeOffset = openCount * 30;

        let defaultPos = { x: 100 + cascadeOffset, y: 100 + cascadeOffset };

        // Specific positioning for Node Properties
        if (id.includes('properties')) {
            // Check if any other node-properties window exists to preserve position
            const existingPropertiesWindow = Object.values(state.windows)
                .find(w => w.id.includes('properties'));

            if (existingPropertiesWindow && existingPropertiesWindow.position) {
                // Use position of existing/previous properties window
                defaultPos = existingPropertiesWindow.position;
            } else {
                // Default to top-right corner (same as reset position)
                defaultPos = { x: window.innerWidth - 550, y: 100 };
            }
        }

        // Open new
        return {
            activeWindowId: id,
            windows: {
                ...state.windows,
                [id]: {
                    id,
                    isOpen: true,
                    isMinimized: false,
                    zIndex: state.nextZIndex,
                    position: config.position || defaultPos,
                    ...config
                }
            },
            nextZIndex: state.nextZIndex + 1
        };
    }),

    closeWindow: (id) => set((state) => ({
        windows: {
            ...state.windows,
            [id]: { ...state.windows[id], isOpen: false, isMinimized: false }
        }
    })),

    minimizeWindow: (id) => set((state) => ({
        windows: {
            ...state.windows,
            [id]: { ...state.windows[id], isMinimized: true }
        },
        activeWindowId: null
    })),

    restoreWindow: (id) => set((state) => ({
        activeWindowId: id,
        windows: {
            ...state.windows,
            [id]: {
                ...state.windows[id],
                isMinimized: false,
                zIndex: state.nextZIndex
            }
        },
        nextZIndex: state.nextZIndex + 1
    })),

    focusWindow: (id) => set((state) => ({
        activeWindowId: id,
        windows: {
            ...state.windows,
            [id]: { ...state.windows[id], zIndex: state.nextZIndex }
        },
        nextZIndex: state.nextZIndex + 1
    })),

    updateWindowPosition: (id, position) => set((state) => ({
        windows: {
            ...state.windows,
            [id]: { ...state.windows[id], position }
        }
    })),

    resetWindows: () => set({ windows: {}, activeWindowId: null }),
}));
