import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getSystemMotionMetrics } from '../../core/ui/SystemMotion';
import {
    RIGHT_DRAWER_MODULES,
    mapDrawerRightTabToPrimary,
    resolveDrawerTabForPrimary,
    type PrimaryDrawerModule
} from './rightDrawerModules';

const RAIL_EXIT_MS = 160;

const RightDrawerCapsule: React.FC = () => {
    const drawerRightOpen = useAppStore(state => state.drawerRightOpen);
    const drawerRightTab = useAppStore(state => state.drawerRightTab);
    const setDrawerOpen = useAppStore(state => state.setDrawerOpen);
    const setDrawerRightTab = useAppStore(state => state.setDrawerRightTab);
    const themeMotion = useAppStore(state => state.themeMotion);
    const themeSpeed = useAppStore(state => state.themeSpeed);

    const [canHover, setCanHover] = useState(true);
    const [railState, setRailState] = useState<'collapsed' | 'hovering'>('collapsed');
    const [railVisible, setRailVisible] = useState(false);
    const closeTimerRef = useRef<number | null>(null);
    const unmountTimerRef = useRef<number | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const launcherRef = useRef<HTMLButtonElement | null>(null);
    const railItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const motion = getSystemMotionMetrics(themeMotion, themeSpeed);
    const activeId = useMemo<PrimaryDrawerModule>(
        () => mapDrawerRightTabToPrimary(drawerRightTab),
        [drawerRightTab]
    );

    const clearTimer = (ref: React.MutableRefObject<number | null>) => {
        if (ref.current === null) return;
        window.clearTimeout(ref.current);
        ref.current = null;
    };

    const clearCloseTimer = useCallback(() => {
        clearTimer(closeTimerRef);
    }, []);

    const clearUnmountTimer = useCallback(() => {
        clearTimer(unmountTimerRef);
    }, []);

    const closeRailImmediately = useCallback(() => {
        clearCloseTimer();
        clearUnmountTimer();
        setRailState('collapsed');
        setRailVisible(false);
    }, [clearCloseTimer, clearUnmountTimer]);

    const openRail = useCallback(() => {
        clearCloseTimer();
        clearUnmountTimer();
        if (!railVisible) {
            setRailVisible(true);
            window.requestAnimationFrame(() => setRailState('hovering'));
            return;
        }
        setRailState('hovering');
    }, [clearCloseTimer, clearUnmountTimer, railVisible]);

    const closeRailSoon = useCallback(() => {
        clearCloseTimer();
        closeTimerRef.current = window.setTimeout(() => {
            setRailState('collapsed');
            clearUnmountTimer();
            unmountTimerRef.current = window.setTimeout(() => {
                setRailVisible(false);
                unmountTimerRef.current = null;
            }, RAIL_EXIT_MS);
            closeTimerRef.current = null;
        }, motion.railCloseDelayMs);
    }, [clearCloseTimer, clearUnmountTimer, motion.railCloseDelayMs]);

    const toggleDrawerForPrimary = useCallback((id: PrimaryDrawerModule) => {
        const currentPrimary = mapDrawerRightTabToPrimary(drawerRightTab);
        if (drawerRightOpen && currentPrimary === id) {
            setDrawerOpen('right', false);
            return;
        }
        setDrawerRightTab(resolveDrawerTabForPrimary(id, drawerRightTab));
        setDrawerOpen('right', true);
    }, [drawerRightOpen, drawerRightTab, setDrawerOpen, setDrawerRightTab]);

    const selectPrimary = useCallback((id: PrimaryDrawerModule) => {
        setDrawerRightTab(resolveDrawerTabForPrimary(id, drawerRightTab));
        setDrawerOpen('right', true);
        if (!canHover) {
            closeRailImmediately();
        }
    }, [canHover, closeRailImmediately, drawerRightTab, setDrawerOpen, setDrawerRightTab]);

    const focusRailItem = useCallback((index: number) => {
        const total = RIGHT_DRAWER_MODULES.length;
        if (!total) return;
        const normalized = ((index % total) + total) % total;
        const target = railItemRefs.current[normalized];
        target?.focus();
    }, []);

    const activeIcon = RIGHT_DRAWER_MODULES.find(item => item.id === activeId)?.icon;

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const media = window.matchMedia('(hover: hover) and (pointer: fine)');
        const apply = () => setCanHover(media.matches);
        apply();
        media.addEventListener('change', apply);
        return () => media.removeEventListener('change', apply);
    }, []);

    useEffect(() => {
        if (!railVisible) return;
        const handlePointerDownOutside = (event: PointerEvent) => {
            if (!rootRef.current) return;
            const target = event.target as Node | null;
            if (target && rootRef.current.contains(target)) return;
            closeRailImmediately();
        };
        window.addEventListener('pointerdown', handlePointerDownOutside, true);
        return () => window.removeEventListener('pointerdown', handlePointerDownOutside, true);
    }, [closeRailImmediately, railVisible]);

    useEffect(() => () => {
        clearCloseTimer();
        clearUnmountTimer();
    }, [clearCloseTimer, clearUnmountTimer]);

    return (
        <div
            ref={rootRef}
            onMouseEnter={() => {
                if (canHover) openRail();
            }}
            onMouseLeave={() => {
                if (canHover) closeRailSoon();
            }}
            className="relative"
        >
            <button
                ref={launcherRef}
                type="button"
                onClick={() => {
                    if (!canHover) {
                        if (!railVisible || railState === 'collapsed') {
                            openRail();
                        } else {
                            closeRailImmediately();
                        }
                        return;
                    }
                    toggleDrawerForPrimary(activeId);
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        closeRailImmediately();
                        return;
                    }
                    if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        openRail();
                        window.requestAnimationFrame(() => focusRailItem(0));
                        return;
                    }
                    if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        openRail();
                        window.requestAnimationFrame(() => focusRailItem(RIGHT_DRAWER_MODULES.length - 1));
                        return;
                    }
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggleDrawerForPrimary(activeId);
                    }
                }}
                data-state={drawerRightOpen ? 'active' : 'inactive'}
                title={`${drawerRightOpen ? 'Close' : 'Open'} right drawer`}
                aria-label={`${drawerRightOpen ? 'Close' : 'Open'} right drawer`}
                aria-haspopup="menu"
                aria-expanded={railVisible && railState === 'hovering'}
                className="ui-selectable w-10 h-10 ui-shape-pill flex items-center justify-center bg-[var(--semantic-color-bg-surface)]"
            >
                {activeIcon}
            </button>

            {railVisible && (
                <>
                    <div
                        aria-hidden
                        className="absolute right-0 top-full h-3 w-12 z-[59]"
                        onMouseEnter={() => {
                            if (canHover) openRail();
                        }}
                        onMouseLeave={() => {
                            if (canHover) closeRailSoon();
                        }}
                    />
                    <div
                        onMouseEnter={() => {
                            if (canHover) openRail();
                        }}
                        onMouseLeave={() => {
                            if (canHover) closeRailSoon();
                        }}
                        role="menu"
                        aria-label="Right drawer modules"
                        className={`absolute right-0 top-full translate-y-2 z-[60] w-10 p-1 rounded-[var(--primitive-radius-panel)] bg-[var(--semantic-color-bg-surface)] border border-[var(--semantic-color-border-default)] shadow-xl flex flex-col gap-1 transition-[opacity,transform] duration-[var(--motion-duration-normal)] ease-[var(--motion-easing-standard)] ${railState === 'hovering'
                            ? 'opacity-100 translate-y-2'
                            : 'opacity-0 translate-y-1 pointer-events-none'
                            }`}
                    >
                        {RIGHT_DRAWER_MODULES.map((item, index) => {
                        const isActive = activeId === item.id;
                        return (
                            <button
                                key={item.id}
                                ref={(el) => {
                                    railItemRefs.current[index] = el;
                                }}
                                type="button"
                                onClick={() => selectPrimary(item.id)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Escape') {
                                        event.preventDefault();
                                        closeRailImmediately();
                                        launcherRef.current?.focus();
                                        return;
                                    }
                                    if (event.key === 'ArrowDown') {
                                        event.preventDefault();
                                        focusRailItem(index + 1);
                                        return;
                                    }
                                    if (event.key === 'ArrowUp') {
                                        event.preventDefault();
                                        focusRailItem(index - 1);
                                        return;
                                    }
                                    if (event.key === 'Home') {
                                        event.preventDefault();
                                        focusRailItem(0);
                                        return;
                                    }
                                    if (event.key === 'End') {
                                        event.preventDefault();
                                        focusRailItem(RIGHT_DRAWER_MODULES.length - 1);
                                    }
                                }}
                                data-state={isActive ? 'active' : 'inactive'}
                                role="menuitemradio"
                                aria-checked={isActive}
                                className="ui-selectable w-8 h-8 mx-auto ui-shape-pill flex items-center justify-center"
                                title={item.label}
                                aria-label={item.label}
                            >
                                {item.icon}
                            </button>
                        );
                    })}
                    </div>
                </>
            )}
        </div>
    );
};

export default RightDrawerCapsule;
