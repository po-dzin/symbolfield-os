import React, { useRef } from 'react';
import Draggable from 'react-draggable';
import { useWindowStore } from '../../store/windowStore';
import { useStateStore, TONES } from '../../store/stateStore';
import { useHarmonyStore } from '../../store/harmonyStore';
import { snapToGrid } from '../../engine/harmonics';
import { LAYERS } from '../../engine/layers';
import { clsx } from 'clsx';

const WindowFrame = ({
    id,
    title,
    glyph,
    children,
    initialPosition,
    position,
    isMinimized,
    isStatic,
    style
}) => {
    const { focusWindow, minimizeWindow, closeWindow, updateWindowPosition, toggleWindowPin, windows } = useWindowStore();
    const { toneId } = useStateStore();
    const { isHarmonicLockEnabled } = useHarmonyStore();
    const currentTone = TONES.find(t => t.id === toneId) || TONES[0];
    const nodeRef = useRef(null);

    const windowState = windows[id] || {};
    const isPinned = windowState.isPinned;

    // Use provided position, or initial, or default
    const activePosition = position || initialPosition || { x: 0, y: 0 };

    // Custom Drag Logic
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
    const [currentPosition, setCurrentPosition] = React.useState(activePosition);
    const positionRef = React.useRef(activePosition);

    // Sync with store updates if they happen externally (e.g. initial open)
    React.useEffect(() => {
        if (!isDragging) {
            setCurrentPosition(activePosition);
            positionRef.current = activePosition;
        }
    }, [activePosition.x, activePosition.y, isDragging]);

    const handleMouseDown = (e) => {
        if (isPinned || isStatic) return;
        // Only allow drag from handle
        if (!e.target.closest('.window-handle')) return;

        e.preventDefault(); // Prevent text selection
        setIsDragging(true);

        // Calculate offset from mouse to window top-left
        const rect = nodeRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });

        focusWindow(id);
    };

    React.useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging || !nodeRef.current) return;

            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;

            // Apply Harmonic Lock Snapping
            const finalX = isHarmonicLockEnabled ? snapToGrid(newX) : newX;
            const finalY = isHarmonicLockEnabled ? snapToGrid(newY) : newY;

            const newPos = { x: finalX, y: finalY };

            // Direct DOM update for performance (bypassing React render cycle)
            nodeRef.current.style.left = `${finalX}px`;
            nodeRef.current.style.top = `${finalY}px`;

            positionRef.current = newPos; // Keep ref updated
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                // Sync with store (this will trigger re-render)
                updateWindowPosition(id, positionRef.current);
                // Sync local state to ensure consistency after store update
                setCurrentPosition(positionRef.current);
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset.x, dragOffset.y, id, updateWindowPosition]);

    const content = (
        <div
            ref={nodeRef}
            className={clsx(
                "window-frame pointer-events-auto absolute flex flex-col bg-os-glass-bg/90 backdrop-blur-2xl rounded-lg overflow-hidden",
                !isDragging && "transition-all duration-200 ease-in-out",
                isMinimized ? "w-0 h-0 opacity-0 pointer-events-none" : "w-[500px] h-[400px]"
            )}
            style={{
                zIndex: LAYERS.WINDOW_BASE, // Default base
                left: currentPosition.x,
                top: currentPosition.y,
                '--glow-color': `${currentTone.color}60`,
                borderColor: `${currentTone.color}60`,
                backgroundColor: `${currentTone.color}02`,
                animation: 'pulse-glow-smooth 8s ease-in-out infinite',
                borderWidth: '1px',
                borderStyle: 'solid',
                boxShadow: `0 0 20px ${currentTone.color}40, 0 4px 12px rgba(0,0,0,0.3)`,
                ...style
            }}
            onMouseDown={handleMouseDown}
            onClick={() => focusWindow(id)}
        >
            {/* Header / Handle */}
            <div className={`window-handle h-10 flex items-center justify-between px-4 border-b border-os-glass-border/50 select-none ${isPinned ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}>
                <div className="flex items-center gap-2">
                    <span className="text-os-cyan">
                        {glyph === '𓂀' ? (
                            <span className="block text-lg -mt-0.5 transform scale-90 font-bold" style={{ WebkitTextStroke: '0.5px currentColor' }}>𓂀</span>
                        ) : (
                            glyph
                        )}
                    </span>
                    <span className="text-xs font-medium tracking-wider text-os-text-primary">{title}</span>
                </div>

                {/* Controls */}
                {!isStatic && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); minimizeWindow(id); }}
                            className="w-3 h-3 rounded-full bg-yellow-500 flex items-center justify-center transition-all group overflow-hidden"
                            title="Minimize"
                        >
                            <div className="w-2 h-0.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); closeWindow(id); }}
                            className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center transition-all group overflow-hidden"
                            title="Close"
                        >
                            <svg width="6" height="6" viewBox="0 0 8 8" fill="none" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <path d="M1 1L7 7M7 1L1 7" stroke="rgba(0,0,0,0.5)" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            {!isMinimized && (
                <div className="flex-1 overflow-auto custom-scrollbar relative p-6">
                    {children}
                </div>
            )}
        </div>
    );

    return content;
};

export default WindowFrame;
