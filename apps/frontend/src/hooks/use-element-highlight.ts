import { useCallback } from 'react';
import { useHighlightStore } from "../stores/highlight-store";
import { AppMode, useModeStore } from "../stores/use-mode-store";

/**
 * Hook to handle element highlighting logic
 * Separates highlighting concerns from the inspector mode
 */
export function useElementHighlight () {
    const { setHoveredElement } = useHighlightStore();
    const { isMode } = useModeStore();

    const handleElementHighlight = useCallback( ( x : number, y : number ) => {
        // If we're in notes mode, don't process highlighting
        if ( isMode( AppMode.NOTES_MODE ) ) {
            setHoveredElement( null );
            return;
        }

        if ( !isMode( AppMode.INSPECTOR_MODE ) ) {
            setHoveredElement( null );
            return;
        }

        const element = document.elementFromPoint( x, y );
        if ( !element ) return;

        // Don't highlight plugin elements
        if ( element.closest( ".notes-plugin" ) || element.closest( "#eye-note-shadow-dom" ) ) {
            setHoveredElement( null );
            return;
        }

        setHoveredElement( element );
    }, [ isMode, setHoveredElement ] );

    return {
        handleElementHighlight
    };
} 