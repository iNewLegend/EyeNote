import React, { useState, useEffect, useRef, useCallback } from "react";
import { CursorDotWrapper } from "../../components/cursor-dot-wrapper";
import { HighlightOverlay } from "../../components/highlight-overlay";
import { ThemeProvider } from "../theme/theme-provider";
import { useModeStore, AppMode } from "../../stores/use-mode-store";
import { useHighlightStore } from "../../stores/highlight-store";
import { useEventListener } from "../../hooks/use-event-listener";

export const UserlandDOM : React.FC = () => {
    const [ overlayStyle, setOverlayStyle ] = useState( {
        top: "0px",
        left: "0px",
        width: "0px",
        height: "0px",
    } );
    const [ isVisible, setIsVisible ] = useState( false );
    const inspectedElementRef = useRef<HTMLElement | null>( null );
    const [ isShiftPressed, setIsShiftPressed ] = useState( false );

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
        }
    }, [] );

    // Track mode changes using the new system
    const hasActiveMode = useModeStore( ( state ) =>
        state.hasAnyMode( [ AppMode.INSPECTOR_MODE, AppMode.NOTES_MODE ] )
    );

    // Update overlay position
    const updateOverlay = ( element : Element | null ) => {
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
    };

    // Handle mouse movement
    const handleMouseMove = ( e : MouseEvent ) => {
        const modeStore = useModeStore.getState();
        if ( !modeStore.isMode( AppMode.INSPECTOR_MODE ) || modeStore.isMode( AppMode.NOTES_MODE ) ) {
            if ( inspectedElementRef.current ) {
                // Clean up element and highlights
                const highlightStore = useHighlightStore.getState();
                highlightStore.setHoveredElement( null );
                highlightStore.clearAllHighlights();
                setInspectedElement( null );

                if ( !inspectedElementRef.current ) {
                    updateOverlay( null );
                }
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
    };

    // Handle keyboard events
    const handleKeyDown = ( e : KeyboardEvent ) => {
        if ( e.key === "Shift" && !isShiftPressed ) {
            setIsShiftPressed( true );
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
    };

    const handleKeyUp = ( e : KeyboardEvent ) => {
        if ( e.key === "Shift" ) {
            setIsShiftPressed( false );
            // Only remove inspector mode if we're not in notes mode
            const modeStore = useModeStore.getState();
            if ( !modeStore.isMode( AppMode.NOTES_MODE ) ) {
                modeStore.removeMode( AppMode.INSPECTOR_MODE );

                // Clean up any inspected element
                if ( inspectedElementRef.current ) {
                    setInspectedElement( null );
                }

                // Clear the overlay
                updateOverlay( null );
            }
        }
    };

    // Setup event listeners
    useEffect( () => {
        ( window as Window ).updateOverlay = updateOverlay;

        return () => {
            delete ( window as Window ).updateOverlay;

            // Clean up any remaining cursor styles
            if ( inspectedElementRef.current ) {
                inspectedElementRef.current.style.cursor = "";
                inspectedElementRef.current = null;
            }
        };
    }, [ isShiftPressed, setInspectedElement ] );

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
