import { getAuthStatus, signInWithGoogle, signOutUser } from "../../modules/auth/background";
import { pingHealth } from "../../lib/api-client";

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
    startHealthCheck();
} );

chrome.runtime.onStartup?.addListener( () => {
    startHealthCheck();
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
let currentHealthStatus : boolean | null = null;
let healthCheckPromise : Promise<void> | null = null;
let healthCheckInterval : ReturnType<typeof setInterval> | null = null;
const healthPorts = new Set<chrome.runtime.Port>();

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

async function checkBackendHealth ( force = false ) {
    if ( healthCheckPromise && !force ) {
        return healthCheckPromise;
    }

    healthCheckPromise = ( async () => {
        try {
            const healthy = await pingHealth();
            updateHealthStatus( healthy );
        } catch {
            updateHealthStatus( false );
        } finally {
            healthCheckPromise = null;
        }
    } )();

    await healthCheckPromise;
}

function updateHealthStatus ( healthy : boolean ) {
    if ( currentHealthStatus === healthy ) {
        return;
    }

    currentHealthStatus = healthy;

    console.log( "Backend health status updated:", healthy );

    chrome.runtime.sendMessage( {
        type: "BACKEND_HEALTH_UPDATE",
        healthy,
    } ).catch( ( e ) => {
        console.warn( "Failed to send backend health update", e );
    } );

    healthPorts.forEach( ( port ) => {
        try {
            port.postMessage( {
                type: "BACKEND_HEALTH_UPDATE",
                healthy,
            } );
        } catch ( error ) {
            console.warn( "Failed to post health update to port", error );
        }
    } );
}

const DEFAULT_HEALTH_CHECK_INTERVAL = 1000;

function startHealthCheck () {
    if ( healthCheckInterval !== null ) {
        clearInterval( healthCheckInterval );
    }

    void checkBackendHealth( true );
    healthCheckInterval = setInterval( () => {
        void checkBackendHealth();
    }, DEFAULT_HEALTH_CHECK_INTERVAL );
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
            case "GET_BACKEND_STATUS": {
                if ( currentHealthStatus === null ) {
                    await checkBackendHealth( true );
                }
                return {
                    healthy: currentHealthStatus ?? false,
                };
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

startHealthCheck();

chrome.runtime.onConnect.addListener( ( port ) => {
    if ( port.name !== "eye-note-health" ) {
        return;
    }

    healthPorts.add( port );

    if ( currentHealthStatus !== null ) {
        port.postMessage( {
            type: "BACKEND_HEALTH_UPDATE",
            healthy: currentHealthStatus,
        } );
    }

    port.onMessage.addListener( ( message ) => {
        if ( message?.type === "PING_BACKEND_HEALTH" ) {
            void checkBackendHealth( true );
        }
    } );

    port.onDisconnect.addListener( () => {
        healthPorts.delete( port );
    } );
} );
