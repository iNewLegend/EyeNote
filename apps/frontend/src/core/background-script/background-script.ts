// Listen for extension installation or update
chrome.runtime.onInstalled.addListener( ( details ) => {
    console.log( { details } );

    // Initialize default settings
    chrome.storage.local.set( {
        settings: {
            enabled: true,
            notificationSound: true,
            showUnreadBadge: true,
        },
        activeGroups: [],
    } );

    if ( details.reason === "install" ) {
        console.log( "Extension installed" );
    } else if ( details.reason === "update" ) {
        console.log( "Extension updated" );
    }

    startBuildInfoCheck();
} );

// Function to check build info
async function checkBuildInfo () {
    try {
        const response = await fetch( chrome.runtime.getURL( "build-info.json" ) );
        if ( !response.ok ) {
            throw new Error( "Failed to fetch build info" );
        }

        const buildInfo = await response.json();
        const { currentBuildInfo } = await chrome.storage.local.get( "currentBuildInfo" );

        // If there's no current build info, just set it without reloading
        if ( !currentBuildInfo ) {
            console.log( "Setting initial build info:", buildInfo );
            await chrome.storage.local.set( {
                currentBuildInfo: {
                    version: buildInfo.version,
                    buildId: buildInfo.buildId,
                    timestamp: buildInfo.timestamp,
                },
            } );
            return;
        }

        // If we have current build info, check if it actually changed
        if (
            currentBuildInfo.version !== buildInfo.version ||
            currentBuildInfo.buildId !== buildInfo.buildId
        ) {
            console.log( "Build info changed:", {
                from: {
                    version: currentBuildInfo.version,
                    buildId: currentBuildInfo.buildId,
                },
                to: {
                    version: buildInfo.version,
                    buildId: buildInfo.buildId,
                },
            } );

            // Store new build info
            await chrome.storage.local.set( {
                currentBuildInfo: {
                    version: buildInfo.version,
                    buildId: buildInfo.buildId,
                    timestamp: buildInfo.timestamp,
                },
            } );

            // Notify all tabs about the update
            const tabs = await chrome.tabs.query( {} );
            tabs.forEach( ( tab ) => {
                if ( tab.id ) {
                    chrome.tabs
                        .sendMessage( tab.id, {
                            type: "BUILD_INFO_UPDATED",
                            buildInfo,
                        } )
                        .catch( () => {
                            // Ignore errors for inactive tabs
                        } );
                }
            } );

            console.log( "Reloading the extension due to build changes" );
            chrome.runtime.reload();
        }
    } catch ( error ) {
        console.error( "Error checking build info:", error );
    }
}

// Keep track of the interval ID
let buildInfoCheckInterval : NodeJS.Timeout | null = null;

// Function to start build info check interval
function startBuildInfoCheck () {
    // Clear any existing interval
    if ( buildInfoCheckInterval !== null ) {
        clearInterval( buildInfoCheckInterval );
    }

    // Check immediately
    checkBuildInfo();

    buildInfoCheckInterval = setInterval( checkBuildInfo, 1000 );
}

const manifest = chrome.runtime.getManifest();
const oauthClientId = manifest.oauth2?.client_id ?? "";
const oauthScopes = manifest.oauth2?.scopes ?? [];

interface StoredUser {
    id : string;
    email : string;
    name : string;
    picture : string | null;
}

interface AuthSession {
    authToken : string; // Google ID token
    authAccessToken : string;
    authTokenExpiresAt : number;
    user : StoredUser;
}

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

async function fetchUserProfile ( accessToken : string ) : Promise<StoredUser> {
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
        email: data.email,
        name: data.name,
        picture: data.picture ?? null,
    };
}

async function storeAuthSession ( session : AuthSession ) : Promise<void> {
    await chrome.storage.local.set( session );
}

async function clearAuthSession () : Promise<void> {
    await chrome.storage.local.remove( [ "authToken", "authAccessToken", "authTokenExpiresAt", "user" ] );
}

async function signInWithGoogle () : Promise<{ success : boolean; user ?: StoredUser; error ?: string }> {
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

async function signOutUser () : Promise<{ success : boolean; error ?: string }> {
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

async function getAuthStatus () : Promise<{ isAuthenticated : boolean; user ?: StoredUser | null }> {
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

chrome.runtime.onMessage.addListener( ( message, _sender, sendResponse ) => {
    const handler = ( async () => {
        switch ( message.type ) {
            case "SIGN_IN":
                return signInWithGoogle();
            case "SIGN_OUT":
                return signOutUser();
            case "GET_AUTH_STATUS":
                return getAuthStatus();
            case "UPDATE_BADGE": {
                const count = Number( message.count ?? 0 );
                if ( count > 0 ) {
                    chrome.action.setBadgeText( { text: count.toString() } );
                    chrome.action.setBadgeBackgroundColor( { color: "#646cff" } );
                } else {
                    chrome.action.setBadgeText( { text: "" } );
                }
                return { success: true };
            }
            default:
                console.warn( "Unknown message type:", message.type );
                return { success: false, error: "Unknown message type" };
        }
    } )();

    handler.then( sendResponse ).catch( ( error ) => {
        console.error( "Unhandled error in message handler", error );
        sendResponse( {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        } );
    } );

    return true;
} );
