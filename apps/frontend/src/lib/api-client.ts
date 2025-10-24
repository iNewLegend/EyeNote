import type {
    CreateNotePayload,
    NoteRecord,
    UpdateNotePayload,
} from "@eye-note/definitions";

const DEFAULT_BASE_URL = "http://localhost:3001";

function getBaseUrl () : string {
    const envUrl = import.meta.env.VITE_BACKEND_URL;
    if ( envUrl && envUrl.trim().length > 0 ) {
        return envUrl;
    }
    return DEFAULT_BASE_URL;
}

async function getStoredAuth () : Promise<{
    authToken ?: string;
    userId ?: string;
    userEmail ?: string;
}> {
    if ( typeof chrome === "undefined" || !chrome.storage?.local ) {
        return {};
    }

    return new Promise( ( resolve ) => {
        chrome.storage.local.get(
            [ "authToken", "authTokenExpiresAt", "user" ],
            ( result ) => {
                const token = result.authToken as string | undefined;
                const expiresAt = result.authTokenExpiresAt as number | undefined;
                const user = result.user as { id ?: string; email ?: string } | undefined;

                const isExpired =
                    typeof expiresAt === "number" && Number.isFinite( expiresAt ) && expiresAt < Date.now();

                resolve( {
                    authToken: isExpired ? undefined : token,
                    userId: user?.id,
                    userEmail: user?.email,
                } );
            }
        );
    } );
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

interface ApiRequestOptions extends RequestInit {
    bodyJson ?: unknown;
    searchParams ?: Record<string, string | undefined>;
}

async function apiRequest<T> ( path : string, options : ApiRequestOptions = {} ) : Promise<T> {
    const baseUrl = getBaseUrl();
    const url = new URL( path, baseUrl );

    if ( options.searchParams ) {
        for ( const [ key, value ] of Object.entries( options.searchParams ) ) {
            if ( value !== undefined ) {
                url.searchParams.set( key, value );
            }
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

export async function fetchNotes ( params : { url ?: string; groupId ?: string } = {} ) : Promise<NoteRecord[]> {
    const result = await apiRequest<{ notes : NoteRecord[] }>( "/api/notes", {
        searchParams: {
            url: params.url,
            groupId: params.groupId,
        },
    } );
    return result.notes;
}

export async function createNote ( payload : CreateNotePayload ) : Promise<NoteRecord> {
    const result = await apiRequest<{ note : NoteRecord }>( "/api/notes", {
        method: "POST",
        bodyJson: payload,
    } );
    return result.note;
}

export async function updateNote ( id : string, payload : UpdateNotePayload ) : Promise<NoteRecord> {
    const result = await apiRequest<{ note : NoteRecord }>( `/api/notes/${ id }`, {
        method: "PUT",
        bodyJson: payload,
    } );
    return result.note;
}

export async function deleteNote ( id : string ) : Promise<void> {
    await apiRequest<void>( `/api/notes/${ id }`, {
        method: "DELETE",
    } );
}

export async function pingHealth () : Promise<boolean> {
    try {
        await apiRequest<{ status : string; timestamp : string }>( "/healthz" );
        return true;
    } catch ( error ) {
        console.warn( "[EyeNote] Health check failed:", error );
        return false;
    }
}
