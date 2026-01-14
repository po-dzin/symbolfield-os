
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import React from 'react';

// Mock ResizeObserver (NavRail/Canvas might use it)
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

describe('Smoke Tests: App Integration', () => {

    it('renders MainLayout without crashing', () => {
        render(<App />);
        // Check for key UI elements
        expect(screen.getByText(/VIEW/i)).toBeInTheDocument(); // "GRAPH VIEW" or similar in NavRail
    });

    it('navigates to Log tab when clicked', async () => {
        render(<App />);

        // Find Log button in NavRail (title="Log")
        const logButton = screen.getByTitle('Log');
        fireEvent.click(logButton);

        // Check if "Log Content Area" or System window appears
        // The placeholder in NavRail says "{activeTab} Content Area"
        // Also MainLayout renders WindowFrame for 'Log'

        // We can check if the WindowFrame with title "System Log" appears
        // Note: WindowFrame might be absolutely positioned.
        expect(screen.getByText('System Log')).toBeInTheDocument();
        expect(screen.getByText('SYSTEM ONLINE // V.0.3.0')).toBeInTheDocument();
    });

});
