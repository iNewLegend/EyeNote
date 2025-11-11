import { clearAuthSession, storeAuthSession } from "@eye-note/auth/src/app/auth-storage";

import type { AuthSession, AuthUser } from "@eye-note/auth/src/shared";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo";
const SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
];

const POPUP_FEATURES = "width=500,height=640,top=150,left=150";

function getClientId () : string {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if ( !clientId ) {
        throw new Error( "VITE_GOOGLE_CLIENT_ID is not configured" );
    }
    return clientId;
}

function generateRandomString () : string {
    const cryptoApi : Crypto | undefined = typeof window !== "undefined" ? window.crypto : undefined;
    if ( cryptoApi?.randomUUID ) {
        return cryptoApi.randomUUID();
    }
    if ( cryptoApi ) {
        const array = new Uint8Array( 16 );
        cryptoApi.getRandomValues( array );
        return Array.from( array, ( byte ) => byte.toString( 16 ).padStart( 2, "0" ) ).join( "" );
    }
    return Math.random().toString( 36 ).slice( 2, 18 );
}

function buildAuthUrl ( state : string, nonce : string, redirectUri : string ) : string {
    const url = new URL( GOOGLE_AUTH_ENDPOINT );
    url.searchParams.set( "client_id", getClientId() );
    url.searchParams.set( "response_type", "token id_token" );
    url.searchParams.set( "redirect_uri", redirectUri );
    url.searchParams.set( "scope", SCOPES.join( " " ) );
    url.searchParams.set( "state", state );
    url.searchParams.set( "nonce", nonce );
    url.searchParams.set( "prompt", "consent" );
    url.searchParams.set( "include_granted_scopes", "true" );
    return url.toString();
}

type OAuthResponse = {
    accessToken : string;
    idToken : string;
    expiresIn : number;
    state : string;
    error ?: string;
};

function waitForOAuthResponse ( expectedState : string, popup : Window | null ) : Promise<OAuthResponse> {
    return new Promise( ( resolve, reject ) => {
        if ( !popup ) {
            reject( new Error( "Unable to open authentication window" ) );
            return;
        }

        const timeout = window.setTimeout( () => {
            window.removeEventListener( "message", handler );
            popup?.close();
            reject( new Error( "Authentication timed out" ) );
        }, 2 * 60 * 1000 );

        function handler ( event : MessageEvent ) {
            if ( event.origin !== window.location.origin ) {
                return;
            }
            const data = event.data as { type ?: string; payload ?: Partial<OAuthResponse> } | undefined;
            if ( data?.type !== "EYE_NOTE_OAUTH_REDIRECT" ) {
                return;
            }
            window.clearTimeout( timeout );
            window.removeEventListener( "message", handler );

            popup?.close();

            if ( data.payload?.error ) {
                reject( new Error( data.payload.error ) );
                return;
            }

            if ( !data.payload?.idToken || !data.payload.accessToken ) {
                reject( new Error( "Authentication response missing tokens" ) );
                return;
            }

            if ( data.payload.state !== expectedState ) {
                reject( new Error( "Authentication response state mismatch" ) );
                return;
            }

            resolve( {
                accessToken: data.payload.accessToken,
                idToken: data.payload.idToken,
                expiresIn: data.payload.expiresIn ?? 0,
                state: data.payload.state,
            } );
        }

        window.addEventListener( "message", handler );
    } );
}

async function fetchUserProfile ( accessToken : string ) : Promise<AuthUser> {
    const response = await fetch( GOOGLE_USERINFO_ENDPOINT, {
        headers: {
            Authorization: `Bearer ${ accessToken }`,
        },
    } );

    if ( !response.ok ) {
        throw new Error( `Failed to fetch user info (${ response.status })` );
    }

    const payload = await response.json() as {
        sub ?: string;
        email ?: string;
        name ?: string;
        picture ?: string | null;
    };

    if ( !payload.sub ) {
        throw new Error( "User info response missing subject" );
    }

    return {
        id: payload.sub,
        email: payload.email ?? undefined,
        name: payload.name ?? undefined,
        picture: payload.picture ?? undefined,
    };
}

export async function appSignInWithGoogle () : Promise<{ success : boolean; user ?: AuthUser; session ?: AuthSession; error ?: string }> {
    try {
        const state = generateRandomString();
        const nonce = generateRandomString();
        const redirectUri =
            import.meta.env.VITE_GOOGLE_REDIRECT_URI?.trim() ||
            `${ window.location.origin }/auth/callback`;
        const authUrl = buildAuthUrl( state, nonce, redirectUri );

        const popup = window.open( authUrl, "eye-note-google-auth", POPUP_FEATURES );
        const { accessToken, idToken, expiresIn } = await waitForOAuthResponse( state, popup );

        const user = await fetchUserProfile( accessToken );
        const session : AuthSession = {
            authToken: idToken,
            authAccessToken: accessToken,
            authTokenExpiresAt: Date.now() + Math.max( expiresIn, 0 ) * 1000,
            user,
        };

        storeAuthSession( session );

        return { success: true, user, session };
    } catch ( error ) {
        console.error( "App Google sign-in failed", error );
        clearAuthSession();
        return {
            success: false,
            error: error instanceof Error ? error.message : "Authentication failed",
        };
    }
}

export async function appSignOut () {
    clearAuthSession();
}
