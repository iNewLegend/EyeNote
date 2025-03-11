import { useRef, useCallback } from "react";
import { useInspectorMode } from "./use-inspector-mode";

type InspectionBoundsUpdater = ( element : Element | null ) => void;

export type InspectionEvent = 
  | { type : 'inspection:highlight'; element : HTMLElement }
  | { type : 'inspection:unhighlight'; element : HTMLElement }
  | { type : 'inspection:hover'; element : HTMLElement | null }
  | { type : 'inspection:clear' };

export type InspectionEventHandler = ( event : InspectionEvent ) => void;

interface UseElementInspectorProps {
    updateInspectionBounds : InspectionBoundsUpdater;
    onInspectionEvent ?: InspectionEventHandler;
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
    onInspectionEvent = () => {},
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
            // Emit unhighlight event for previous element
            onInspectionEvent( { 
                type: 'inspection:unhighlight', 
                element: inspectedElementRef.current 
            } );
        }

        // Set the new element
        inspectedElementRef.current = element;

        // Set up new element if it exists
        if ( element ) {
            element.style.cursor = "none";
            // Emit highlight event for new element
            onInspectionEvent( { type: 'inspection:highlight', element } );
            updateInspectionBounds( element );
        } else {
            // Clear the overlay when element is null
            updateInspectionBounds( null );
        }
    }, [ updateInspectionBounds, onInspectionEvent ] );

    // Handle mouse movement - defer to useInspectorMode for mode checking
    const handleMouseMove = useCallback( ( e : MouseEvent ) => {
        // Use isActive from inspector mode hook instead of our custom logic
        if ( !inspectorMode.isActive ) {
            if ( inspectedElementRef.current ) {
                // Clean up element and emit events
                onInspectionEvent( { type: 'inspection:hover', element: null } );
                onInspectionEvent( { type: 'inspection:clear' } );
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
            // Emit hover event before selection
            onInspectionEvent( { type: 'inspection:hover', element } );
            setInspectedElement( element );
        }
    }, [ setInspectedElement, inspectorMode.isActive, onInspectionEvent, excludeSelectors ] );

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
            
            // useInspectorMode already handles the mode changes
            // We just need to clean up our internal state if the element
            // is no longer being inspected
            if ( !inspectorMode.isActive ) {
                if ( inspectedElementRef.current ) {
                    setInspectedElement( null );
                }
            }
        }
    }, [ setInspectedElement, inspectorMode.isActive ] );

    // Clean up function for external use
    const cleanup = useCallback( () => {
        if ( inspectedElementRef.current ) {
            inspectedElementRef.current.style.cursor = "";
            onInspectionEvent( { type: 'inspection:clear' } );
            inspectedElementRef.current = null;
        }
    }, [ onInspectionEvent ] );

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