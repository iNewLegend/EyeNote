import React, { useState, useEffect, useCallback, useMemo } from "react";
import { CursorDotWrapper } from "../../components/cursor-dot-wrapper";
import { HighlightOverlay } from "../../components/highlight-overlay";
import { ThemeProvider } from "../theme/theme-provider";
import { useModeStore, AppMode } from "../../stores/use-mode-store";
import { useHighlightStore } from "../../stores/highlight-store";
import { useEventListener } from "../../hooks/use-event-listener";
import { useElementInspector, InspectionEvent } from "../../hooks/use-element-inspector";

// Extend Window interface to include our custom property
declare global {
    interface Window {
        updateInspectionBounds ?: ( element : Element | null ) => void;
    }
}

export const UserlandDOM : React.FC = () => {
    const [ overlayStyle, setOverlayStyle ] = useState( {
        top: "0px",
        left: "0px",
        width: "0px",
        height: "0px",
    } );
    const [ isVisible, setIsVisible ] = useState( false );

    // Handle visual representation of the inspected element
    const updateInspectionBounds = useCallback( ( element : Element | null ) => {
        if ( !element ) {
            setOverlayStyle( ( prev ) => ( { ...prev } ) );
            return;
        }

        const rect = element.getBoundingClientRect();
        setOverlayStyle( {
            top: `${ rect.top }px`,
            left: `${ rect.left }px`,
            width: `${ rect.width }px`,
            height: `${ rect.height }px`,
        } );
    }, [] );

    // Handle inspection events
    const handleInspectionEvent = useCallback( ( event : InspectionEvent ) => {
        const highlightStore = useHighlightStore.getState();
        
        switch ( event.type ) {
            case 'inspection:highlight':
                highlightStore.addHighlight( event.element );
                break;
            case 'inspection:unhighlight':
                highlightStore.removeHighlight( event.element );
                break;
            case 'inspection:hover':
                highlightStore.setHoveredElement( event.element );
                break;
            case 'inspection:clear':
                highlightStore.clearAllHighlights();
                break;
        }
    }, [] );

    // Define excluded selectors
    const excludeSelectors = useMemo( () => [
        `#eye-note-shadow-dom`,
        `.notes-plugin`
    ], [] );

    // Use the element inspector hook with event-based interface
    const {
        handleMouseMove,
        handleKeyDown,
        handleKeyUp,
        cleanup
    } = useElementInspector( {
        updateInspectionBounds,
        onInspectionEvent: handleInspectionEvent,
        excludeSelectors
    } );

    // Track mode changes using the new system
    const hasActiveMode = useModeStore( ( state ) =>
        state.hasAnyMode( [ AppMode.INSPECTOR_MODE, AppMode.NOTES_MODE ] )
    );

    // Setup window properties for legacy support
    useEffect( () => {
        // Only add to window if needed for compatibility with legacy code
        if ( typeof window !== 'undefined' ) {
            window.updateInspectionBounds = updateInspectionBounds;
        }

        return () => {
            // Clean up window property if it exists
            if ( typeof window !== 'undefined' && window.updateInspectionBounds ) {
                delete window.updateInspectionBounds;
            }
            cleanup();
        };
    }, [ updateInspectionBounds, cleanup ] );

    // Add event listeners using useEventListener hook - React-friendly approach
    useEventListener( "mousemove", handleMouseMove );
    useEventListener( "keydown", handleKeyDown );
    useEventListener( "keyup", handleKeyUp );

    // Handle visibility
    useEffect( () => {
        setIsVisible( hasActiveMode );
    }, [ hasActiveMode ] );

    return (
        <ThemeProvider>
            <CursorDotWrapper />
            <HighlightOverlay style={overlayStyle} visible={isVisible} />
        </ThemeProvider>
    );
};
