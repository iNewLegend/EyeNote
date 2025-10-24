/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_BACKEND_URL ?: string;
    readonly VITE_MOCK_USER_ID ?: string;
    readonly VITE_MOCK_USER_EMAIL ?: string;
}

interface ImportMeta {
    readonly env : ImportMetaEnv;
}
