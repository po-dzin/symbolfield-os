/**
 * Station.test.tsx
 * Tests for the Home Station shell.
 */

import { render, screen } from '@testing-library/react';
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
        render(<Station />);
        expect(screen.getByText(/SymbolField/i)).toBeInTheDocument();
        // "Jump Back In" → "Recent", "Start from Template" → "Templates"
        expect(screen.getByText(/Recent/i)).toBeInTheDocument();
        expect(screen.getByText(/Templates/i)).toBeInTheDocument();
    });

    test('renders start gates actions', () => {
        render(<Station />);
        expect(screen.getByText(/New Space/i)).toBeInTheDocument();
        expect(screen.getByText(/New Portal/i)).toBeInTheDocument();
        expect(screen.getByText(/Import/i)).toBeInTheDocument();
    });

    test('renders templates', () => {
        render(<Station />);
        expect(screen.getByText(/Default Space/i)).toBeInTheDocument();
        // Only Default Space template now, no Ritual Room
    });
});
