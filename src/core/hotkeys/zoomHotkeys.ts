export const GLOBAL_ZOOM_HOTKEY_EVENT = 'sf:zoom-hotkey';

export type ZoomHotkeyDetail = {
  direction: 'in' | 'out' | 'reset' | 'fit';
  source?: 'keyboard' | 'ui';
  step?: number;
};

export const parseZoomHotkey = (_event: KeyboardEvent): ZoomHotkeyDetail | null => null;
