import React from 'react';
import { useGraphStore } from '../../store/graphStore';

// New Properties Window components
import IdentityHeader from './Properties/IdentityHeader';
import GlyphToneModule from './Properties/GlyphToneModule';
import XPModule from './Properties/XPModule';
import TemporalModule from './Properties/TemporalModule';
import AdvancedComponents from './Properties/AdvancedComponents';

/**
 * Node Properties Window - Modular, compact design
 * Based on sf_properties_window_ui:ux.md spec
 */
const NodePropertiesWindow = ({ node: initialNode, onClose }) => {
    // Get the latest node state from store
    const currentNode = useGraphStore((state) => state.nodes.find(n => n.id === initialNode.id));
    const node = currentNode || initialNode;

    const { updateNodeComponent, addComponentToNode, removeComponentFromNode } = useGraphStore();

    // Handle component updates
    const handleGlyphToneChange = (field, value) => {
        if (field === 'glyph') {
            updateNodeComponent(node.id, 'glyph', { char: value });
        } else if (field === 'tone') {
            updateNodeComponent(node.id, 'tone', { id: value });
        }
    };

    const handleXPChange = (field, value) => {
        const currentXP = node.components?.xp || {};
        updateNodeComponent(node.id, 'xp', {
            ...currentXP,
            [field]: parseInt(value) || 0
        });
    };

    const handleTemporalChange = (scale) => {
        updateNodeComponent(node.id, 'temporal', { scale });
    };

    const handleRemoveComponent = (type) => {
        removeComponentFromNode(node.id, type);
    };

    const hasGlyph = !!node.components?.glyph;
    const hasTone = !!node.components?.tone;
    const glyphChar = node.components?.glyph?.char || GLYPHS.find(g => g.id === node.components?.glyph?.id)?.char;
    const toneId = node.components?.tone?.id || TONES[0].id;

    return (
        <div className="properties-window">
            <div className="properties-body">
                <IdentityHeader node={node} connections={[]} />

                {/* Glyph + Tone Modules (separate sections) */}
                {(hasGlyph || hasTone) && (
                    <GlyphToneModule
                        glyph={glyphChar || GLYPHS[0].char}
                        tone={toneId}
                        showGlyph={hasGlyph}
                        showTone={hasTone}
                        onChange={handleGlyphToneChange}
                        onRemove={(type) => handleRemoveComponent(type)}
                    />
                )}

                {/* XP Module */}
                {node.components?.xp && (
                    <XPModule
                        xp={node.components.xp}
                        onChange={handleXPChange}
                        onRemove={() => handleRemoveComponent('xp')}
                    />
                )}

                {/* Temporal Module */}
                {node.components?.temporal && (
                    <TemporalModule
                        scale={node.components.temporal.scale || 'day'}
                        onChange={handleTemporalChange}
                        onRemove={() => handleRemoveComponent('temporal')}
                    />
                )}

                {/* Advanced Components */}
                <AdvancedComponents
                    node={node}
                    onAdd={(type) => addComponentToNode(node.id, type)}
                />
            </div>
        </div>
    );
};

// Import for defaults
import { GLYPHS, TONES } from '../../store/stateStore';

export default NodePropertiesWindow;
