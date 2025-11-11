import { useEffect, useCallback } from "react";

import { useAuthStore } from "@eye-note/auth/extension";

import { useEventListener } from "@eye-note/ext/src/hooks/use-event-listener";

import { useElementHighlight } from "@eye-note/ext/src/hooks/use-element-highlight";

import { usePreserveScroll } from "@eye-note/ext/src/hooks/use-preserve-scroll";

import { useHighlightStore } from "@eye-note/ext/src/stores/highlight-store";
import { useModeStore, AppMode } from "@eye-note/ext/src/stores/use-mode-store";

export const INSPECTOR_BLOCKED_EVENT = "eye-note-inspector-blocked";
type InspectorBlockedReason = "backend-offline" | "unauthenticated";

export function useInspectorMode () {
    const {
        hoveredElement,
        setHoveredElement,
        setSelectedElement,
        clearAllHighlights,
    } = useHighlightStore();
    const modes = useModeStore( ( state ) => state.modes );
    const addMode = useModeStore( ( state ) => state.addMode );
    const removeMode = useModeStore( ( state ) => state.removeMode );
    const isAuthenticated = useAuthStore( ( state ) => state.isAuthenticated );
    const isConnected = ( modes & AppMode.CONNECTED ) === AppMode.CONNECTED;
    const isInspectorActive = ( modes & AppMode.INSPECTOR_MODE ) === AppMode.INSPECTOR_MODE;
    const preserveScroll = usePreserveScroll();
    const { handleElementHighlight } = useElementHighlight();

    const emitInspectorBlocked = useCallback( ( reason : InspectorBlockedReason ) => {
        if ( typeof window === "undefined" ) {
            return;
        }

        window.dispatchEvent(
            new CustomEvent( INSPECTOR_BLOCKED_EVENT, {
                detail: { reason },
            } )
        );
    }, [] );

    // Handle shift key events to toggle inspector mode
    const handleKeyDown = useCallback( ( e : KeyboardEvent ) => {
        if ( e.key !== "Shift" || e.repeat ) {
            return;
        }

        if ( !isInspectorActive ) {
            if ( !isConnected ) {
                console.warn( "[EyeNote] Cannot enter inspector mode until backend connection is established." );
                emitInspectorBlocked( "backend-offline" );
                return;
            }
            if ( !isAuthenticated ) {
                console.warn( "[EyeNote] Cannot enter inspector mode until you are signed in." );
                emitInspectorBlocked( "unauthenticated" );
                return;
            }
            // Only enter inspector mode if we're not in notes mode
            if ( ( modes & AppMode.NOTES_MODE ) !== AppMode.NOTES_MODE ) {
                addMode( AppMode.INSPECTOR_MODE );
            }
        }
    }, [ isInspectorActive, isConnected, modes, addMode, isAuthenticated, emitInspectorBlocked ] );

    const handleKeyUp = useCallback( ( e : KeyboardEvent ) => {
        if ( e.key === "Shift" ) {
            // Only remove inspector mode if we're not in notes mode
            if ( ( modes & AppMode.NOTES_MODE ) !== AppMode.NOTES_MODE ) {
                removeMode( AppMode.INSPECTOR_MODE );
                clearAllHighlights();
            }
        }
    }, [ modes, removeMode, clearAllHighlights ] );

    useEventListener( "keydown", handleKeyDown );
    useEventListener( "keyup", handleKeyUp );

    const isNotesMode = ( modes & AppMode.NOTES_MODE ) === AppMode.NOTES_MODE;

    useEffect( () => {
        if ( isNotesMode && !isInspectorActive ) {
            if ( isConnected && isAuthenticated ) {
                addMode( AppMode.INSPECTOR_MODE );
            }
        }
    }, [ isNotesMode, isInspectorActive, isConnected, isAuthenticated, addMode ] );

    // Handle mouse movement for element inspection
    const handleMouseMove = useCallback(
        ( e : MouseEvent ) => {
            const shouldHighlight = isInspectorActive || isNotesMode;
            handleElementHighlight( e.clientX, e.clientY, shouldHighlight );
        },
        [ handleElementHighlight, isInspectorActive, isNotesMode ]
    );

    useEventListener( "mousemove", handleMouseMove );

    // Handle element selection
    const selectElement = useCallback(
        ( element : HTMLElement ) => {
            preserveScroll( () => {
                setSelectedElement( element );
                addMode( AppMode.NOTES_MODE );
                if ( isConnected && isAuthenticated ) {
                    addMode( AppMode.INSPECTOR_MODE );
                }
            } );
        },
        [ setSelectedElement, addMode, isConnected, isAuthenticated, preserveScroll ]
    );

    // Handle dismissal
    const dismiss = useCallback( () => {
        // Clear all modes except DEBUG_MODE
        const currentModes = modes;
        if ( currentModes & AppMode.NOTES_MODE ) {
            removeMode( AppMode.NOTES_MODE );
        }
        if ( currentModes & AppMode.INSPECTOR_MODE ) {
            removeMode( AppMode.INSPECTOR_MODE );
        }

        // Clean up all states
        clearAllHighlights();
        setHoveredElement( null );
        setSelectedElement( null );
    }, [ modes, removeMode, clearAllHighlights, setHoveredElement, setSelectedElement ] );

    useEffect( () => {
        if ( ( !isConnected || !isAuthenticated ) && isInspectorActive ) {
            removeMode( AppMode.INSPECTOR_MODE );
            clearAllHighlights();
        }
    }, [ isConnected, isAuthenticated, isInspectorActive, removeMode, clearAllHighlights ] );

    useEffect( () => {
        return () => {
            const { modes: currentModes, setMode: resetMode } = useModeStore.getState();
            if ( ( currentModes & AppMode.INSPECTOR_MODE ) === AppMode.INSPECTOR_MODE ) {
                clearAllHighlights();
                resetMode( AppMode.NEUTRAL );
            }
        };
    }, [ clearAllHighlights ] );

    return {
        hoveredElement,
        setHoveredElement,
        setSelectedElement,
        isActive: isInspectorActive,
        selectElement,
        dismiss,
    };
}
