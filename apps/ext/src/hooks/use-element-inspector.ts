import { useRef, useCallback, useEffect } from "react";
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
    cleanup : () => void;
}

/**
 * A hook that handles element inspection visuals using the core useInspectorMode hook.
 * This hook focuses purely on the visual aspects of inspection and delegates
 * mode management and element detection to useInspectorMode.
 * 
 * This approach eliminates redundancy by:
 * 1. Removing duplicate keyboard event handling (already in useInspectorMode)
 * 2. Utilizing hoveredElement from useInspectorMode instead of duplicating element detection
 * 3. Focusing purely on the visual representation and event emission aspects
 */
export function useElementInspector ( {
    updateInspectionBounds,
    onInspectionEvent = () => {},
    excludeSelectors = []
} : UseElementInspectorProps ) : UseElementInspectorReturn {
    const inspectedElementRef = useRef<HTMLElement | null>( null );
    
    // Use the existing inspector mode hook for core functionality
    const inspectorMode = useInspectorMode();

    // Function to set cursor style and update bounds
    const updateInspectedElement = useCallback( ( element : HTMLElement | null ) => {
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

    // Monitor the hovered element from inspectorMode
    useEffect( () => {
        // Only process if the inspector is active
        if ( inspectorMode.isActive ) {
            const hoveredElement = inspectorMode.hoveredElement;
            
            // Skip elements that match excluded selectors
            if ( hoveredElement ) {
                // The core hook already applies some exclusion logic,
                // but we can add additional exclusions here if needed
                for ( const selector of excludeSelectors ) {
                    if ( hoveredElement.closest( selector ) ) {
                        return;
                    }
                }
                
                // Emit hover event
                if ( hoveredElement instanceof HTMLElement ) {
                    onInspectionEvent( { type: 'inspection:hover', element: hoveredElement } );
                    
                    // Update the inspected element
                    updateInspectedElement( hoveredElement );
                }
            }
        } else if ( inspectedElementRef.current ) {
            // Clean up when inspector becomes inactive
            onInspectionEvent( { type: 'inspection:hover', element: null } );
            onInspectionEvent( { type: 'inspection:clear' } );
            updateInspectedElement( null );
        }
    }, [
        inspectorMode.isActive, 
        inspectorMode.hoveredElement, 
        excludeSelectors, 
        onInspectionEvent, 
        updateInspectedElement
    ] );

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
        cleanup
    };
} 