import React from 'react';

interface ResizeHandleProps {
    side: 'left' | 'right';
    onResize: (width: number) => void;
    minWidth?: number;
    maxWidth?: number;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({
    side,
    onResize,
    minWidth = 240,
    maxWidth = 640
}) => {
    const isResizing = React.useRef(false);

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        document.body.style.cursor = 'col-resize';
        document.documentElement.classList.add('is-resizing');

        const startX = e.clientX;
        const initialWidth = side === 'left' ? e.clientX : window.innerWidth - e.clientX;

        let rafId: number | null = null;
        const handlePointerMove = (moveEvent: PointerEvent) => {
            if (!isResizing.current) return;
            if (rafId) return;

            rafId = window.requestAnimationFrame(() => {
                let newWidth: number;
                if (side === 'left') {
                    newWidth = moveEvent.clientX;
                } else {
                    newWidth = window.innerWidth - moveEvent.clientX;
                }

                const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
                onResize(clampedWidth);
                rafId = null;
            });
        };

        const handlePointerUp = () => {
            isResizing.current = false;
            document.body.style.cursor = '';
            document.documentElement.classList.remove('is-resizing');
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    return (
        <div
            className={`absolute top-0 bottom-0 w-3 cursor-col-resize z-50 group transition-colors ${side === 'left' ? 'right-0 -mr-1.5' : 'left-0 -ml-1.5'
                }`}
            onPointerDown={handlePointerDown}
        >
            <div
                className={`absolute top-0 bottom-0 w-full group-hover:bg-[var(--semantic-color-bg-surface-hover)]/30 transition-colors`}
            />
            <div
                className={`absolute top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-[var(--semantic-color-border-active)] opacity-0 group-hover:opacity-100 transition-all duration-300 ${side === 'left' ? 'right-1' : 'left-1'
                    }`}
            />
        </div>
    );
};

export default ResizeHandle;
