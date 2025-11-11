import { getStoredAuth } from "@eye-note/auth/extension";

import type { HealthResponse } from "@eye-note/definitions";

const DEFAULT_BASE_URL = "http://localhost:3001";

function getBaseUrl () : string {
    const envUrl = import.meta.env.VITE_BACKEND_URL;
    if ( envUrl && envUrl.trim().length > 0 ) {
        return envUrl;
    }
    return DEFAULT_BASE_URL;
}

async function buildAuthHeaders () : Promise<Record<string, string>> {
    const headers : Record<string, string> = {};
    const storedAuth = await getStoredAuth();

    if ( storedAuth.authToken ) {
        headers.Authorization = `Bearer ${ storedAuth.authToken }`;
        return headers;
    }

    return headers;
}

export interface ApiRequestOptions extends RequestInit {
    bodyJson ?: unknown;
    searchParams ?: Record<string, string | string[] | undefined>;
}

export async function apiRequest<T> ( path : string, options : ApiRequestOptions = {} ) : Promise<T> {
    const baseUrl = getBaseUrl();
    const url = new URL( path, baseUrl );

    if ( options.searchParams ) {
        for ( const [ key, value ] of Object.entries( options.searchParams ) ) {
            if ( value === undefined ) {
                continue;
            }

            if ( Array.isArray( value ) ) {
                value.forEach( ( entry ) => {
                    if ( entry !== undefined ) {
                        url.searchParams.append( key, entry );
                    }
                } );
                continue;
            }

            url.searchParams.set( key, value );
        }
    }

    const headers = new Headers( options.headers );
    headers.set( "Accept", "application/json" );

    if ( options.bodyJson !== undefined ) {
        headers.set( "Content-Type", "application/json" );
    }

    const authHeaders = await buildAuthHeaders();
    for ( const [ key, value ] of Object.entries( authHeaders ) ) {
        headers.set( key, value );
    }

    const response = await fetch( url.toString(), {
        ...options,
        headers,
        body: options.bodyJson !== undefined ? JSON.stringify( options.bodyJson ) : options.body,
    } );

    if ( !response.ok ) {
        let errorMessage = `Request failed with status ${ response.status }`;
        try {
            const payload = await response.json();
            if ( payload?.error ) {
                errorMessage = payload.error;
            }
        } catch {
            // Ignore JSON parse failures
        }
        throw new Error( errorMessage );
    }

    if ( response.status === 204 ) {
        return undefined as T;
    }

    return ( await response.json() ) as T;
}

export async function pingHealth () : Promise<boolean> {
    try {
        await apiRequest<HealthResponse>( "/healthz" );
        return true;
    } catch ( error ) {
        console.warn( "[EyeNote] Health check failed:", error );
        return false;
    }
}
