import React, { useEffect } from 'react';
import { useGraphStore } from '../../store/graphStore';
import { useOsShellStore } from '../../store/osShellStore';
import { useStateStore } from '../../store/stateStore';
import NOWHeader from './NOWHeader';
import NodeMetadata from './NodeMetadata';
import NOWEditor from './NOWEditor';

const NOWView = () => {
    const { nodes } = useGraphStore(); // Keep nodes from graph store
    const { activeNodeId } = useOsShellStore(); // Get active ID from OS Shell
    const { mode } = useStateStore();

    // Find the active node data
    const activeNode = nodes.find(n => n.id === activeNodeId);

    if (!activeNode) {
        return (
            <div className="w-full h-full flex items-center justify-center text-white/40">
                Running without context...
            </div>
        );
    }

    const isLuma = mode === 'LUMA';
    const getNowBackgroundStyle = () => {
        switch (mode) {
            case 'DEEP':
                return 'bg-[#050505] text-white';
            case 'FLOW':
                return 'bg-gradient-to-br from-[#1c1d21] via-[#151619] to-[#0e0f11] text-white';
            case 'LUMA':
                return 'bg-[#e9ddc6] text-[#2A2620]';
            default:
                return 'bg-[#050505] text-white';
        }
    };
    const pulseClass = isLuma
        ? 'from-transparent via-[#0a6d6d]/35 to-transparent'
        : 'from-transparent via-[#00FFFF]/20 to-transparent';

    return (
        <div className={`w-full h-full flex flex-col overflow-hidden relative ${getNowBackgroundStyle()}`}>
            {/* 1. Header */}
            <NOWHeader node={activeNode} />

            {/* 2. Main Scrollable Content */}
            <div
                className="flex-1 overflow-y-auto overflow-x-hidden"
                style={{
                    backgroundImage: isLuma
                        ? 'radial-gradient(circle, rgba(120, 110, 95, 0.2) 1px, transparent 1px)'
                        : 'radial-gradient(circle, rgba(90, 86, 84, 0.35) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            >
                <div className="max-w-4xl mx-auto w-full p-8 flex flex-col gap-10">
                    
                    {/* Node Metadata Section */}
                    <NodeMetadata node={activeNode} />

                    {/* Placeholder: Pulse Strip */}
                    <div className={`w-full h-2 rounded bg-gradient-to-r ${pulseClass}`} />

                    {/* Content Blocks */}
                    <NOWEditor node={activeNode} />

                </div>
            </div>
        </div>
    );
};

export default NOWView;
