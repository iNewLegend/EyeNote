/// <reference types="node" />

const DEFAULT_BACKEND_URL = "http://localhost:3001";

export function resolveBackendUrl () : string {
    const envUrl = typeof import.meta !== "undefined" ? import.meta.env?.VITE_BACKEND_URL : undefined;
    if ( envUrl && typeof envUrl === "string" && envUrl.trim().length > 0 ) {
        return envUrl;
    }

    if ( typeof process !== "undefined" ) {
        const processUrl = process.env?.VITE_BACKEND_URL ?? process.env?.BACKEND_URL;
        if ( processUrl && processUrl.trim().length > 0 ) {
            return processUrl;
        }
    }

    return DEFAULT_BACKEND_URL;
}
