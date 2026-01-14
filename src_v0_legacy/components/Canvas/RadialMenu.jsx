import React, { useEffect } from 'react';
import { useGraphStore } from '../../store/graphStore';

const RadialMenu = ({ nodeId, position, onClose }) => {
    const { cloneNode, deleteNode, nodes } = useGraphStore();
    const node = nodes.find(n => n.id === nodeId);
    const isCore = node?.entity.type === 'core';

    const handleCopy = () => {
        cloneNode(nodeId);
        console.log('📋 Node copied');
        onClose();
    };

    const handleConvert = () => {
        // Future: Show conversion menu
        console.log('🔄 Convert (not implemented yet)');
        onClose();
    };

    const handleDelete = () => {
        if (isCore) {
            console.warn('⚠️ Cannot delete Core node');
            return;
        }
        deleteNode(nodeId);
        onClose();
    };

    // Close menu on any click anywhere
    useEffect(() => {
        const handleGlobalClick = (e) => {
            // Check if click is outside menu buttons
            if (!e.target.closest('button[data-radial-menu]')) {
                onClose();
            }
        };

        // Delay to avoid immediate closure on menu open
        const timer = setTimeout(() => {
            // Use capture phase to intercept clicks BEFORE they reach buttons
            document.addEventListener('click', handleGlobalClick, { capture: true });
        }, 100);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('click', handleGlobalClick, { capture: true });
        };
    }, [onClose]);

    // Radial menu positions (equilateral triangle, vertex up)
    const buttonRadius = 60;
    const buttons = [
        {
            label: 'Delete',
            angle: 150, // ↙ Bottom-left
            icon: '🗑',
            action: handleDelete,
            disabled: isCore
        },
        {
            label: 'Copy',
            angle: 30, // ↘ Bottom-right
            icon: '📋',
            action: handleCopy,
            disabled: isCore // Cannot copy Core
        },
        {
            label: 'Convert',
            angle: -90, // ↑ Top (vertex)
            icon: '🔄',
            action: handleConvert,
            disabled: isCore // Cannot convert Core
        }
    ];

    return (
        <>
            {/* Backdrop to catch clicks outside - must be highest z-index */}
            <div
                className="fixed inset-0 z-[9998]"
                onClick={onClose}
                style={{ background: 'transparent' }}
            />

            {/* Radial Menu Container */}
            <div
                className="absolute z-[9999] pointer-events-none"
                style={{
                    left: position.x,
                    top: position.y,
                    transform: 'translate(-50%, -50%)'
                }}
            >
                {/* Center indicator */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white/30 rounded-full" />
                </div>

                {/* Radial buttons */}
                {buttons.map((btn, idx) => {
                    const angleRad = (btn.angle * Math.PI) / 180;
                    const x = Math.cos(angleRad) * buttonRadius;
                    const y = Math.sin(angleRad) * buttonRadius;

                    return (
                        <button
                            key={idx}
                            onClick={btn.action}
                            disabled={btn.disabled}
                            data-radial-menu="true"
                            className={`
                                absolute flex items-center justify-center pointer-events-auto
                                w-12 h-12 rounded-full
                                backdrop-blur-md border
                                transition-all duration-200
                                ${btn.disabled
                                    ? 'bg-black/50 border-white/10 cursor-not-allowed opacity-30'
                                    : 'bg-white/10 border-white/30 hover:bg-white/20 hover:scale-110 hover:border-white/50'
                                }
                            `}
                            style={{
                                left: '50%',
                                top: '50%',
                                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
                            }}
                            title={btn.label}
                        >
                            <span className="text-xl">{btn.icon}</span>
                        </button>
                    );
                })}

                {/* Connection lines */}
                <svg
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        width: buttonRadius * 2 + 48,
                        height: buttonRadius * 2 + 48,
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    {buttons.map((btn, idx) => {
                        const angleRad = (btn.angle * Math.PI) / 180;
                        const x = Math.cos(angleRad) * buttonRadius;
                        const y = Math.sin(angleRad) * buttonRadius;
                        const centerX = buttonRadius + 24;
                        const centerY = buttonRadius + 24;

                        return (
                            <line
                                key={idx}
                                x1={centerX}
                                y1={centerY}
                                x2={centerX + x}
                                y2={centerY + y}
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="1"
                                strokeDasharray="2,2"
                            />
                        );
                    })}
                </svg>
            </div>
        </>
    );
};

export default RadialMenu;
