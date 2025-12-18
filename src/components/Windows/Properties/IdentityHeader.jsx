import React, { useEffect, useState } from 'react';
import Collapsible from './Collapsible';
import { useGraphStore } from '../../../store/graphStore';

/**
 * Identity Header - displays node title, glyph, and metadata
 */
export default function IdentityHeader({ node, connections = [] }) {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState(node.entity?.title || 'Untitled');
    const { updateNodeEntity } = useGraphStore();

    useEffect(() => {
        setTitleValue(node.entity?.title || 'Untitled');
        setIsEditingTitle(false);
    }, [node.id, node.entity?.title]);

    const metadata = [
        { label: 'Type', value: node.entity?.type || 'unknown' },
        { label: 'ID', value: node.id.slice(0, 8) },
        { label: 'Links', value: connections.length }
    ];

    const handleTitleDoubleClick = () => {
        setIsEditingTitle(true);
    };

    const handleTitleChange = (e) => {
        setTitleValue(e.target.value);
    };

    const handleTitleBlur = () => {
        setIsEditingTitle(false);
        if (titleValue.trim() !== node.entity?.title) {
            updateNodeEntity(node.id, { ...node.entity, title: titleValue.trim() || 'Untitled' });
        }
    };

    const handleTitleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.target.blur();
        } else if (e.key === 'Escape') {
            setTitleValue(node.entity?.title || 'Untitled');
            setIsEditingTitle(false);
        }
    };

    return (
        <div className="identity-header">
            <div className="node-title-row">
                <span className="node-glyph">{node.components?.glyph?.char || '○'}</span>
                {isEditingTitle ? (
                    <input
                        type="text"
                        className="node-title-input"
                        value={titleValue}
                        onChange={handleTitleChange}
                        onBlur={handleTitleBlur}
                        onKeyDown={handleTitleKeyDown}
                        autoFocus
                    />
                ) : (
                    <h2
                        className="node-title"
                        onDoubleClick={handleTitleDoubleClick}
                        title="Double-click to edit"
                    >
                        {titleValue}
                    </h2>
                )}
            </div>

            <Collapsible
                label="METADATA"
                defaultOpen={false}
            >
                <div className="metadata-grid">
                    {metadata.map(item => (
                        <div key={item.label} className="metadata-row">
                            <span className="metadata-label">{item.label}:</span>
                            <span className="metadata-value">{item.value}</span>
                        </div>
                    ))}
                </div>
            </Collapsible>
        </div>
    );
}
