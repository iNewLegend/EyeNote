import { useCallback } from 'react';
import { useHighlightStore } from "../stores/highlight-store";

/**
 * Generic hook to handle element highlighting logic
 * Provides pure element highlighting functionality without mode awareness
 */
export function useElementHighlight () {
    const { setHoveredElement } = useHighlightStore();

    const handleElementHighlight = useCallback( ( x : number, y : number, shouldHighlight : boolean ) => {
        if ( !shouldHighlight ) {
            setHoveredElement( null );
            return;
        }

        const element = document.elementFromPoint( x, y );
        if ( !element ) {
            setHoveredElement( null );
            return;
        }

        // Don't highlight plugin elements
        if ( element.closest( ".notes-plugin" ) || element.closest( "#eye-note-shadow-dom" ) ) {
            setHoveredElement( null );
            return;
        }

        setHoveredElement( element );
    }, [ setHoveredElement ] );

    return {
        handleElementHighlight
    };
} 