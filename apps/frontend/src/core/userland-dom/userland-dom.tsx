import React, { useState, useEffect, useCallback } from "react";
import { CursorDotWrapper } from "../../components/cursor-dot-wrapper";
import { HighlightOverlay } from "../../components/highlight-overlay";
import { ThemeProvider } from "../theme/theme-provider";
import { useModeStore, AppMode } from "../../stores/use-mode-store";
import { useEventListener } from "../../hooks/use-event-listener";
import { useElementInspector } from "../../hooks/use-element-inspector";

export const UserlandDOM : React.FC = () => {
    const [ overlayStyle, setOverlayStyle ] = useState( {
        top: "0px",
        left: "0px",
        width: "0px",
        height: "0px",
    } );
    const [ isVisible, setIsVisible ] = useState( false );

    // Update overlay position
    const updateOverlay = useCallback( ( element : Element | null ) => {
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

    // Use the element inspector hook
    const {
        handleMouseMove,
        handleKeyDown,
        handleKeyUp,
        cleanup
    } = useElementInspector( {
        updateOverlay
    } );

    // Track mode changes using the new system
    const hasActiveMode = useModeStore( ( state ) =>
        state.hasAnyMode( [ AppMode.INSPECTOR_MODE, AppMode.NOTES_MODE ] )
    );

    // Setup window properties
    useEffect( () => {
        ( window as Window ).updateOverlay = updateOverlay;

        return () => {
            delete ( window as Window ).updateOverlay;
            cleanup();
        };
    }, [ updateOverlay, cleanup ] );

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
