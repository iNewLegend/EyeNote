import { loadAuthSession } from "@eye-note/auth/app";

const DEFAULT_BACKEND_URL = "http://localhost:3001";

export function getBackendBaseUrl () : string {
    const envUrl = import.meta.env.VITE_BACKEND_URL;
    if ( envUrl && envUrl.trim().length > 0 ) {
        return envUrl;
    }
    return DEFAULT_BACKEND_URL;
}

function buildAuthHeaders () : Record<string, string> {
    const headers : Record<string, string> = {};
    const session = loadAuthSession();

    if ( session?.authToken ) {
        headers.Authorization = `Bearer ${ session.authToken }`;
    }

    return headers;
}

export interface ApiRequestOptions extends RequestInit {
    bodyJson ?: unknown;
    searchParams ?: Record<string, string | string[] | undefined>;
}

export async function apiRequest<T> ( path : string, options : ApiRequestOptions = {} ) : Promise<T> {
    const baseUrl = getBackendBaseUrl();
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

    const authHeaders = buildAuthHeaders();
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
            // no-op
        }
        throw new Error( errorMessage );
    }

    if ( response.status === 204 ) {
        return undefined as T;
    }

    return ( await response.json() ) as T;
}
