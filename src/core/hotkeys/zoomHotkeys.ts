export const GLOBAL_ZOOM_HOTKEY_EVENT = 'sf:zoom-hotkey';

export type ZoomHotkeyDetail = {
    command: 'zoom_in' | 'zoom_out' | 'zoom_reset' | 'zoom_fit';
    source?: 'keyboard' | 'ui';
    step?: number;
};

const hasModifier = (event: KeyboardEvent): boolean => (event.metaKey || event.ctrlKey);

export const parseZoomHotkey = (event: KeyboardEvent): ZoomHotkeyDetail | null => {
    if (event.altKey) return null;

    const modified = hasModifier(event);
    const key = event.key.toLowerCase();
    const code = event.code;
    const isNumpadZoomKey = code === 'NumpadAdd' || code === 'NumpadSubtract' || code === 'Numpad0';
    const isShiftDigitOne = event.shiftKey && (code === 'Digit1' || key === '!');

    if (isShiftDigitOne) {
        return { command: 'zoom_fit', source: 'keyboard' };
    }

    if ((modified || isNumpadZoomKey) && (key === '=' || key === '+' || code === 'Equal' || code === 'NumpadAdd')) {
        return { command: 'zoom_in', source: 'keyboard' };
    }
    if ((modified || isNumpadZoomKey) && (key === '-' || key === '_' || code === 'Minus' || code === 'NumpadSubtract')) {
        return { command: 'zoom_out', source: 'keyboard' };
    }
    if ((modified || isNumpadZoomKey) && (key === '0' || code === 'Digit0' || code === 'Numpad0')) {
        return { command: 'zoom_reset', source: 'keyboard' };
    }
    if (modified && (key === '9' || code === 'Digit9' || key === 'f')) {
        return { command: 'zoom_fit', source: 'keyboard' };
    }

    return null;
};

export const dispatchZoomHotkey = (detail: ZoomHotkeyDetail): void => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<ZoomHotkeyDetail>(GLOBAL_ZOOM_HOTKEY_EVENT, { detail }));
};

export const emitZoomHotkeyFromKeyboard = (event: KeyboardEvent): boolean => {
    const detail = parseZoomHotkey(event);
    if (!detail) return false;
    event.preventDefault();
    dispatchZoomHotkey(detail);
    return true;
};
