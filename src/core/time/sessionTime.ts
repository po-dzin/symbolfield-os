export const formatElapsedDuration = (diffMs: number): string => {
    const clamped = Math.max(0, diffMs);
    const hours = Math.floor(clamped / 3600000).toString().padStart(2, '0');
    const minutes = Math.floor((clamped % 3600000) / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((clamped % 60000) / 1000).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

export const formatElapsedMinutes = (diffMs: number): string => {
    const clamped = Math.max(0, diffMs);
    const minutes = Math.max(1, Math.floor(clamped / 60000));
    return `${minutes}m`;
};
