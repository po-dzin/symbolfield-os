
import '@testing-library/jest-dom';

const ensureStorage = () => {
    if (typeof window === 'undefined') return;

    const current = window.localStorage as Storage | undefined;
    const hasStorageApi = !!current
        && typeof current.getItem === 'function'
        && typeof current.setItem === 'function'
        && typeof current.removeItem === 'function'
        && typeof current.clear === 'function';

    if (hasStorageApi) return;

    const memory = new Map<string, string>();
    const shim: Storage = {
        getItem: (key: string) => (memory.has(key) ? memory.get(key)! : null),
        setItem: (key: string, value: string) => { memory.set(key, String(value)); },
        removeItem: (key: string) => { memory.delete(key); },
        clear: () => { memory.clear(); },
        key: (index: number) => Array.from(memory.keys())[index] ?? null,
        get length() { return memory.size; }
    };

    Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: shim
    });
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: shim
    });
};

ensureStorage();
