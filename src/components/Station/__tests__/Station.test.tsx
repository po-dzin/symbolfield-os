/**
 * Station.test.tsx
 * Tests for the Home Station shell.
 */

import { render } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import Station from '../Station';

// Mock the onboarding state to prevent overlay from showing in tests
vi.mock('../../../core/state/onboardingState', () => ({
    loadOnboardingState: () => ({
        isCompleted: true,
        hasSeenWelcome: true,
        playgroundCreated: true,
        completedSteps: []
    }),
    markWelcomeSeen: vi.fn(),
    completeOnboarding: vi.fn()
}));

describe('Station (Home)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: vi.fn(() => null),
                setItem: vi.fn(),
                removeItem: vi.fn(),
                clear: vi.fn(),
            },
            writable: true
        });
    });

    test('renders main layout zones', () => {
        const view = render(<Station />);
        expect(view.getByText(/SymbolField/i)).toBeInTheDocument();
        // "Jump Back In" → "Recent", "Start from Template" → "Templates"
        expect(view.getByText(/Recent/i)).toBeInTheDocument();
        expect(view.getByText(/Templates/i)).toBeInTheDocument();
    });

    test('renders start gates actions', () => {
        const view = render(<Station />);
        expect(view.getByText(/New Space/i)).toBeInTheDocument();
        expect(view.getByText(/New Portal/i)).toBeInTheDocument();
        expect(view.getByText(/Import/i)).toBeInTheDocument();
    });

    test('renders templates', () => {
        const view = render(<Station />);
        expect(view.getByText(/Default Space/i)).toBeInTheDocument();
        // Only Default Space template now, no Ritual Room
    });
});
