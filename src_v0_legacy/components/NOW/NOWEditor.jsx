import React, { useEffect, useRef, useState } from 'react';
import { useGraphStore } from '../../store/graphStore';
import { useStateStore } from '../../store/stateStore';

const makeId = () => `block_${Math.random().toString(36).slice(2, 10)}`;

const BLOCK_SPECS = {
    text: { w: 280, h: 80 },
    image: { w: 320, h: 240 },
    table: { w: 360, h: 200 },
    list: { w: 320, h: 160 },
    audio: { w: 320, h: 120 },
    subgraph: { w: 360, h: 240 }
};
const GRID_SIZE = 40;

const createBlock = (type) => {
    const size = BLOCK_SPECS[type] || BLOCK_SPECS.text;
    const base = { id: makeId(), type };
    switch (type) {
        case 'image':
            return { ...base, data: { src: '', w: size.w, h: size.h } };
        case 'table':
            return {
                ...base,
                data: {
                    rows: 3,
                    cols: 3,
                    cells: Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => '')),
                    w: size.w,
                    h: size.h
                }
            };
        case 'list':
            return { ...base, data: { text: '', w: size.w, h: size.h } };
        case 'audio':
            return { ...base, data: { src: '', w: size.w, h: size.h } };
        case 'subgraph':
            return { ...base, data: { w: size.w, h: size.h } };
        case 'text':
        default:
            return { ...base, data: { text: '', w: size.w, h: size.h } };
    }
};

