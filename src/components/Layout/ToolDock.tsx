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
        <div className="flex flex-col gap-[var(--primitive-space-gap-dense)] p-[var(--primitive-space-gap-dense)] glass-panel rounded-[var(--primitive-radius-panel)]">
            {TOOLS.map((tool) => (
                <button
                    key={tool.id}
                    onClick={() => setTool(tool.id)}
                    className={`
            w-[var(--component-button-height-lg)] h-[var(--component-button-height-lg)] rounded-[var(--primitive-radius-input)] flex items-center justify-center
            transition-all duration-200
            ${activeTool === tool.id
                            ? 'bg-[var(--semantic-color-text-primary)] text-[var(--semantic-color-bg-app)] shadow-md'
                            : 'text-[var(--semantic-color-text-secondary)] hover:bg-[var(--semantic-color-text-primary)]/10 hover:text-[var(--semantic-color-text-primary)]'
                        }
          `}
                    title={tool.hotkey ? `${tool.label} (${tool.hotkey})` : tool.label}
                >
                    <GlyphIcon id={tool.glyphId} size={24} className="text-current" />
                </button>
            ))}

        </div>
    );
};

export default ToolDock;
