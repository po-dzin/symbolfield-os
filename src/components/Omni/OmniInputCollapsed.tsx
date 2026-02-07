import React from 'react';
import { useAppStore } from '../../store/useAppStore';

type Props = {
    className?: string;
    inputClassName?: string;
    placeholder?: string;
};

export default function OmniInputCollapsed(props: Props) {
    const { className = '', inputClassName = '', placeholder = 'Search or type /command...' } = props;
    const paletteOpen = useAppStore(state => state.paletteOpen);
    const omniQuery = useAppStore(state => state.omniQuery);
    const togglePalette = useAppStore(state => state.togglePalette);
    const setOmniQuery = useAppStore(state => state.setOmniQuery);

    const openPalette = React.useCallback(() => {
        if (!paletteOpen) togglePalette();
    }, [paletteOpen, togglePalette]);

    return (
        <div className={className}>
            <input
                className={inputClassName}
                placeholder={placeholder}
                value={omniQuery}
                aria-label="Omni input"
                onFocus={openPalette}
                onMouseDown={(event) => {
                    if (paletteOpen) return;
                    event.preventDefault();
                    openPalette();
                }}
                onChange={(event) => {
                    setOmniQuery(event.target.value);
                    openPalette();
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === 'ArrowDown') {
                        openPalette();
                    }
                }}
            />
        </div>
    );
}
