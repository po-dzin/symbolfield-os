import React from 'react';

export interface CapsuleTabItem {
    id: string;
    label: string;
    enabled?: boolean;
}

interface CapsuleTabsProps {
    items: CapsuleTabItem[];
    activeId: string;
    onSelect: (id: string) => void;
    onCycle?: (direction: 1 | -1) => void;
    collapsed?: boolean;
    className?: string;
    title?: string;
    size?: 'xs' | 'sm';
    equalWidth?: boolean;
    showSeparators?: boolean;
}

const CapsuleTabs: React.FC<CapsuleTabsProps> = ({
    items,
    activeId,
    onSelect,
    onCycle,
    collapsed = false,
    className,
    title,
    size = 'xs',
    equalWidth = false,
    showSeparators = true
}) => {
    const activeItem = items.find(item => item.id === activeId) || items[0];
    const visibleItems = collapsed && activeItem ? [activeItem] : items;

    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Tab' || !onCycle) return;
        event.preventDefault();
        onCycle(event.shiftKey ? -1 : 1);
    };

    const sizeClasses = size === 'sm'
        ? {
            container: 'ui-capsule-default px-[var(--component-capsule-pad)] py-[var(--component-capsule-pad)] gap-[var(--component-capsule-gap)] text-[11px]',
            item: 'ui-capsule-default-item px-4 text-[11px]',
            sep: 'text-[11px]'
        }
        : {
            container: 'ui-capsule-compact px-[var(--component-capsule-pad)] py-[var(--component-capsule-pad)] gap-[var(--component-capsule-gap)] text-[10px]',
            item: 'ui-capsule-compact-item px-3 text-[10px]',
            sep: 'text-[10px]'
        };

    return (
        <div
            role="tablist"
            tabIndex={0}
            onKeyDown={onKeyDown}
            title={title}
            className={`flex items-center ui-shape-pill overflow-hidden bg-[var(--semantic-color-bg-app)]/85 border border-[var(--semantic-color-border-default)] font-mono uppercase tracking-[0.14em] text-[var(--semantic-color-text-secondary)] ${sizeClasses.container} ${className || ''}`}
        >
            {visibleItems.map((item, index) => {
                const isActive = item.id === activeId;
                const isEnabled = item.enabled !== false;
                return (
                    <React.Fragment key={item.id}>
                        {showSeparators && index > 0 && (
                            <span className={`opacity-30 ${sizeClasses.sep}`}>/</span>
                        )}
                        <button
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            disabled={!isEnabled}
                            onClick={() => {
                                if (isEnabled) onSelect(item.id);
                            }}
                            data-state={isActive ? 'active' : 'inactive'}
                            className={`${sizeClasses.item} ui-shape-pill transition-colors ${equalWidth ? 'flex-1 text-center' : ''} ${isEnabled
                                ? 'ui-selectable'
                                : 'text-[var(--semantic-color-text-disabled)] opacity-40 cursor-not-allowed'
                                }`}
                        >
                            <span className="block max-w-[180px] truncate">
                                {item.label}
                            </span>
                        </button>
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default CapsuleTabs;
