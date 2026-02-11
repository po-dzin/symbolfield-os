
import '@testing-library/jest-dom';

const storageState = new Map<string, string>();

const localStorageMock: Storage = {
    get length() {
        return storageState.size;
    },
    clear() {
        storageState.clear();
    },
    getItem(key: string) {
        return storageState.has(key) ? storageState.get(key) ?? null : null;
    },
    key(index: number) {
        return Array.from(storageState.keys())[index] ?? null;
    },
    removeItem(key: string) {
        storageState.delete(key);
    },
    setItem(key: string, value: string) {
        storageState.set(key, String(value));
    }
};

Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: localStorageMock
});

if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
        configurable: true,
        writable: true,
        value: localStorageMock
    });
}
