/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_UI_STATE_BACKEND?: 'local' | 'remote';
    readonly VITE_UI_STATE_API_BASE_URL?: string;
    readonly VITE_UI_STATE_API_TOKEN?: string;
    readonly VITE_UI_STATE_SCOPE?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
