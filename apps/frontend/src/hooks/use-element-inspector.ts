import { useRef, useCallback } from "react";

type InspectionBoundsUpdater = ( element : Element | null ) => void;

interface ElementHighlighter {
    addHighlight : ( element : HTMLElement ) => void;
    removeHighlight : ( element : HTMLElement ) => void;
    clearAllHighlights : () => void;
    setHoveredElement ?: ( element : HTMLElement | null ) => void;
}

interface ModeChecker {
    isInspectorMode : () => boolean;
    isNotesMode : () => boolean;
    enterInspectorMode : () => void;
    exitInspectorMode : () => void;
}

interface UseElementInspectorProps {
    updateInspectionBounds : InspectionBoundsUpdater;
    highlighter : ElementHighlighter;
    modeChecker : ModeChecker;
    excludeSelectors ?: string[];
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

export function useElementInspector ( {
    updateInspectionBounds,
    highlighter,
    modeChecker,
    excludeSelectors = []
} : UseElementInspectorProps ) : UseElementInspectorReturn {
    const inspectedElementRef = useRef<HTMLElement | null>( null );
    const isShiftPressedRef = useRef( false );

    // Function to set the inspected element
    const setInspectedElement = useCallback( ( element : HTMLElement | null ) => {
        // Clean up previous element if it exists
        if ( inspectedElementRef.current && element !== inspectedElementRef.current ) {
            inspectedElementRef.current.style.cursor = "";
            // Clean up previous element highlight if clearing or changing
            highlighter.removeHighlight( inspectedElementRef.current );
        }

        // Set the new element
        inspectedElementRef.current = element;

        // Set up new element if it exists
        if ( element ) {
            element.style.cursor = "none";
            highlighter.addHighlight( element );
            updateInspectionBounds( element );
        } else {
            // Clear the overlay when element is null
            updateInspectionBounds( null );
        }
    }, [ updateInspectionBounds, highlighter ] );

    // Handle mouse movement
    const handleMouseMove = useCallback( ( e : MouseEvent ) => {
        if ( !modeChecker.isInspectorMode() || modeChecker.isNotesMode() ) {
            if ( inspectedElementRef.current ) {
                // Clean up element and highlights
                if ( highlighter.setHoveredElement ) {
                    highlighter.setHoveredElement( null );
                }
                highlighter.clearAllHighlights();
                setInspectedElement( null );
            }
            return;
        }

        const element = document.elementFromPoint( e.clientX, e.clientY );

        if ( !element || element === inspectedElementRef.current ) {
            return;
        }

        // Check against excluded selectors
        for ( const selector of excludeSelectors ) {
            if ( element.closest( selector ) ) {
                return;
            }
        }

        if ( element instanceof HTMLElement ) {
            setInspectedElement( element );
        }
    }, [ setInspectedElement, modeChecker, highlighter, excludeSelectors ] );

    // Handle keyboard events
    const handleKeyDown = useCallback( ( e : KeyboardEvent ) => {
        if ( e.key === "Shift" && !isShiftPressedRef.current ) {
            isShiftPressedRef.current = true;
            // Update mode
            modeChecker.enterInspectorMode();

            // Reset state if not in notes mode
            if ( !modeChecker.isNotesMode() ) {
                setInspectedElement( null );
            }

            if ( window.getSelection ) {
                window.getSelection()?.removeAllRanges();
            }
        }
    }, [ setInspectedElement, modeChecker ] );

    const handleKeyUp = useCallback( ( e : KeyboardEvent ) => {
        if ( e.key === "Shift" ) {
            isShiftPressedRef.current = false;
            // Only remove inspector mode if we're not in notes mode
            if ( !modeChecker.isNotesMode() ) {
                modeChecker.exitInspectorMode();

                // Clean up any inspected element
                if ( inspectedElementRef.current ) {
                    setInspectedElement( null );
                }
            }
        }
    }, [ setInspectedElement, modeChecker ] );

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