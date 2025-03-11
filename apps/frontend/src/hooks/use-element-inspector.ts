import { useRef, useCallback } from "react";
import { useHighlightStore } from "../stores/highlight-store";
import { useModeStore, AppMode } from "../stores/use-mode-store";

type UpdateOverlayFunction = ( element : Element | null ) => void;

interface UseElementInspectorProps {
    updateOverlay : UpdateOverlayFunction;
}

interface UseElementInspectorReturn {
    inspectedElementRef : React.RefObject<HTMLElement | null>;
    setInspectedElement : ( element : HTMLElement | null ) => void;
    handleMouseMove : ( e : MouseEvent ) => void;
    handleKeyDown : ( e : KeyboardEvent ) => void;
    handleKeyUp : ( e : KeyboardEvent ) => void;
    isShiftPressed : boolean;
    cleanup : () => void;
}

export function useElementInspector ( { updateOverlay } : UseElementInspectorProps ) : UseElementInspectorReturn {
    const inspectedElementRef = useRef<HTMLElement | null>( null );
    const isShiftPressedRef = useRef( false );

    // Function to set the inspected element
    const setInspectedElement = useCallback( ( element : HTMLElement | null ) => {
        // Clean up previous element if it exists
        if ( inspectedElementRef.current && element !== inspectedElementRef.current ) {
            inspectedElementRef.current.style.cursor = "";
            // Clean up previous element highlight if clearing or changing
            const highlightStore = useHighlightStore.getState();
            highlightStore.removeHighlight( inspectedElementRef.current );
        }

        // Set the new element
        inspectedElementRef.current = element;

        // Set up new element if it exists
        if ( element ) {
            element.style.cursor = "none";
            const highlightStore = useHighlightStore.getState();
            highlightStore.addHighlight( element );
            updateOverlay( element );
        } else {
            // Clear the overlay when element is null
            updateOverlay( null );
        }
    }, [ updateOverlay ] );

    // Handle mouse movement
    const handleMouseMove = useCallback( ( e : MouseEvent ) => {
        const modeStore = useModeStore.getState();
        if ( !modeStore.isMode( AppMode.INSPECTOR_MODE ) || modeStore.isMode( AppMode.NOTES_MODE ) ) {
            if ( inspectedElementRef.current ) {
                // Clean up element and highlights
                const highlightStore = useHighlightStore.getState();
                highlightStore.setHoveredElement( null );
                highlightStore.clearAllHighlights();
                setInspectedElement( null );
            }
            return;
        }

        const element = document.elementFromPoint( e.clientX, e.clientY );

        if (
            !element ||
            element === inspectedElementRef.current ||
            element.closest( `#eye-note-shadow-dom` ) ||
            element.closest( ".notes-plugin" )
        ) {
            return;
        }

        if ( element instanceof HTMLElement ) {
            setInspectedElement( element );
        }
    }, [ setInspectedElement ] );

    // Handle keyboard events
    const handleKeyDown = useCallback( ( e : KeyboardEvent ) => {
        if ( e.key === "Shift" && !isShiftPressedRef.current ) {
            isShiftPressedRef.current = true;
            // Update mode store state
            useModeStore.getState().addMode( AppMode.INSPECTOR_MODE );

            // Reset state if not in notes mode
            if ( !useModeStore.getState().isMode( AppMode.NOTES_MODE ) ) {
                setInspectedElement( null );
            }

            if ( window.getSelection ) {
                window.getSelection()?.removeAllRanges();
            }
        }
    }, [ setInspectedElement ] );

    const handleKeyUp = useCallback( ( e : KeyboardEvent ) => {
        if ( e.key === "Shift" ) {
            isShiftPressedRef.current = false;
            // Only remove inspector mode if we're not in notes mode
            const modeStore = useModeStore.getState();
            if ( !modeStore.isMode( AppMode.NOTES_MODE ) ) {
                modeStore.removeMode( AppMode.INSPECTOR_MODE );

                // Clean up any inspected element
                if ( inspectedElementRef.current ) {
                    setInspectedElement( null );
                }
            }
        }
    }, [ setInspectedElement ] );

    // Clean up function for external use
    const cleanup = useCallback( () => {
        if ( inspectedElementRef.current ) {
            inspectedElementRef.current.style.cursor = "";
            inspectedElementRef.current = null;
        }
    }, [] );

    return {
        inspectedElementRef,
        setInspectedElement,
        handleMouseMove,
        handleKeyDown,
        handleKeyUp,
        isShiftPressed: isShiftPressedRef.current,
        cleanup
    };
} 