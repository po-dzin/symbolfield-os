/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_UI_STATE_BACKEND?: 'local' | 'remote';
    readonly VITE_UI_STATE_API_BASE_URL?: string;
    readonly VITE_UI_STATE_API_TOKEN?: string;
    readonly VITE_UI_STATE_SCOPE?: string;
    readonly VITE_GATEWAY_BACKEND?: 'local' | 'remote';
    readonly VITE_GATEWAY_API_BASE_URL?: string;
    readonly VITE_GATEWAY_API_TOKEN?: string;
    readonly VITE_ENTITLEMENTS_BACKEND?: 'local' | 'remote';
    readonly VITE_ENTITLEMENTS_API_BASE_URL?: string;
    readonly VITE_ENTITLEMENTS_API_TOKEN?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
