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

// Listen for messages from content script
chrome.runtime.onMessage.addListener( ( message, _sender, sendResponse ) => {
    console.log( "Message received:", message );

    // Handle different message types
    switch ( message.type ) {
        case "SIGN_IN":
            // Handle sign in
            sendResponse( { success: true } );
            break;
        case "SIGN_OUT":
            // Handle sign out
            sendResponse( { success: true } );
            break;
        default:
            console.warn( "Unknown message type:", message.type );
            sendResponse( { success: false, error: "Unknown message type" } );
    }

    // Return true to indicate we will send a response asynchronously
    return true;
} );

// Handle Google authentication
async function handleGoogleAuth ( token : string ) {
    try {
        // Fetch user info using the access token
        const response = await fetch( "https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: {
                Authorization: `Bearer ${ token }`,
            },
        } );

        if ( !response.ok ) {
            console.error( "Failed to fetch user info:", await response.text() );
            throw new Error( `Failed to fetch user info: ${ response.statusText }` );
        }

        const data = await response.json();
        console.log( "User info received:", data );

        if ( !data.sub || !data.email || !data.name ) {
            throw new Error( "Invalid user info received" );
        }

        // Store the auth token and user info
        await chrome.storage.local.set( {
            authToken: token,
            user: {
                id: data.sub,
                email: data.email,
                name: data.name,
                picture: data.picture || null,
            },
        } );

        return { success: true };
    } catch ( error ) {
        console.error( "Google auth error:", error );
        return {
            success: false,
            error: error instanceof Error ? error.message : "Authentication failed",
        };
    }
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener( ( message, _sender, sendResponse ) => {
    if ( message.type === "GET_AUTH_STATUS" ) {
        chrome.storage.local.get( [ "authToken", "user" ], ( result ) => {
            sendResponse( {
                isAuthenticated: !!result.authToken,
                user: result.user,
            } );
        } );
        return true; // Will respond asynchronously
    }

    if ( message.type === "GOOGLE_AUTH" ) {
        if ( !message.token ) {
            sendResponse( { success: false, error: "No token provided" } );
            return true;
        }
        handleGoogleAuth( message.token ).then( sendResponse );
        return true; // Will respond asynchronously
    }

    if ( message.type === "SIGN_OUT" ) {
        chrome.identity.clearAllCachedAuthTokens().then( () => {
            chrome.storage.local.remove( [ "authToken", "user" ], () => {
                sendResponse( { success: true } );
            } );
        } );
        return true; // Will respond asynchronously
    }

    if ( message.type === "UPDATE_BADGE" ) {
        const count = message.count;
        if ( count > 0 ) {
            chrome.action.setBadgeText( { text: count.toString() } );
            chrome.action.setBadgeBackgroundColor( { color: "#646cff" } );
        } else {
            chrome.action.setBadgeText( { text: "" } );
        }
    }
} );
