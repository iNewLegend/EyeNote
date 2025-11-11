import React from "react";
import { createRoot } from "react-dom/client";

import { getPageAnalyzer } from "@eye-note/ext/src/lib/page-analyzer";

import { ShadowDOM } from "@eye-note/ext/src/core/shadow-dom/shadow-dom";
import { UserlandDOM } from "@eye-note/ext/src/core/userland-dom/userland-dom";
import { useModeStore, AppMode } from "@eye-note/ext/src/stores/use-mode-store";

import shadowDOMStyles from "@eye-note/ext/src/core/shadow-dom/shadow-dom.css?inline";
import userlandDOMStyles from "@eye-note/ext/src/core/userland-dom/userland-dom.css?inline";

const DOM_IDS = {
    SHADOW_CONTAINER: "eye-note-shadow-dom",
    SHADOW_CONTENT: "eye-note-shadow-content",
    SHADOW_STYLES: "eye-note-shadow-dom-styles",
    USERLAND_CONTAINER: "eye-note-userland-dom",
    USERLAND_CONTENT: "eye-note-userland-content",
    USERLAND_STYLES: "eye-note-userland-dom-styles",
    ROOT_CONTAINER: "eye-note-root-container",
} as const;

const connectionBridge = {
    port: null as chrome.runtime.Port | null,
    reconnectTimer: null as ReturnType<typeof setTimeout> | null,
    heartbeatInterval: null as ReturnType<typeof setInterval> | null,
    scheduleReconnect () {
        if ( this.reconnectTimer !== null ) {
            return;
        }

        this.reconnectTimer = setTimeout( () => {
            this.reconnectTimer = null;
            initializeConnectionBridge();
        }, 1000 );
    },
    disconnect ( shouldReconnect = false ) {
        if ( this.reconnectTimer !== null ) {
            clearTimeout( this.reconnectTimer );
            this.reconnectTimer = null;
        }

        if ( this.heartbeatInterval !== null ) {
            clearInterval( this.heartbeatInterval );
            this.heartbeatInterval = null;
        }

        if ( this.port ) {
            try {
                this.port.disconnect();
            } catch {
                // Ignore
            }
            this.port = null;
        }

        if ( shouldReconnect ) {
            this.scheduleReconnect();
        }
    },
};

function applyBackendStatus ( healthy : boolean ) {
    const store = useModeStore.getState();
    const isConnected = store.isMode( AppMode.CONNECTED );

    if ( healthy && !isConnected ) {
        store.addMode( AppMode.CONNECTED );
    } else if ( !healthy && isConnected ) {
        store.removeMode( AppMode.CONNECTED );
    }
}

function initializeConnectionBridge () {
    if ( typeof chrome === "undefined" || !chrome.runtime?.connect ) {
        return;
    }

    if ( connectionBridge.port ) {
        return;
    }

    const port = chrome.runtime.connect( { name: "eye-note-health" } );
    connectionBridge.port = port;

    port.onMessage.addListener( ( message ) => {
        if ( message?.type === "BACKEND_HEALTH_UPDATE" ) {
            applyBackendStatus( Boolean( message.healthy ) );
        }
    } );

    port.onDisconnect.addListener( () => {
        connectionBridge.port = null;
        connectionBridge.scheduleReconnect();
    } );

    try {
        port.postMessage( { type: "PING_BACKEND_HEALTH" } );
        connectionBridge.heartbeatInterval = setInterval( () => {
            try {
                port.postMessage( { type: "PING_BACKEND_HEALTH" } );
            } catch ( error ) {
                console.warn( "[EyeNote] Failed to send heartbeat to background script", error );
            }
        }, 5000 );
    } catch ( error ) {
        console.warn( "[EyeNote] Failed to request backend health status", error );
    }
}

function initializeDOMContainers () {
    const shadowContainer = document.createElement( "div" );
    shadowContainer.id = DOM_IDS.SHADOW_CONTAINER;

    const userlandContainer = document.createElement( "div" );
    userlandContainer.id = DOM_IDS.USERLAND_CONTAINER;

    return { shadowContainer, userlandContainer };
}

