export type UiThemeSource = 'manual' | 'sync';
export type UiThemeValue = 'dark' | 'light';
export type UiThemeAppMode = 'deep' | 'flow' | 'luma';

export const resolveUiTheme = (
    source: UiThemeSource,
    manualValue: UiThemeValue,
    appMode: UiThemeAppMode
): UiThemeValue => {
    if (source === 'sync') {
        return appMode === 'luma' ? 'light' : 'dark';
    }
    return manualValue;
};
