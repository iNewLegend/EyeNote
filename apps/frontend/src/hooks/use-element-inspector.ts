import { useRef, useCallback } from "react";
import { useInspectorMode } from "./use-inspector-mode";
import { useModeStore, AppMode } from "../stores/use-mode-store";

type InspectionBoundsUpdater = ( element : Element | null ) => void;

export type InspectionEvent = 
  | { type : 'element:highlight'; element : HTMLElement }
  | { type : 'element:unhighlight'; element : HTMLElement }
  | { type : 'element:hover'; element : HTMLElement | null }
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
                type: 'element:unhighlight', 
                element: inspectedElementRef.current 
            } );
        }

        // Set the new element
        inspectedElementRef.current = element;

        // Set up new element if it exists
        if ( element ) {
            element.style.cursor = "none";
            // Emit highlight event for new element
            onInspectionEvent( { type: 'element:highlight', element } );
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
                onInspectionEvent( { type: 'element:hover', element: null } );
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
            onInspectionEvent( { type: 'element:hover', element } );
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
            
            // Important: Only clean up if notes mode is NOT active
            // We need to check this from useInspectorMode because 
            // inspector mode should remain active during notes mode
            const modeStore = useModeStore.getState();
            const isNotesMode = modeStore.isMode( AppMode.NOTES_MODE );
            
            if ( !isNotesMode ) {
                // Clean up any inspected element if needed
                if ( inspectedElementRef.current ) {
                    setInspectedElement( null );
                }
                
                // The actual mode changes are handled by useInspectorMode,
                // but we still need to ensure cleanup is proper
                onInspectionEvent( { type: 'inspection:clear' } );
            }
        }
    }, [ setInspectedElement, onInspectionEvent ] );

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