/**
 * onboardingState.ts
 * Manages onboarding progress and persistence
 */

const ONBOARDING_STORAGE_KEY = 'sf_onboarding_state';

export interface OnboardingState {
    isCompleted: boolean;
    hasSeenWelcome: boolean;
    playgroundCreated: boolean;
    completedSteps: string[];
    completedAt?: number;
}

const DEFAULT_STATE: OnboardingState = {
    isCompleted: false,
    hasSeenWelcome: false,
    playgroundCreated: false,
    completedSteps: []
};

/**
 * Load onboarding state from localStorage
 */
export function loadOnboardingState(): OnboardingState {
    try {
        const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (!stored) return { ...DEFAULT_STATE };

        const parsed = JSON.parse(stored);
        if (parsed.sandboxCreated !== undefined && parsed.playgroundCreated === undefined) {
            parsed.playgroundCreated = parsed.sandboxCreated;
            delete parsed.sandboxCreated;
        }
        return {
            ...DEFAULT_STATE,
            ...parsed
        };
    } catch (error) {
        console.warn('Failed to load onboarding state:', error);
        return { ...DEFAULT_STATE };
    }
}

/**
 * Save onboarding state to localStorage
 */
export function saveOnboardingState(state: OnboardingState): void {
    try {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Failed to save onboarding state:', error);
    }
}

/**
 * Mark onboarding as completed
 */
export function completeOnboarding(): OnboardingState {
    const state: OnboardingState = {
        ...loadOnboardingState(),
        isCompleted: true,
        completedAt: Date.now()
    };
    saveOnboardingState(state);
    return state;
}

/**
 * Mark welcome overlay as seen
 */
export function markWelcomeSeen(): OnboardingState {
    const state: OnboardingState = {
        ...loadOnboardingState(),
        hasSeenWelcome: true
    };
    saveOnboardingState(state);
    return state;
}

/**
 * Mark playground as created
 */
export function markPlaygroundCreated(): OnboardingState {
    const state: OnboardingState = {
        ...loadOnboardingState(),
        playgroundCreated: true
    };
    saveOnboardingState(state);
    return state;
}

/**
 * Reset onboarding state (for testing)
 */
export function resetOnboardingState(): void {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
}

// Expose for devtools
if (typeof window !== 'undefined') {
    (window as any).resetOnboarding = resetOnboardingState;
    (window as any).resetAccount = resetAccount;
}

/**
 * Hard Reset: Wipes all data to simulate fresh install
 */
export function resetAccount(): void {
    localStorage.clear();
    window.location.reload();
}