const TextBlock = ({ block, onChange, pendingFocusId, onFocused, textClass, registerRef }) => {
    const ref = useRef(null);

    useEffect(() => {
        registerRef(block.id, ref.current);
        if (!ref.current) return;
        if (document.activeElement === ref.current) return;
        if (ref.current.textContent !== block.data.text) {
            ref.current.textContent = block.data.text || '';
        }
    }, [block.data.text, block.id, registerRef]);

    useEffect(() => {
        if (pendingFocusId !== block.id || !ref.current) return;
        ref.current.focus();
        const selection = window.getSelection();
        if (selection) {
            const range = document.createRange();
            if (ref.current.firstChild) {
                range.setStart(ref.current.firstChild, 0);
            } else {
                range.selectNodeContents(ref.current);
            }
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        onFocused();
    }, [pendingFocusId, block.id, onFocused]);

    return (
        <div
            ref={ref}
            data-block-id={block.id}
            className={`min-h-[28px] w-full outline-none text-base leading-6 cursor-text whitespace-pre-wrap break-words ${textClass}`}
            contentEditable
            suppressContentEditableWarning
            onFocus={() => {
                if (!ref.current) return;
                if (ref.current.textContent && ref.current.textContent.length > 0) return;
                const selection = window.getSelection();
                if (!selection) return;
                const range = document.createRange();
                range.selectNodeContents(ref.current);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }}
            onInput={(e) => onChange(block.id, { text: e.currentTarget.textContent || '' })}
        />
    );
};

const ImageBlock = ({ block, onChange, fieldClass, borderClass }) => {
    return (
        <div data-block-id={block.id} className="flex flex-col gap-3">
            <input
                type="text"
                value={block.data.src}
                onChange={(e) => onChange(block.id, { src: e.target.value })}
                placeholder="Paste image URL..."
                className={`w-full bg-transparent border rounded px-3 py-2 text-sm outline-none ${fieldClass}`}
            />
            {block.data.src && (
                <img
                    src={block.data.src}
                    alt="Block"
                    className={`max-h-80 rounded border object-contain ${borderClass}`}
                />
            )}
        </div>
    );
};

const ListBlock = ({ block, onChange, fieldClass }) => {
    return (
        <textarea
            data-block-id={block.id}
            className={`w-full min-h-[90px] bg-transparent border rounded px-3 py-2 text-sm outline-none ${fieldClass}`}
            placeholder="List items (one per line)"
            value={block.data.text}
            onChange={(e) => onChange(block.id, { text: e.target.value })}
        />
    );
};

const TableBlock = ({ block, onChange, borderClass }) => {
    const { rows, cols, cells } = block.data;
    return (
        <div data-block-id={block.id} className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
                <tbody>
                    {Array.from({ length: rows }).map((_, rowIndex) => (
                        <tr key={`row-${rowIndex}`}>
                            {Array.from({ length: cols }).map((_, colIndex) => (
                                <td key={`cell-${rowIndex}-${colIndex}`} className={`border ${borderClass}`}>
                                    <input
                                        type="text"
                                        value={cells[rowIndex]?.[colIndex] || ''}
                                        onChange={(e) => {
                                            const nextCells = cells.map(row => [...row]);
                                            nextCells[rowIndex][colIndex] = e.target.value;
                                            onChange(block.id, { ...block.data, cells: nextCells });
                                        }}
                                        className="w-full bg-transparent px-2 py-2 outline-none"
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const AudioBlock = ({ block, onChange, fieldClass }) => {
    return (
        <div data-block-id={block.id} className="flex flex-col gap-3">
            <input
                type="text"
                value={block.data.src}
                onChange={(e) => onChange(block.id, { src: e.target.value })}
                placeholder="Paste audio URL..."
                className={`w-full bg-transparent border rounded px-3 py-2 text-sm outline-none ${fieldClass}`}
            />
            {block.data.src && (
                <audio controls className="w-full">
                    <source src={block.data.src} />
                </audio>
            )}
        </div>
    );
};

const SubgraphBlock = ({ block, borderClass, textClass }) => {
    return (
        <div
            data-block-id={block.id}
            className={`h-full w-full rounded border flex items-center justify-center text-xs uppercase tracking-wider ${borderClass} ${textClass}`}
        >
            Local Subgraph
        </div>
    );
};

const MENU_ITEMS = [
    { type: 'text', label: 'Text' },
    { type: 'image', label: 'Image' },
    { type: 'table', label: 'Table' },
    { type: 'list', label: 'List' },
    { type: 'audio', label: 'Audio' },
    { type: 'subgraph', label: 'Local Subgraph' }
];

const NOWEditor = ({ node }) => {
    const { updateNodeEntity } = useGraphStore();
    const { mode } = useStateStore();
    const isLuma = mode === 'LUMA';
    const containerRef = useRef(null);
    const textRefs = useRef(new Map());
    const [blocks, setBlocks] = useState([]);
    const [menu, setMenu] = useState({ open: false, x: 0, y: 0, localX: 0, localY: 0 });
    const [pendingFocusId, setPendingFocusId] = useState(null);
    const [activeBlockId, setActiveBlockId] = useState(null);
    const longPressTimer = useRef(null);
    const [dragState, setDragState] = useState({ id: null, offsetX: 0, offsetY: 0 });
    const [dragOutOfBounds, setDragOutOfBounds] = useState(false);

    const snapValue = (value) => Math.round(value / GRID_SIZE) * GRID_SIZE;
    const snapPoint = ({ x, y }) => ({ x: snapValue(x), y: snapValue(y) });

    useEffect(() => {
        const stored = node?.entity?.contentBlocks;
        if (Array.isArray(stored)) {
            const normalized = stored.map((block, index) => {
                const hasPosition = typeof block.data?.x === 'number' && typeof block.data?.y === 'number';
                if (hasPosition) {
                    const snapped = snapPoint({ x: block.data.x, y: block.data.y });
                    if (snapped.x === block.data.x && snapped.y === block.data.y) return block;
                    return { ...block, data: { ...block.data, x: snapped.x, y: snapped.y } };
                }
                const fallbackX = 24;
                const fallbackY = 24 + index * 60;
                const snapped = snapPoint({ x: fallbackX, y: fallbackY });
                return { ...block, data: { ...block.data, x: snapped.x, y: snapped.y } };
            });
            setBlocks(normalized);
            const changed = normalized.some((block, index) => block !== stored[index]);
            if (changed) {
                updateNodeEntity(node.id, { ...node.entity, contentBlocks: normalized });
            }
            return;
        }
        setBlocks([]);
    }, [node?.id]);

    const persistBlocks = (nextBlocks) => {
        setBlocks(nextBlocks);
        updateNodeEntity(node.id, { ...node.entity, contentBlocks: nextBlocks });
    };

    const getBlockRect = (block) => ({
        x: block.data?.x ?? 24,
        y: block.data?.y ?? 24,
        w: block.data?.w ?? (BLOCK_SPECS[block.type]?.w || BLOCK_SPECS.text.w),
        h: block.data?.h ?? (BLOCK_SPECS[block.type]?.h || BLOCK_SPECS.text.h)
    });
    const clampPoint = (point, size) => ({
        x: Math.max(0, Math.min(point.x, Math.max(0, size.w - GRID_SIZE))),
        y: Math.max(0, Math.min(point.y, Math.max(0, size.h - GRID_SIZE)))
    });

    const findFreePosition = (desired, type) => {
        const padding = 16;
        const step = 24;
        const size = BLOCK_SPECS[type] || BLOCK_SPECS.text;
        const overlaps = (rectA, rectB) => (
            rectA.x < rectB.x + rectB.w + padding &&
            rectA.x + rectA.w + padding > rectB.x &&
            rectA.y < rectB.y + rectB.h + padding &&
            rectA.y + rectA.h + padding > rectB.y
        );
        const offsets = [{ x: 0, y: 0 }];
        for (let r = 1; r <= 6; r += 1) {
            const o = r * step;
            offsets.push(
                { x: 0, y: o },
                { x: o, y: 0 },
                { x: o, y: o },
                { x: -o, y: 0 },
                { x: 0, y: -o },
                { x: -o, y: -o }
            );
        }
        for (const offset of offsets) {
            const candidate = snapPoint({ x: desired.x + offset.x, y: desired.y + offset.y });
            const rectA = { x: candidate.x, y: candidate.y, w: size.w, h: size.h };
            const collision = blocks.some((block) => overlaps(rectA, getBlockRect(block)));
            if (!collision) return candidate;
        }
        return snapPoint(desired);
    };

    const addBlock = (type, position) => {
        const newBlock = createBlock(type);
        if (position) {
            const freePosition = findFreePosition(position, type);
            newBlock.data = { ...newBlock.data, x: freePosition.x, y: freePosition.y };
        }
        const nextBlocks = [...blocks, newBlock];
        persistBlocks(nextBlocks);
        if (type === 'text') {
            setPendingFocusId(newBlock.id);
        }
    };

    const updateBlock = (blockId, data) => {
        const nextBlocks = blocks.map(block => (
            block.id === blockId ? { ...block, data: { ...block.data, ...data } } : block
        ));
        persistBlocks(nextBlocks);
    };

    const getLocalPosition = (clientX, clientY) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { x: 24, y: 24 };
        return snapPoint({
            x: Math.max(12, clientX - rect.left),
            y: Math.max(12, clientY - rect.top)
        });
    };

    const handleBackgroundDoubleClick = (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('[data-block-id]')) return;
        const position = getLocalPosition(e.clientX, e.clientY);
        addBlock('text', position);
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        const local = getLocalPosition(e.clientX, e.clientY);
        setMenu({ open: true, x: e.clientX, y: e.clientY, localX: local.x, localY: local.y });
    };

    const handleLongPressStart = (e) => {
        if (e.button !== 0) return;
        clearTimeout(longPressTimer.current);
        longPressTimer.current = setTimeout(() => {
            const local = getLocalPosition(e.clientX, e.clientY);
            setMenu({ open: true, x: e.clientX, y: e.clientY, localX: local.x, localY: local.y });
        }, 520);
    };

    const handleLongPressEnd = () => {
        clearTimeout(longPressTimer.current);
    };

    useEffect(() => {
        if (!menu.open) return;
        const handleClose = () => setMenu(prev => ({ ...prev, open: false }));
        window.addEventListener('click', handleClose);
        window.addEventListener('blur', handleClose);
        return () => {
            window.removeEventListener('click', handleClose);
            window.removeEventListener('blur', handleClose);
        };
    }, [menu.open]);

    const surfaceClass = isLuma
        ? 'text-[#2A2620]'
        : 'text-white';
    const fieldClass = isLuma
        ? 'border-black/15 text-[#2A2620] placeholder:text-black/40'
        : 'border-white/10 text-white placeholder:text-white/40';
    const borderClass = isLuma ? 'border-black/15' : 'border-white/10';
    const handleClass = isLuma
        ? 'border-black/20 bg-white/80 text-black/60'
        : 'border-white/10 bg-black/40 text-white/60';
    const subgraphTextClass = isLuma ? 'text-black/60' : 'text-white/60';
    const menuClass = isLuma
        ? 'bg-[#efe6d6] border-black/15 text-[#2A2620]'
        : 'bg-[#0b0b0b] border-white/10 text-white';

    useEffect(() => {
        if (!dragState.id) return;
        const handleMove = (e) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const nextX = e.clientX - rect.left - dragState.offsetX;
            const nextY = e.clientY - rect.top - dragState.offsetY;
            const rawPoint = { x: nextX, y: nextY };
            const snapped = snapPoint({ x: Math.max(0, rawPoint.x), y: Math.max(0, rawPoint.y) });
            const clamped = clampPoint(snapped, { w: rect.width, h: rect.height });
            const isOut = rawPoint.x < 0 || rawPoint.y < 0 || rawPoint.x > rect.width || rawPoint.y > rect.height;
            setDragOutOfBounds(isOut);
            updateBlock(dragState.id, { x: clamped.x, y: clamped.y });
        };
        const handleUp = () => {
            setDragState({ id: null, offsetX: 0, offsetY: 0 });
            setDragOutOfBounds(false);
        };
        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
        };
    }, [dragState.id, dragState.offsetX, dragState.offsetY, blocks]);

    const registerTextRef = (id, element) => {
        if (!element) return;
        textRefs.current.set(id, element);
    };

    const focusTextBlock = (id, placeAtEnd = false) => {
        const element = textRefs.current.get(id);
        if (!element) return;
        element.focus();
        const selection = window.getSelection();
        if (!selection) return;
        const range = document.createRange();
        if (!element.textContent) {
            range.selectNodeContents(element);
            range.collapse(true);
        } else if (placeAtEnd) {
            range.selectNodeContents(element);
            range.collapse(false);
        }
        selection.removeAllRanges();
        selection.addRange(range);
    };

    const renderHandle = (blockId, onPointerDown) => {
        if (activeBlockId !== blockId && dragState.id !== blockId) return null;
        return (
            <button
                type="button"
                data-drag-handle
                onPointerDown={onPointerDown}
                className={`absolute -top-3 -left-3 w-6 h-6 rounded-full text-xs ${handleClass}`}
                title="Drag"
            >
                ⠿
            </button>
        );
    };

    return (
        <div
            ref={containerRef}
            className={`w-full min-h-[400px] flex-1 relative ${surfaceClass}`}
            style={{
                cursor: dragOutOfBounds ? 'not-allowed' : 'default'
            }}
            onDoubleClick={handleBackgroundDoubleClick}
            onContextMenu={handleContextMenu}
            onPointerDown={handleLongPressStart}
            onPointerUp={handleLongPressEnd}
            onPointerLeave={handleLongPressEnd}
        >
            {blocks.length === 0 && (
                <div className="text-sm opacity-50">Click anywhere to start writing.</div>
            )}

            {blocks.map((block) => {
                const rect = getBlockRect(block);
                const positionStyle = {
                    left: rect.x,
                    top: rect.y,
                    width: rect.w,
                    height: block.type === 'text' ? 'auto' : rect.h,
                    minHeight: rect.h
                };
                const frameOuterStyle = {
                    border: isLuma ? '1px solid rgba(42, 38, 32, 0.12)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '24px'
                };
                const frameInnerStyle = {
                    border: isLuma ? '1px solid rgba(42, 38, 32, 0.18)' : '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '16px',
                    background: isLuma ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.06)'
                };
                const handleDragPointerDown = (e) => {
                    if (e.button !== 0) return;
                    e.stopPropagation();
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const startX = block.data?.x ?? 0;
                    const startY = block.data?.y ?? 0;
                    setDragState({
                        id: block.id,
                        offsetX: e.clientX - rect.left - startX,
                        offsetY: e.clientY - rect.top - startY
                    });
                    if (e.currentTarget.setPointerCapture) {
                        e.currentTarget.setPointerCapture(e.pointerId);
                    }
                };
                const handleWrapperPointerDown = (e) => {
                    if (e.target.closest('[contenteditable="true"], input, textarea, audio, [data-drag-handle]')) {
                        return;
                    }
                    setActiveBlockId(block.id);
                    if (block.type === 'text') {
                        e.stopPropagation();
                        focusTextBlock(block.id, true);
                    }
                };

                switch (block.type) {
                    case 'image':
                        return (
                            <div
                                key={block.id}
                                data-block-id={block.id}
                                className="absolute"
                                style={positionStyle}
                                onPointerDown={handleWrapperPointerDown}
                            >
                                <div className="absolute -inset-2 pointer-events-none" style={frameOuterStyle} />
                                <div className="relative w-full h-full p-4" style={frameInnerStyle}>
                                    {renderHandle(block.id, handleDragPointerDown)}
                                    <ImageBlock block={block} onChange={updateBlock} fieldClass={fieldClass} borderClass={borderClass} />
                                </div>
                            </div>
                        );
                    case 'table':
                        return (
                            <div
                                key={block.id}
                                data-block-id={block.id}
                                className="absolute"
                                style={positionStyle}
                                onPointerDown={handleWrapperPointerDown}
                            >
                                <div className="absolute -inset-2 pointer-events-none" style={frameOuterStyle} />
                                <div className="relative w-full h-full p-4" style={frameInnerStyle}>
                                    {renderHandle(block.id, handleDragPointerDown)}
                                    <TableBlock block={block} onChange={updateBlock} borderClass={borderClass} />
                                </div>
                            </div>
                        );
                    case 'list':
                        return (
                            <div
                                key={block.id}
                                data-block-id={block.id}
                                className="absolute"
                                style={positionStyle}
                                onPointerDown={handleWrapperPointerDown}
                            >
                                <div className="absolute -inset-2 pointer-events-none" style={frameOuterStyle} />
                                <div className="relative w-full h-full p-4" style={frameInnerStyle}>
                                    {renderHandle(block.id, handleDragPointerDown)}
                                    <ListBlock block={block} onChange={updateBlock} fieldClass={fieldClass} />
                                </div>
                            </div>
                        );
                    case 'audio':
                        return (
                            <div
                                key={block.id}
                                data-block-id={block.id}
                                className="absolute"
                                style={positionStyle}
                                onPointerDown={handleWrapperPointerDown}
                            >
                                <div className="absolute -inset-2 pointer-events-none" style={frameOuterStyle} />
                                <div className="relative w-full h-full p-4" style={frameInnerStyle}>
                                    {renderHandle(block.id, handleDragPointerDown)}
                                    <AudioBlock block={block} onChange={updateBlock} fieldClass={fieldClass} />
                                </div>
                            </div>
                        );
                    case 'subgraph':
                        return (
                            <div
                                key={block.id}
                                data-block-id={block.id}
                                className="absolute"
                                style={positionStyle}
                                onPointerDown={handleWrapperPointerDown}
                            >
                                <div className="absolute -inset-2 pointer-events-none" style={frameOuterStyle} />
                                <div className="relative w-full h-full p-4" style={frameInnerStyle}>
                                    {renderHandle(block.id, handleDragPointerDown)}
                                    <SubgraphBlock block={block} borderClass={borderClass} textClass={subgraphTextClass} />
                                </div>
                            </div>
                        );
                    case 'text':
                    default:
                        return (
                            <div
                                key={block.id}
                                data-block-id={block.id}
                                className="absolute"
                                style={positionStyle}
                                onPointerDown={handleWrapperPointerDown}
                            >
                                <div className="absolute -inset-2 pointer-events-none" style={frameOuterStyle} />
                                <div
                                    className="relative w-full p-4"
                                    style={{ ...frameInnerStyle, minHeight: rect.h }}
                                >
                                    {renderHandle(block.id, handleDragPointerDown)}
                                    <TextBlock
                                        block={block}
                                        onChange={updateBlock}
                                        pendingFocusId={pendingFocusId}
                                        onFocused={() => setPendingFocusId(null)}
                                        textClass={isLuma ? 'text-[#2A2620]' : 'text-white'}
                                        registerRef={registerTextRef}
                                    />
                                </div>
                            </div>
                        );
                }
            })}

            {menu.open && (
                <div
                    className={`fixed z-[70000] min-w-[180px] rounded-lg border shadow-lg ${menuClass}`}
                    style={{ left: menu.x, top: menu.y }}
                >
                    {MENU_ITEMS.map(item => (
                        <button
                            key={item.type}
                            onClick={() => {
                                addBlock(item.type, { x: menu.localX, y: menu.localY });
                                setMenu({ open: false, x: 0, y: 0, localX: 0, localY: 0 });
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-white/5"
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NOWEditor;
