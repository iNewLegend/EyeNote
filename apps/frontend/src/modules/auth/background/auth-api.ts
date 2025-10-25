import type { AuthSession, AuthUser } from "@eye-note/definitions";
import { BACKGROUND_AUTH_CONFIG } from "./auth-config";

const manifest = chrome.runtime.getManifest();
const oauthClientId = BACKGROUND_AUTH_CONFIG.googleClientId || manifest.oauth2?.client_id || "";
const oauthScopes = manifest.oauth2?.scopes ?? [];

function generateState () : string {
    if ( typeof crypto !== "undefined" && "randomUUID" in crypto ) {
        return crypto.randomUUID();
    }
    return Math.random().toString( 36 ).slice( 2 );
}

function buildAuthUrl ( state : string, redirectUri : string, nonce : string ) : string {
    const authUrl = new URL( "https://accounts.google.com/o/oauth2/v2/auth" );
    authUrl.searchParams.set( "client_id", oauthClientId );
    authUrl.searchParams.set( "response_type", "token id_token" );
    authUrl.searchParams.set( "redirect_uri", redirectUri );
    authUrl.searchParams.set( "scope", oauthScopes.join( " " ) );
    authUrl.searchParams.set( "state", state );
    authUrl.searchParams.set( "nonce", nonce );
    authUrl.searchParams.set( "prompt", "consent" );
    authUrl.searchParams.set( "include_granted_scopes", "true" );
    return authUrl.toString();
}

function parseFragmentParameters ( url : string ) : URLSearchParams {
    const hashIndex = url.indexOf( "#" );
    if ( hashIndex === -1 ) {
        return new URLSearchParams();
    }
    return new URLSearchParams( url.slice( hashIndex + 1 ) );
}

function launchOAuthFlow ( url : string ) : Promise<string> {
    return new Promise( ( resolve, reject ) => {
        chrome.identity.launchWebAuthFlow(
            {
                url,
                interactive: true,
            },
            ( responseUrl ) => {
                if ( chrome.runtime.lastError ) {
                    reject( new Error( chrome.runtime.lastError.message ) );
                    return;
                }
                if ( !responseUrl ) {
                    reject( new Error( "No redirect URL received from OAuth flow" ) );
                    return;
                }
                resolve( responseUrl );
            }
        );
    } );
}

async function fetchUserProfile ( accessToken : string ) : Promise<AuthUser> {
    const response = await fetch( "https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: {
            Authorization: `Bearer ${ accessToken }`,
        },
    } );

    if ( !response.ok ) {
        throw new Error( `Failed to fetch user info: ${ response.statusText }` );
    }

    const data = await response.json() as {
        sub ?: string;
        email ?: string;
        name ?: string;
        picture ?: string | null;
    };

    if ( !data.sub || !data.email || !data.name ) {
        throw new Error( "Incomplete user profile returned from Google" );
    }

    return {
        id: data.sub,
        email: data.email ?? undefined,
        name: data.name ?? undefined,
        picture: data.picture ?? null,
    };
}

async function storeAuthSession ( session : AuthSession ) : Promise<void> {
    await chrome.storage.local.set( session );
}

async function clearAuthSession () : Promise<void> {
    await chrome.storage.local.remove( [ "authToken", "authAccessToken", "authTokenExpiresAt", "user" ] );
}

export async function signInWithGoogle () : Promise<{ success : boolean; user ?: AuthUser; error ?: string }> {
    if ( !oauthClientId ) {
        return { success: false, error: "OAuth client ID is not configured" };
    }

    try {
        const state = generateState();
        const nonce = generateState();
        const redirectUri = chrome.identity.getRedirectURL();
        console.log( "[auth] Using redirect URI:", redirectUri );
        const authUrl = buildAuthUrl( state, redirectUri, nonce );
        console.log( "[auth] Launching OAuth flow:", authUrl );

        const responseUrl = await launchOAuthFlow( authUrl );
        const params = parseFragmentParameters( responseUrl );

        const returnedState = params.get( "state" );
        if ( !returnedState || returnedState !== state ) {
            throw new Error( "OAuth state mismatch" );
        }

        const accessToken = params.get( "access_token" );
        const idToken = params.get( "id_token" );
        const expiresIn = Number.parseInt( params.get( "expires_in" ) ?? "0", 10 );

        if ( !accessToken || !idToken ) {
            throw new Error( "OAuth flow did not yield required tokens" );
        }

        const user = await fetchUserProfile( accessToken );

        await storeAuthSession( {
            authToken: idToken,
            authAccessToken: accessToken,
            authTokenExpiresAt: Date.now() + Math.max( expiresIn, 0 ) * 1000,
            user,
        } );

        return { success: true, user };
    } catch ( error ) {
        console.error( "Google sign-in failed", error );
        await clearAuthSession();
        return {
            success: false,
            error: error instanceof Error ? error.message : "Authentication failed",
        };
    }
}

export async function signOutUser () : Promise<{ success : boolean; error ?: string }> {
    try {
        await clearAuthSession();
        await chrome.identity.clearAllCachedAuthTokens();
        return { success: true };
    } catch ( error ) {
        console.error( "Failed to sign out", error );
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to sign out",
        };
    }
}

export async function getAuthStatus () : Promise<{ isAuthenticated : boolean; user ?: AuthUser | null }> {
    const stored = await chrome.storage.local.get( [
        "authToken",
        "authTokenExpiresAt",
        "user",
    ] );

    const hasToken = Boolean( stored.authToken );
    const isExpired = typeof stored.authTokenExpiresAt === "number" && stored.authTokenExpiresAt < Date.now();

    if ( !hasToken || isExpired ) {
        if ( isExpired ) {
            await clearAuthSession();
        }
        return { isAuthenticated: false, user: null };
    }

    return {
        isAuthenticated: true,
        user: stored.user ?? null,
    };
}
