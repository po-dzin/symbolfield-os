import React from 'react';
import { useAppStore } from '../../store/useAppStore';

const DrawerToggle: React.FC = () => {
    const drawerRightOpen = useAppStore(state => state.drawerRightOpen);
    const setDrawerOpen = useAppStore(state => state.setDrawerOpen);

    const handleToggle = () => {
        setDrawerOpen('right', !drawerRightOpen);
    };

    return (
        <button
            onClick={handleToggle}
            className="w-[var(--component-hit-icon-min)] h-[var(--component-hit-icon-min)] rounded-[var(--primitive-radius-pill)] bg-[var(--semantic-color-bg-surface)] border border-[var(--semantic-color-border-default)] hover:border-[var(--semantic-color-text-secondary)] flex items-center justify-center text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] transition-all"
            title={`${drawerRightOpen ? 'Close' : 'Open'} panel (Cmd+\\)`}
            aria-label={`${drawerRightOpen ? 'Close' : 'Open'} panel`}
        >
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: drawerRightOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}
            >
                {/* Panel icon with chevron */}
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M15 3v18" />
                {!drawerRightOpen && <path d="M12 8l-3 4 3 4" />}
            </svg>
        </button>
    );
};

export default DrawerToggle;
