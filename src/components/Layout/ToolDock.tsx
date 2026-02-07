/**
 * ToolDock.jsx
 * Minimal left-side tool strip.
 */

import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import GlyphIcon from '../Icon/GlyphIcon';

type ToolId = 'pointer' | 'link' | 'area';

const TOOLS: Array<{ id: ToolId; label: string; glyphId: string; hotkey?: string }> = [
    { id: 'pointer', label: 'Pointer', glyphId: 'pointer', hotkey: 'P' },
    { id: 'link', label: 'Link', glyphId: 'link-action', hotkey: 'L' },
    { id: 'area', label: 'Area', glyphId: 'area', hotkey: 'A' },
    // { id: 'zone', label: 'Zone', icon: 'Z' }
];

const ToolDock = () => {
    const activeTool = useAppStore(state => state.activeTool);
    const setTool = useAppStore(state => state.setTool);

    return (
        <div className="flex flex-col gap-2 p-2 glass-panel">
            {TOOLS.map((tool) => (
                <button
                    key={tool.id}
                    onClick={() => setTool(tool.id)}
                    className={`
            w-10 h-10 rounded-xl flex items-center justify-center
            transition-all duration-200
            ${activeTool === tool.id
                            ? 'bg-text-primary text-color-os-dark shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                            : 'text-text-secondary hover:bg-white/10 hover:text-text-primary'
                        }
          `}
                    title={tool.hotkey ? `${tool.label} (${tool.hotkey})` : tool.label}
                >
                    <GlyphIcon id={tool.glyphId} size={26} className="text-current" />
                </button>
            ))}

            {/* Toolbar customization placeholder */}
            <button
                type="button"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-text-secondary/60 border border-dashed border-white/10 cursor-not-allowed"
                title="Customize toolbar (soon)"
                aria-disabled="true"
            >
                ≡
            </button>
        </div>
    );
};

export default ToolDock;
