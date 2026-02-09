/**
 * OnboardingOverlay.tsx
 * First-run overlay on Station with "Start in Playground" CTA
 * Based on UI_ONBOARDING_SANDBOX_SoT_v0.5 spec
 */

import React from 'react';
import { completeOnboarding, markWelcomeSeen } from '../../core/state/onboardingState';

interface OnboardingOverlayProps {
    onDismiss: () => void;
}

const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ onDismiss }) => {
    // We don't need setSpace anymore, use spaceManager directly

    const handleStartPlayground = () => {
        import('../../core/state/SpaceManager').then(({ spaceManager }) => {
            spaceManager.ensureOnboardingSpaces();
            spaceManager.loadSpace('playground');
            markWelcomeSeen();
            onDismiss();
        });
    };

    const handleCreateSpace = () => {
        import('../../core/state/SpaceManager').then(({ spaceManager }) => {
            const id = spaceManager.createSpace(); // Untitled
            spaceManager.loadSpace(id);
            markWelcomeSeen();
            onDismiss();
        });
    };

    const handleSkip = () => {
        completeOnboarding();
        onDismiss();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--primitive-color-n0-deepest)]/60 backdrop-blur-sm animate-fade-in">
            <div className="relative max-w-2xl mx-auto px-8">
                {/* Main Card */}
                <div className="glass-panel p-12 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-[var(--primitive-radius-pill)] border-2 border-[var(--semantic-color-border-default)] flex items-center justify-center">
                            <span className="text-3xl text-[var(--semantic-color-text-secondary)]">◉</span>
                        </div>
                        <h1 className="text-2xl font-light text-[var(--semantic-color-text-primary)] mb-3 tracking-tight">
                            Welcome to SymbolField
                        </h1>
                        <p className="text-[var(--semantic-color-text-muted)] text-sm leading-relaxed">
                            Your space for networked thinking.<br />
                            Field is space. Node is interior. NOW is depth.
                        </p>
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-col gap-4">
                        {/* Primary: Start in Playground */}
                        <button
                            onClick={handleStartPlayground}
                            className="group w-full px-6 py-4 rounded-[var(--primitive-radius-card)] bg-[var(--semantic-color-text-primary)]/10 border border-[var(--semantic-color-text-primary)]/20 hover:bg-[var(--semantic-color-text-primary)]/15 hover:border-[var(--semantic-color-text-primary)]/30 focus-visible:ring-2 focus-visible:ring-[var(--semantic-color-text-primary)]/50 focus-visible:outline-none transition-all duration-300"
                        >
                            <div className="flex items-center justify-between">
                                <div className="text-left">
                                    <div className="text-[var(--semantic-color-text-primary)] font-medium mb-1">Start in Playground</div>
                                    <div className="text-[var(--semantic-color-text-muted)] text-xs">Learn the basics with guided examples</div>
                                </div>
                                <span className="text-[var(--semantic-color-text-secondary)] group-hover:text-[var(--semantic-color-text-primary)] transition-colors text-xl">→</span>
                            </div>
                        </button>

                        {/* Secondary: Create Space */}
                        <button
                            onClick={handleCreateSpace}
                            className="group w-full px-6 py-3 rounded-[var(--primitive-radius-card)] bg-transparent border border-[var(--semantic-color-border-default)] hover:bg-[var(--semantic-color-text-primary)]/5 hover:border-[var(--semantic-color-text-secondary)] focus-visible:ring-2 focus-visible:ring-[var(--semantic-color-text-secondary)]/30 focus-visible:outline-none transition-all"
                        >
                            <div className="text-[var(--semantic-color-text-secondary)] group-hover:text-[var(--semantic-color-text-primary)] text-sm transition-colors">
                                Create My First Space
                            </div>
                        </button>
                    </div>

                    {/* Skip */}
                    <button
                        onClick={handleSkip}
                        className="mt-8 w-full text-[var(--semantic-color-text-muted)] hover:text-[var(--semantic-color-text-secondary)] text-xs uppercase tracking-[0.3em] transition-colors"
                    >
                        Skip for now
                    </button>
                </div>

                {/* Keyboard Hint */}
                <div className="mt-6 text-center">
                    <p className="text-[var(--semantic-color-text-muted)] text-[10px] tracking-wider opacity-60">
                        <kbd className="px-2 py-1 rounded bg-[var(--semantic-color-text-primary)]/5 border border-[var(--semantic-color-border-default)] font-mono">SPACE</kbd>
                        {' '}to focus · {' '}
                        <kbd className="px-2 py-1 rounded bg-[var(--semantic-color-text-primary)]/5 border border-[var(--semantic-color-border-default)] font-mono">ENTER</kbd>
                        {' '}to enter
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OnboardingOverlay;
