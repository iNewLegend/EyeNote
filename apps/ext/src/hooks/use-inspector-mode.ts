import { useEffect, useCallback } from "react";
import { useHighlightStore } from "../stores/highlight-store";
import { useModeStore, AppMode } from "../stores/use-mode-store";
import { usePreserveScroll } from "./use-preserve-scroll";
import { useEventListener } from "./use-event-listener";
import { useElementHighlight } from "./use-element-highlight";
import { useAuthStore } from "@eye-note/auth/extension";

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

    // Handle shift key events to toggle inspector mode
    const handleKeyDown = useCallback( ( e : KeyboardEvent ) => {
        if ( e.key === "Shift" && !isInspectorActive ) {
            if ( !isConnected ) {
                console.warn( "[EyeNote] Cannot enter inspector mode until backend connection is established." );
                return;
            }
            if ( !isAuthenticated ) {
                console.warn( "[EyeNote] Cannot enter inspector mode until you are signed in." );
                return;
            }
            // Only enter inspector mode if we're not in notes mode
            if ( ( modes & AppMode.NOTES_MODE ) !== AppMode.NOTES_MODE ) {
                addMode( AppMode.INSPECTOR_MODE );
            }
        }
    }, [ isInspectorActive, isConnected, modes, addMode, isAuthenticated ] );

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