function initializeShadowDOM ( container : HTMLElement ) {
    const shadowRoot = container.attachShadow( { mode: "open" } );

    const shadowStyles = document.createElement( "style" );
    shadowStyles.id = DOM_IDS.SHADOW_STYLES;
    shadowStyles.textContent = shadowDOMStyles;
    shadowRoot.appendChild( shadowStyles );

    const contentContainer = document.createElement( "div" );
    contentContainer.id = DOM_IDS.SHADOW_CONTENT;
    shadowRoot.appendChild( contentContainer );

    return { shadowRoot, contentContainer };
}

function initializeUserlandDOM ( container : HTMLElement ) {
    const userlandShadowRoot = container.attachShadow( { mode: "open" } );

    const userlandStyles = document.createElement( "style" );
    userlandStyles.id = DOM_IDS.USERLAND_STYLES;
    userlandStyles.textContent = userlandDOMStyles;
    userlandShadowRoot.appendChild( userlandStyles );

    const contentContainer = document.createElement( "div" );
    contentContainer.id = DOM_IDS.USERLAND_CONTENT;
    userlandShadowRoot.appendChild( contentContainer );

    return { userlandShadowRoot, contentContainer };
}

function initializeApp () {
    initializeConnectionBridge();

    if ( document.getElementById( DOM_IDS.ROOT_CONTAINER ) ) {
        return;
    }

    const eyeNoteRootContainer = document.createElement( "div" );
    eyeNoteRootContainer.id = DOM_IDS.ROOT_CONTAINER;

    const { shadowContainer, userlandContainer } = initializeDOMContainers();

    const { contentContainer: shadowContentContainer } = initializeShadowDOM( shadowContainer );
    const { contentContainer: userlandContentContainer } = initializeUserlandDOM( userlandContainer );

    eyeNoteRootContainer.appendChild( shadowContainer );
    eyeNoteRootContainer.appendChild( userlandContainer );
    document.body.appendChild( eyeNoteRootContainer );

    const root = createRoot( shadowContentContainer );
    const userlandRoot = createRoot( userlandContentContainer );

    root.render(
        <React.StrictMode>
            <ShadowDOM />
        </React.StrictMode>
    );

    userlandRoot.render(
        <React.StrictMode>
            <UserlandDOM />
        </React.StrictMode>
    );

    try {
        getPageAnalyzer().analyzePage();
    } catch ( error ) {
        console.error( "[EyeNote] Failed to analyze page", error );
    }

    return { root, userlandRoot };
}

initializeApp();

const runtimeMessageHandler : Parameters<typeof chrome.runtime.onMessage.addListener>[ 0 ] = (
    message,
    _sender,
    sendResponse
) => {
    if ( typeof window === "undefined" ) {
        sendResponse?.( { success: false } );
        return;
    }

    const payload = message as { type ?: string };
    if ( payload?.type === "OPEN_GROUP_MANAGER" ) {
        window.dispatchEvent( new CustomEvent( "eye-note-open-group-manager" ) );
        sendResponse?.( { success: true } );
        return;
    }

    if ( payload?.type === "OPEN_QUICK_MENU_DIALOG" ) {
        window.dispatchEvent( new CustomEvent( "eye-note-open-quick-menu" ) );
        sendResponse?.( { success: true } );
        return;
    }

    if ( payload?.type === "OPEN_SETTINGS_DIALOG" ) {
        window.dispatchEvent( new CustomEvent( "eye-note-open-settings-dialog" ) );
        sendResponse?.( { success: true } );
        return;
    }

    sendResponse?.( { success: false } );
};

if ( typeof chrome !== "undefined" && chrome.runtime?.onMessage ) {
    chrome.runtime.onMessage.addListener( runtimeMessageHandler );
}

if ( import.meta.hot ) {
    import.meta.hot.dispose( () => {
        connectionBridge.disconnect( false );
        if ( typeof chrome !== "undefined" && chrome.runtime?.onMessage ) {
            chrome.runtime.onMessage.removeListener( runtimeMessageHandler );
        }
    } );
}
