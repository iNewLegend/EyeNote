import { useRef, useCallback, useEffect } from "react";

import { useHighlightStore } from "@eye-note/ext/src/stores/highlight-store";
import { useModeStore, AppMode } from "@eye-note/ext/src/stores/use-mode-store";

type InspectionBoundsUpdater = ( element : Element | null ) => void;

export type InspectionEvent =
  | { type : "inspection:highlight"; element : HTMLElement }
  | { type : "inspection:unhighlight"; element : HTMLElement }
  | { type : "inspection:hover"; element : HTMLElement | null }
  | { type : "inspection:clear" };

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
 * A hook that handles element inspection visuals by subscribing directly to highlight/mode stores.
 * This hook focuses purely on the visual aspects of inspection and relies on the shared inspector
 * state that is managed elsewhere (see useInspectorMode for the keyboard/mode logic).
 */
export function useElementInspector ( {
    updateInspectionBounds,
    onInspectionEvent = () => {},
    excludeSelectors = []
} : UseElementInspectorProps ) : UseElementInspectorReturn {
    const inspectedElementRef = useRef<HTMLElement | null>( null );
    const hoveredElement = useHighlightStore( ( state ) => state.hoveredElement );
    const isInspectorActive = useModeStore( ( state ) => state.isMode( AppMode.INSPECTOR_MODE ) );

    // Function to set cursor style and update bounds
    const updateInspectedElement = useCallback( ( element : HTMLElement | null ) => {
        // Clean up previous element if it exists
        if ( inspectedElementRef.current && element !== inspectedElementRef.current ) {
            inspectedElementRef.current.style.cursor = "";
            // Emit unhighlight event for previous element
            onInspectionEvent( {
                type: "inspection:unhighlight",
                element: inspectedElementRef.current
            } );
        }

        // Set the new element
        inspectedElementRef.current = element;

        // Set up new element if it exists
        if ( element ) {
            element.style.cursor = "none";
            // Emit highlight event for new element
            onInspectionEvent( { type: "inspection:highlight", element } );
            updateInspectionBounds( element );
        } else {
            // Clear the overlay when element is null
            updateInspectionBounds( null );
        }
    }, [ updateInspectionBounds, onInspectionEvent ] );

    // Monitor the hovered element from the shared highlight store
    useEffect( () => {
        // Only process if the inspector is active
        if ( isInspectorActive ) {
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
                    onInspectionEvent( { type: "inspection:hover", element: hoveredElement } );

                    // Update the inspected element
                    updateInspectedElement( hoveredElement );
                }
            }
        } else if ( inspectedElementRef.current ) {
            // Clean up when inspector becomes inactive
            onInspectionEvent( { type: "inspection:hover", element: null } );
            onInspectionEvent( { type: "inspection:clear" } );
            updateInspectedElement( null );
        }
    }, [
        isInspectorActive,
        hoveredElement,
        excludeSelectors,
        onInspectionEvent,
        updateInspectedElement
    ] );

    // Clean up function for external use
    const cleanup = useCallback( () => {
        if ( inspectedElementRef.current ) {
            inspectedElementRef.current.style.cursor = "";
            onInspectionEvent( { type: "inspection:clear" } );
            inspectedElementRef.current = null;
        }
    }, [ onInspectionEvent ] );

    return {
        inspectedElementRef,
        cleanup
    };
}
