import { useRef, useCallback } from "react";
import { useInspectorMode } from "./use-inspector-mode";

type InspectionBoundsUpdater = ( element : Element | null ) => void;

interface ElementHighlighter {
    addHighlight : ( element : HTMLElement ) => void;
    removeHighlight : ( element : HTMLElement ) => void;
    clearAllHighlights : () => void;
    setHoveredElement ?: ( element : HTMLElement | null ) => void;
}

interface UseElementInspectorProps {
    updateInspectionBounds : InspectionBoundsUpdater;
    highlighter : ElementHighlighter;
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
    excludeSelectors = []
} : UseElementInspectorProps ) : UseElementInspectorReturn {
    const inspectedElementRef = useRef<HTMLElement | null>( null );
    const isShiftPressedRef = useRef( false );
    
    // Use the existing inspector mode hook
    const inspectorMode = useInspectorMode();

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

    // Handle mouse movement - defer to useInspectorMode for mode checking
    const handleMouseMove = useCallback( ( e : MouseEvent ) => {
        // Use isActive from inspector mode hook instead of our custom logic
        if ( !inspectorMode.isActive ) {
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
    }, [ setInspectedElement, inspectorMode.isActive, highlighter, excludeSelectors ] );

    // Handle keyboard events - already handled by useInspectorMode
    const handleKeyDown = useCallback( ( e : KeyboardEvent ) => {
        if ( e.key === "Shift" && !isShiftPressedRef.current ) {
            isShiftPressedRef.current = true;
            
            // Reset selected element
            setInspectedElement( null );
            
            // Clear text selection
            if ( window.getSelection ) {
                window.getSelection()?.removeAllRanges();
            }
        }
    }, [ setInspectedElement ] );

    const handleKeyUp = useCallback( ( e : KeyboardEvent ) => {
        if ( e.key === "Shift" ) {
            isShiftPressedRef.current = false;
            
            // Clean up any inspected element if needed
            if ( inspectedElementRef.current ) {
                setInspectedElement( null );
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