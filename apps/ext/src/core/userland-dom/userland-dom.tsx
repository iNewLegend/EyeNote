import React, { useState, useEffect, useCallback, useMemo } from "react";

import { CursorDotWrapper } from "@eye-note/ext/src/components/cursor-dot-wrapper";
import { HighlightOverlay } from "@eye-note/ext/src/components/highlight-overlay";
import { useModeStore, AppMode } from "@eye-note/ext/src/stores/use-mode-store";
import { useHighlightStore } from "@eye-note/ext/src/stores/highlight-store";

import { useElementInspector } from "@eye-note/ext/src/hooks/use-element-inspector";

import type { InspectionEvent } from "@eye-note/ext/src/hooks/use-element-inspector";

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
            case "inspection:highlight":
                highlightStore.addHighlight( event.element );
                break;
            case "inspection:unhighlight":
                highlightStore.removeHighlight( event.element );
                break;
            case "inspection:hover":
                highlightStore.setHoveredElement( event.element );
                break;
            case "inspection:clear":
                highlightStore.clearAllHighlights();
                break;
        }
    }, [] );

    // Define excluded selectors
    const excludeSelectors = useMemo( () => [
        "#eye-note-shadow-dom",
        ".notes-plugin"
    ], [] );

    // Use the simplified element inspector hook with event-based interface
    const { cleanup } = useElementInspector( {
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
        if ( typeof window !== "undefined" ) {
            window.updateInspectionBounds = updateInspectionBounds;
        }

        return () => {
            // Clean up window property if it exists
            if ( typeof window !== "undefined" && window.updateInspectionBounds ) {
                delete window.updateInspectionBounds;
            }
            cleanup();
        };
    }, [ updateInspectionBounds, cleanup ] );

    // Handle visibility
    useEffect( () => {
        setIsVisible( hasActiveMode );
    }, [ hasActiveMode ] );

    return (
        <>
            <CursorDotWrapper />
            <HighlightOverlay style={ overlayStyle } visible={ isVisible } />
        </>
    );
};
