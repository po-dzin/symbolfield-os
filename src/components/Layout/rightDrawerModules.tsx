import type { ReactNode } from 'react';
import type { DrawerRightTab } from '../../core/state/StateEngine';

export type PrimaryDrawerModule = 'now' | 'props' | 'ai' | 'signals';

export interface RightDrawerModuleDefinition {
    id: PrimaryDrawerModule;
    label: string;
    primaryGroup: PrimaryDrawerModule;
    icon: ReactNode;
}

export const RIGHT_DRAWER_MODULES: RightDrawerModuleDefinition[] = [
    {
        id: 'now',
        label: 'Now',
        primaryGroup: 'now',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
            </svg>
        )
    },
    {
        id: 'props',
        label: 'Inspector',
        primaryGroup: 'props',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3.5" />
                <path d="M3 9V5a2 2 0 0 1 2-2h4" />
                <path d="M15 3h4a2 2 0 0 1 2 2v4" />
                <path d="M21 15v4a2 2 0 0 1-2 2h-4" />
                <path d="M9 21H5a2 2 0 0 1-2-2v-4" />
            </svg>
        )
    },
    {
        id: 'ai',
        label: 'AI',
        primaryGroup: 'ai',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
        )
    },
    {
        id: 'signals',
        label: 'Signals',
        primaryGroup: 'signals',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
        )
    }
];

export const mapDrawerRightTabToPrimary = (tab: DrawerRightTab | null): PrimaryDrawerModule => {
    if (tab === 'props' || tab === 'ai' || tab === 'signals') {
        return tab;
    }
    return 'now';
};

export const resolveDrawerTabForPrimary = (
    primary: PrimaryDrawerModule,
    current: DrawerRightTab | null
): DrawerRightTab => {
    if (primary === 'now') {
        return current === 'cycles' || current === 'chronos' ? current : 'now';
    }
    return primary;
};
