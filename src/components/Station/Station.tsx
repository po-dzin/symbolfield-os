import React from 'react';
import { useAppStore } from '../../store/useAppStore';

import StartGates from './StartGates';
import RecentsRail from './RecentsRail';
import TemplatesRow from './TemplatesRow';
import CollapsibleSection from './CollapsibleSection';
import OnboardingOverlay from './OnboardingOverlay';
import { loadOnboardingState } from '../../core/state/onboardingState';
import { spaceManager } from '../../core/state/SpaceManager';
import GlobalGraphOverview from './GlobalGraphOverview';
import { eventBus, EVENTS } from '../../core/events/EventBus';
import { type SpaceMetrics } from '../Modules/Signals/LegacyAnalytics';
import GraphViewShell from '../GraphView/GraphViewShell';
// import AccountSettingsOverlay from './AccountSettingsOverlay'; // Moved to Shell
import ResizeHandle from '../Drawers/ResizeHandle';

const Station = () => {
    const [showOnboarding, setShowOnboarding] = React.useState(false);
    const leftPinned = useAppStore(state => state.drawerLeftPinned);
    const leftOpen = useAppStore(state => state.drawerLeftOpen);
    const setDrawerOpen = useAppStore(state => state.setDrawerOpen);
    const setDrawerPinned = useAppStore(state => state.setDrawerPinned);
    const setDrawerRightTab = useAppStore(state => state.setDrawerRightTab);
    const rightOpen = useAppStore(state => state.drawerRightOpen);
    const [selectedSpaceId, setSelectedSpaceId] = React.useState<string | null>(null);
    // const [showAccountSettings, setShowAccountSettings] = React.useState(false); // Global now
    const [focusedMetrics, setFocusedMetrics] = React.useState<SpaceMetrics | null>(null);
    const leftWidthPx = useAppStore(state => state.drawerLeftWidthPx);
    const setDrawerWidthPx = useAppStore(state => state.setDrawerWidthPx);

    React.useEffect(() => {
        const unsub = eventBus.on(EVENTS.SPACE_CHANGED, () => {
            setFocusedMetrics(null);
            setSelectedSpaceId(null);
            setDrawerRightTab(null);
            setDrawerOpen('right', false);
        });
        return unsub;
    }, [setDrawerRightTab, setDrawerOpen]);

    React.useEffect(() => {
        spaceManager.ensureOnboardingSpaces();
        // Check onboarding state on mount
        const onboardingState = loadOnboardingState();
        if (!onboardingState.isCompleted && !onboardingState.hasSeenWelcome) {
            setShowOnboarding(true);
        }
    }, []);

    React.useEffect(() => {
        spaceManager.ensureOnboardingSpaces();
        // Check onboarding state on mount
        const onboardingState = loadOnboardingState();
        if (!onboardingState.isCompleted && !onboardingState.hasSeenWelcome) {
            setShowOnboarding(true);
        }
    }, []);

    // REMOVED: Local Account Settings signal listener - now handled globally in Shell

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }
            if (!selectedSpaceId) return;
            if (event.key === 'Enter') {
                event.preventDefault();
                spaceManager.loadSpace(selectedSpaceId);
                return;
            }
            if (event.key === 'Backspace' || event.key === 'Delete') {
                event.preventDefault();
                const meta = spaceManager.getSpaceMeta(selectedSpaceId);
                const name = meta?.name ?? 'this space';
                const confirmed = window.confirm(`Move “${name}” to trash? It will be kept for 30 days.`);
                if (!confirmed) return;
                spaceManager.softDeleteSpace(selectedSpaceId);
                setSelectedSpaceId(null);
                setFocusedMetrics(null);
                setDrawerRightTab(null);
                setDrawerOpen('right', false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedSpaceId, setDrawerOpen, setDrawerRightTab]);

    return (
        <div className="min-h-screen h-screen w-full bg-transparent text-[var(--semantic-color-text-primary)] selection:bg-[var(--semantic-color-text-primary)]/10 font-sans relative">
            <GraphViewShell
                world={(
                    <GlobalGraphOverview
                        className="absolute inset-0"
                        onSelectSpace={(metrics) => {
                            setFocusedMetrics(metrics);
                            if (metrics) {
                                setDrawerRightTab('signals');
                            }
                            setDrawerOpen('right', Boolean(metrics));
                            setSelectedSpaceId(metrics?.id ?? null);
                        }}
                        selectedSpaceId={selectedSpaceId}
                    />
                )}
                topbar={null}
                drawers={(
                    <>
                        <div
                            className="absolute left-0 top-0 h-full w-3 z-20 pointer-events-auto"
                            onMouseEnter={() => setDrawerOpen('left', true)}
                        />
                        <div
                            className={`absolute left-0 top-0 h-full z-20 pointer-events-auto transition-transform duration-300 ease-out ${leftPinned || leftOpen ? 'translate-x-0' : '-translate-x-full'}`}
                            style={{ width: `${leftWidthPx}px` }}
                            onMouseLeave={() => {
                                if (!leftPinned) setDrawerOpen('left', false);
                            }}
                        >
                            <div className="glass-base h-full border-y-0 border-l-0 border-r border-[var(--semantic-color-border-default)] pt-[var(--component-topbar-height)] p-[var(--component-panel-padding)] flex flex-col gap-6">
                                <div className="flex items-start justify-between pb-6 pt-6 px-1">
                                    <div className="text-[var(--semantic-color-text-secondary)] space-y-2">
                                        <div className="text-sm font-medium text-[var(--semantic-color-text-primary)]">
                                            Welcome back, Builder.
                                        </div>
                                        <div className="text-xs opacity-60">The field is quiet today.</div>
                                    </div>
                                    <button
                                        onClick={() => setDrawerPinned('left', !leftPinned)}
                                        className={`w-6 h-6 rounded-md flex items-center justify-center text-[var(--semantic-color-text-muted)] hover:text-[var(--semantic-color-text-primary)] hover:bg-[var(--semantic-color-bg-surface-hover)] transition-all ${leftPinned ? 'text-[var(--semantic-color-text-primary)] bg-[var(--semantic-color-bg-surface-hover)]' : ''}`}
                                        title={leftPinned ? 'Unpin drawer' : 'Pin drawer'}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="17" x2="12" y2="22"></line>
                                            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.74V6a3 3 0 0 0-6 0v4.74a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"></path>
                                        </svg>
                                    </button>
                                </div>
                                <div className="space-y-6 text-[var(--semantic-color-text-primary)] overflow-y-auto overflow-x-hidden flex-1 no-scrollbar pb-10">
                                    <CollapsibleSection title="Favorites" count={0}>
                                        <div className="text-xs text-[var(--semantic-color-text-muted)] italic py-2 pl-2">No favorites yet</div>
                                    </CollapsibleSection>

                                    <CollapsibleSection title="Recent" defaultOpen>
                                        <RecentsRail selectedSpaceId={selectedSpaceId} />
                                    </CollapsibleSection>

                                    <CollapsibleSection title="Templates">
                                        <TemplatesRow />
                                    </CollapsibleSection>

                                    <CollapsibleSection title="Trash" defaultOpen={false} count={0}>
                                        <div className="text-xs text-[var(--semantic-color-text-muted)] italic py-2 pl-2">Trash is empty</div>
                                    </CollapsibleSection>
                                </div>
                            </div>
                            {/* <ResizeHandle side="left" onResize={(w: number) => setDrawerWidthPx('left', w)} /> */}
                        </div>
                    </>
                )}
                overlays={(
                    <>
                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-8 px-6 pointer-events-auto">
                            <StartGates />
                        </div>
                        {showOnboarding && (
                            <div className="pointer-events-auto">
                                <OnboardingOverlay onDismiss={() => setShowOnboarding(false)} />
                            </div>
                        )}
                    </>
                )}
            />
        </div>
    );
};

export default Station;
