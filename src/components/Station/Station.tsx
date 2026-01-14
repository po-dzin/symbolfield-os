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
import AccountSettingsOverlay from './AccountSettingsOverlay';
import { eventBus } from '../../core/events/EventBus';

const Station = () => {
    const [showOnboarding, setShowOnboarding] = React.useState(false);
    const [accountSettingsOpen, setAccountSettingsOpen] = React.useState(false);

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

    return (
        <div className="min-h-screen bg-transparent text-white/90 selection:bg-white/10 font-sans relative">
            {/* Global Graph Background */}
            <div className="absolute inset-0">
                <GlobalGraphOverview className="absolute inset-0" />
            </div>

            <div className="w-full h-screen flex flex-col relative z-10 pointer-events-none">

                <div className="pointer-events-auto">
                    <TopBar />
                </div>

                <div className="flex-1 flex items-center justify-center relative">
                    {/* Left Rail: Recent + Templates */}
                    <div className="absolute left-8 top-1/2 -translate-y-1/2 space-y-12 w-64 z-10 pointer-events-auto">
                        <RecentsRail />
                        <TemplatesRow />
                    </div>

                    {/* Start Gates */}
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-8 px-6 pointer-events-auto">
                        <StartGates />
                    </div>

                    {/* Right Rail: Info */}
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 w-64 z-10 pointer-events-auto">
                        <div className="text-white/70 space-y-2">
                            <h1 className="text-lg font-light tracking-tight text-white/90">
                                Welcome back, <span className="text-white">Builder</span>
                            </h1>
                            <p className="text-white/50 text-xs">The field is quiet today.</p>
                        </div>
                    </div>
                </div>
            </div>

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
