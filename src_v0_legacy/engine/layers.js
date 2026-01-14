/**
 * SymbolField OS - Layer Management (Z-Index SSoT)
 * Central source of truth for all z-index values to prevent layering conflicts.
 * Invariant 2.2: No hardcoded z-indices in components.
 */

export const LAYERS = {
    // Canvas Level (0-99)
    GRID: 0,
    CONNECTION: 5,
    NODE_BASE: 10,
    NODE_HOVER: 20,
    NODE_SELECTED: 30,
    CORE_NODE: 50,
    NODE_ACTIVE: 60, // When interacting/draging

    // HUD Level (100-999)
    DOCK: 50, // Legacy dock (NavRail might override this dynamically)
    WINDOW_BASE: 100, // Windows start here and increment
    NAV_RAIL: 500,    // Ensure NavRail is above standard windows if docked? 
    // Actually NavRail uses dockZIndex from store, usually starts at 50 but can focus.

    // Overlay Level (1000+)
    OVERLAY_BACKDROP: 900,
    OVERLAY_MODAL: 1000,
    RADIAL_MENU: 2000,
    NOTIFICATION: 5000,
    TOOLTIP: 10000,

    // System Level (50000+) - Ultra-high priority (Trinity, ChronoCore)
    TRINITY_OVERLAY: 50000,
    CHRONO_CORE: 60000,

    CURSOR: 99999
};
