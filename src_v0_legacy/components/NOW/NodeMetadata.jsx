import React, { useState, useEffect } from 'react';
import { useGraphStore } from '../../store/graphStore';
import Collapsible from '../Windows/Properties/Collapsible';

const NodeMetadata = ({ node }) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState(node?.entity?.title || 'Untitled');
    const { updateNodeEntity } = useGraphStore();

    useEffect(() => {
        setTitleValue(node?.entity?.title || 'Untitled');
        setIsEditingTitle(false);
    }, [node?.id, node?.entity?.title]);

    if (!node) {
        return <div className="text-white/40">No node data available</div>;
    }

    const formatMetadataValue = (value) => {
        if (value === null || value === undefined) return 'Unknown';
        if (typeof value === 'string' || typeof value === 'number') return value;
        if (value instanceof Date) return value.toLocaleString();
        return String(value);
    };

    const createdAt = node.createdAt || node.state?.createdAt || node.state?.activatedAt || node.state?.lastEditedAt;
    const modifiedAt = node.updatedAt || node.state?.lastEditedAt;

    const metadata = [
        { label: 'Type', value: node.entity?.type || 'unknown' },
        { label: 'ID', value: (node && node.id) ? node.id.slice(0, 8) : 'unknown' },
        { label: 'Created', value: createdAt ? new Date(createdAt) : null },
        { label: 'Modified', value: modifiedAt ? new Date(modifiedAt) : null }
    ].map(item => ({ ...item, value: formatMetadataValue(item.value) }));

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

            <Collapsible label="METADATA" defaultOpen={false}>
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
};

export default NodeMetadata;
