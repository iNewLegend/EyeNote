import { useEffect, useCallback } from "react";
import { useHighlightStore } from "../stores/highlight-store";
import { useNotesStore } from "../stores/notes-store";
import { useModeStore, AppMode } from "../stores/use-mode-store";

export function useInspectorMode () {
    const {
        hoveredElement,
        setHoveredElement,
        setSelectedElement,
        clearAllHighlights,
        highlightedElements,
    } = useHighlightStore();
    const { modes, setMode, addMode, removeMode, isMode } = useModeStore();
    const { hasNoteForElement } = useNotesStore();

    // Handle shift key events to toggle inspector mode
    useEffect( () => {
        const handleKeyDown = ( e : KeyboardEvent ) => {
            if ( e.key === "Shift" && !isMode( AppMode.INSPECTOR_MODE ) ) {
                // Only enter inspector mode if we're not in notes mode
                if ( !isMode( AppMode.NOTES_MODE ) ) {
                    addMode( AppMode.INSPECTOR_MODE );
                }
            }
        };

        const handleKeyUp = ( e : KeyboardEvent ) => {
            if ( e.key === "Shift" ) {
                // Only remove inspector mode if we're not in notes mode
                if ( !isMode( AppMode.NOTES_MODE ) ) {
                    removeMode( AppMode.INSPECTOR_MODE );
                    clearAllHighlights();
                }
            }
        };

        document.addEventListener( "keydown", handleKeyDown );
        document.addEventListener( "keyup", handleKeyUp );

        return () => {
            document.removeEventListener( "keydown", handleKeyDown );
            document.removeEventListener( "keyup", handleKeyUp );
        };
    }, [ isMode, addMode, removeMode, clearAllHighlights ] );

    // Handle mouse movement for element inspection
    useEffect( () => {
        const handleMouseMove = ( e : MouseEvent ) => {
            // If we're in notes mode, don't process mouse movements for highlighting
            if ( isMode( AppMode.NOTES_MODE ) ) {
                return;
            }

            if ( !isMode( AppMode.INSPECTOR_MODE ) ) {
                setHoveredElement( null );
                return;
            }

            const element = document.elementFromPoint( e.clientX, e.clientY );
            if ( !element ) return;

            // Don't highlight plugin elements
            if ( element.closest( ".notes-plugin" ) || element.closest( "#eye-note-shadow-dom" ) ) {
                setHoveredElement( null );
                return;
            }

            setHoveredElement( element );
        };

        document.addEventListener( "mousemove", handleMouseMove );

        return () => {
            document.removeEventListener( "mousemove", handleMouseMove );
        };
    }, [
        isMode,
        setHoveredElement,
        hasNoteForElement,
        highlightedElements,
    ] );

    // Handle element selection
    const selectElement = useCallback(
        ( element : HTMLElement ) => {
            // Store current scroll position
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;

            setSelectedElement( element );
            addMode( AppMode.NOTES_MODE );

            // Restore scroll position
            requestAnimationFrame( () => {
                window.scrollTo( scrollX, scrollY );
            } );
        },
        [ setSelectedElement, addMode ]
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
