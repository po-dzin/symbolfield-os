import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import TopBar from './TopBar';
import StartGates from './StartGates';
import RecentsRail from './RecentsRail';
import TemplatesRow from './TemplatesRow';
import OnboardingOverlay from './OnboardingOverlay';
import { loadOnboardingState } from '../../core/state/onboardingState';
import { spaceManager } from '../../core/state/SpaceManager';
import GlobalGraphOverview from './GlobalGraphOverview';
import { eventBus, EVENTS } from '../../core/events/EventBus';
import StationAnalyticsDrawer, { type SpaceMetrics } from './StationAnalyticsDrawer';
import GraphViewShell from '../GraphView/GraphViewShell';
import AccountSettingsOverlay from './AccountSettingsOverlay';

const Station = () => {
    const [showOnboarding, setShowOnboarding] = React.useState(false);
    const leftPinned = useAppStore(state => state.drawerLeftPinned);
    const leftOpen = useAppStore(state => state.drawerLeftOpen);
    const setDrawerOpen = useAppStore(state => state.setDrawerOpen);
    const setDrawerPinned = useAppStore(state => state.setDrawerPinned);
    const setDrawerRightTab = useAppStore(state => state.setDrawerRightTab);
    const rightOpen = useAppStore(state => state.drawerRightOpen);
    const rightTab = useAppStore(state => state.drawerRightTab);
    const [focusedMetrics, setFocusedMetrics] = React.useState<SpaceMetrics | null>(null);
    const [selectedSpaceId, setSelectedSpaceId] = React.useState<string | null>(null);
    const [showAccountSettings, setShowAccountSettings] = React.useState(false);

    React.useEffect(() => {
        const unsub = eventBus.on(EVENTS.SPACE_CHANGED, () => {
            setFocusedMetrics(null);
            setSelectedSpaceId(null);
            setDrawerRightTab(null);
            setDrawerOpen('right', false);
        });
        return () => unsub();
    }, []);

    React.useEffect(() => {
        spaceManager.ensureOnboardingSpaces();
        // Check onboarding state on mount
        const onboardingState = loadOnboardingState();
        if (!onboardingState.isCompleted && !onboardingState.hasSeenWelcome) {
            setShowOnboarding(true);
        }
    }, []);

    React.useEffect(() => {
        const unsub = eventBus.on('UI_SIGNAL', (event) => {
            const signalType = event.payload?.type;
            if (signalType !== 'OPEN_ACCOUNT_SETTINGS') return;
            setShowAccountSettings(true);
        });
        return () => unsub();
    }, []);

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
    }, [selectedSpaceId]);

    return (
        <div className="min-h-screen h-screen w-full bg-transparent text-[var(--semantic-color-text-primary)] selection:bg-[var(--semantic-color-text-primary)]/10 font-sans relative">
            <GraphViewShell
                world={(
                    <GlobalGraphOverview
                        className="absolute inset-0"
                        onSelectSpace={(metrics) => {
                            setFocusedMetrics(metrics);
                            if (metrics) {
                                setDrawerRightTab('analytics');
                            }
                            setDrawerOpen('right', Boolean(metrics));
                            setSelectedSpaceId(metrics?.id ?? null);
                        }}
                        selectedSpaceId={selectedSpaceId}
                    />
                )}
                topbar={<TopBar />}
                drawers={(
                    <>
                        <div
                            className="absolute left-0 top-0 h-full w-3 z-20 pointer-events-auto"
                            onMouseEnter={() => setDrawerOpen('left', true)}
                        />
                        <div
                            className={`absolute left-0 top-0 h-full w-[var(--panel-width-md)] z-20 pointer-events-auto transition-transform duration-300 ease-out ${leftPinned || leftOpen ? 'translate-x-0' : '-translate-x-full'}`}
                            onMouseLeave={() => {
                                if (!leftPinned) setDrawerOpen('left', false);
                            }}
                        >
                            <div className="h-full bg-[var(--semantic-color-bg-surface)]/35 backdrop-blur-xl border-r border-[var(--semantic-color-border-default)] p-[var(--panel-padding)] flex flex-col gap-10">
                                <div className="flex items-center justify-between">
                                    <div className="text-[var(--semantic-color-text-secondary)] space-y-1">
                                        <div className="text-sm">
                                            Welcome back, <span className="text-[var(--semantic-color-text-primary)] font-medium">Builder</span>
                                        </div>
                                        <div className="text-xs text-[var(--semantic-color-text-muted)]">The field is quiet today.</div>
                                    </div>
                                    <button
                                        onClick={() => setDrawerPinned('left', !leftPinned)}
                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] hover:bg-[var(--semantic-color-text-primary)]/10 transition-colors ${leftPinned ? 'bg-[var(--semantic-color-text-primary)]/15 text-[var(--semantic-color-text-primary)]' : ''}`}
                                        title={leftPinned ? 'Unpin drawer' : 'Pin drawer'}
                                    >
                                        📌
                                    </button>
                                </div>
                                <div className="space-y-12 text-[var(--semantic-color-text-primary)]">
                                    <RecentsRail />
                                    <TemplatesRow />
                                </div>
                            </div>
                        </div>
                        <StationAnalyticsDrawer
                            open={rightOpen && rightTab === 'analytics'}
                            metrics={focusedMetrics}
                            onClose={() => {
                                setDrawerOpen('right', false);
                                setDrawerRightTab(null);
                                setSelectedSpaceId(null);
                            }}
                        />
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
                        {showAccountSettings && (
                            <div className="pointer-events-auto">
                                <AccountSettingsOverlay onClose={() => setShowAccountSettings(false)} />
                            </div>
                        )}
                    </>
                )}
            />
        </div>
    );
};

export default Station;
