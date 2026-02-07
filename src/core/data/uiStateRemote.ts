type UiScope = 'settings' | 'station-layout';

export const isUiStateRemoteEnabled = () => false;

export const readRemoteUiState = async (_scope: UiScope): Promise<unknown | undefined> => undefined;
export const writeRemoteUiState = async (_scope: UiScope, _payload: unknown): Promise<void> => {};
export const clearRemoteUiState = async (_scope: UiScope): Promise<void> => {};
