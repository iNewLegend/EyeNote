import { useEffect, useCallback } from "react";
import { useHighlightStore } from "../stores/highlight-store";
import { useModeStore, AppMode } from "../stores/use-mode-store";
import { usePreserveScroll } from "./use-preserve-scroll";
import { useEventListener } from "./use-event-listener";
import { useElementHighlight } from "./use-element-highlight";

export function useInspectorMode () {
    const {
        hoveredElement,
        setHoveredElement,
        setSelectedElement,
        clearAllHighlights,
    } = useHighlightStore();
    const { modes, setMode, addMode, removeMode, isMode } = useModeStore();
    const preserveScroll = usePreserveScroll();
    const { handleElementHighlight } = useElementHighlight();

    // Handle shift key events to toggle inspector mode
    const handleKeyDown = useCallback( ( e : KeyboardEvent ) => {
        if ( e.key === "Shift" && !isMode( AppMode.INSPECTOR_MODE ) ) {
            // Only enter inspector mode if we're not in notes mode
            if ( !isMode( AppMode.NOTES_MODE ) ) {
                addMode( AppMode.INSPECTOR_MODE );
            }
        }
    }, [ isMode, addMode ] );

    const handleKeyUp = useCallback( ( e : KeyboardEvent ) => {
        if ( e.key === "Shift" ) {
            // Only remove inspector mode if we're not in notes mode
            if ( !isMode( AppMode.NOTES_MODE ) ) {
                removeMode( AppMode.INSPECTOR_MODE );
                clearAllHighlights();
            }
        }
    }, [ isMode, removeMode, clearAllHighlights ] );

    useEventListener( 'keydown', handleKeyDown );
    useEventListener( 'keyup', handleKeyUp );

    // Handle mouse movement for element inspection
    const handleMouseMove = useCallback( ( e : MouseEvent ) => {
        handleElementHighlight( e.clientX, e.clientY );
    }, [ handleElementHighlight ] );

    useEventListener( 'mousemove', handleMouseMove );

    // Handle element selection
    const selectElement = useCallback(
        ( element : HTMLElement ) => {
            preserveScroll( () => {
                setSelectedElement( element );
                addMode( AppMode.NOTES_MODE );
            } );
        },
        [ setSelectedElement, addMode, preserveScroll ]
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
    }, [
        modes,
        removeMode,
        clearAllHighlights,
        setHoveredElement,
        setSelectedElement,
    ] );

    // Cleanup on unmount
    useEffect( () => {
        return () => {
            if ( isMode( AppMode.INSPECTOR_MODE ) ) {
                clearAllHighlights();
                setMode( AppMode.NEUTRAL );
            }
        };
    }, [ isMode, clearAllHighlights, setMode ] );

    return {
        hoveredElement,
        setHoveredElement,
        setSelectedElement,
        isActive: isMode( AppMode.INSPECTOR_MODE ),
        selectElement,
        dismiss,
    };
}
