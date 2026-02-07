import React from 'react';

type Props = {
    world?: React.ReactNode;
    topbar?: React.ReactNode;
    drawers?: React.ReactNode;
    overlays?: React.ReactNode;
    className?: string;
};

const cx = (...parts: Array<string | false | null | undefined>): string => (
    parts.filter(Boolean).join(' ')
);

export default function GraphViewShell({ world, topbar, drawers, overlays, className }: Props) {
    return (
        <div className={cx('relative w-full h-full overflow-hidden', className)} data-graphview-shell>
            <div className="absolute inset-0 z-[var(--z-canvas)]">
                {world}
            </div>

            <div className="absolute inset-x-0 top-0 z-[var(--z-ui)] pointer-events-none">
                <div className="pointer-events-auto">
                    {topbar}
                </div>
            </div>

            <div className="absolute inset-0 z-[var(--z-drawer)] pointer-events-none">
                {drawers}
            </div>

            <div className="absolute inset-0 z-[var(--z-overlay)] pointer-events-none">
                {overlays}
            </div>
        </div>
    );
}
