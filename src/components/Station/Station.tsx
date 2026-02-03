import React from 'react';
import TopBar from './TopBar';
import StartGates from './StartGates';
import RecentsRail from './RecentsRail';
import TemplatesRow from './TemplatesRow';
import OnboardingOverlay from './OnboardingOverlay';
import { loadOnboardingState } from '../../core/state/onboardingState';
import { spaceManager } from '../../core/state/SpaceManager';
import GlobalGraphOverview from './GlobalGraphOverview';
import AccountSettingsOverlay from './AccountSettingsOverlay';
import { eventBus } from '../../core/events/EventBus';
import StationAnalyticsDrawer, { type SpaceMetrics } from './StationAnalyticsDrawer';

const Station = () => {
    const [showOnboarding, setShowOnboarding] = React.useState(false);
    const [accountSettingsOpen, setAccountSettingsOpen] = React.useState(false);
    const [leftPinned, setLeftPinned] = React.useState(false);
    const [leftOpen, setLeftOpen] = React.useState(false);
    const [analyticsOpen, setAnalyticsOpen] = React.useState(false);
    const [focusedMetrics, setFocusedMetrics] = React.useState<SpaceMetrics | null>(null);
    const [selectedSpaceId, setSelectedSpaceId] = React.useState<string | null>(null);

    React.useEffect(() => {
        const unsub = eventBus.on('UI_SIGNAL', (e) => {
            if (e.payload.type === 'OPEN_ACCOUNT_SETTINGS') {
                setAccountSettingsOpen(true);
            }
        });
        return unsub;
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
                setAnalyticsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedSpaceId]);

    return (
        <div className="min-h-screen bg-transparent text-white/90 selection:bg-white/10 font-sans relative">
            {/* Global Graph Background */}
            <div className="absolute inset-0">
                <GlobalGraphOverview
                    className="absolute inset-0"
                    onSelectSpace={(metrics) => {
                        setFocusedMetrics(metrics);
                        setAnalyticsOpen(Boolean(metrics));
                        setSelectedSpaceId(metrics?.id ?? null);
                    }}
                    selectedSpaceId={selectedSpaceId}
                />
            </div>

            <div className="w-full h-screen flex flex-col relative z-10 pointer-events-none">

                <div className="pointer-events-auto">
                    <TopBar />
                </div>

                <div className="absolute left-8 top-20 z-10 pointer-events-none">
                    <div className="text-white/70 space-y-2">
                        <h1 className="text-lg font-light tracking-tight text-white/90">
                            Welcome back, <span className="text-white">Builder</span>
                        </h1>
                        <p className="text-white/50 text-xs">The field is quiet today.</p>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center relative">
                    {/* Left Drawer Trigger */}
                    <div
                        className="absolute left-0 top-0 h-full w-3 z-20 pointer-events-auto"
                        onMouseEnter={() => setLeftOpen(true)}
                    />

                    {/* Left Drawer: Recents + Templates */}
                    <div
                        className={`absolute left-0 top-0 h-full w-[var(--panel-width-md)] z-20 pointer-events-auto transition-transform duration-300 ease-out ${leftPinned || leftOpen ? 'translate-x-0' : '-translate-x-full'}`}
                        onMouseLeave={() => {
                            if (!leftPinned) setLeftOpen(false);
                        }}
                    >
                        <div className="h-full bg-black/35 backdrop-blur-xl border-r border-white/10 p-[var(--panel-padding)] flex flex-col gap-10">
                            <div className="flex items-center justify-between">
                                <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">Station</div>
                                <button
                                    onClick={() => setLeftPinned(prev => !prev)}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 ${leftPinned ? 'bg-white/15 text-white' : ''}`}
                                    title={leftPinned ? 'Unpin drawer' : 'Pin drawer'}
                                >
                                    📌
                                </button>
                            </div>
                            <div className="space-y-12">
                                <RecentsRail />
                                <TemplatesRow />
                            </div>
                        </div>
                    </div>

                    {/* Start Gates */}
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-8 px-6 pointer-events-auto">
                        <StartGates />
                    </div>
                </div>
            </div>

            <StationAnalyticsDrawer
                open={analyticsOpen}
                metrics={focusedMetrics}
                onClose={() => {
                    setAnalyticsOpen(false);
                    setSelectedSpaceId(null);
                }}
            />

            {/* Account Settings Overlay */}
            {accountSettingsOpen && (
                <AccountSettingsOverlay onClose={() => setAccountSettingsOpen(false)} />
            )}

            {/* Onboarding Overlay */}
            {showOnboarding && (
                <OnboardingOverlay onDismiss={() => setShowOnboarding(false)} />
            )}
        </div>
    );
};

export default Station;
