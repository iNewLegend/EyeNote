import { useCallback } from "react";

/**
 * A hook that provides utilities for preserving scroll position during operations
 * that might cause unwanted scroll changes.
 */
export function usePreserveScroll () {
    const preserveScroll = useCallback( ( action : () => void ) => {
        // Store current scroll position
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        // Execute the action
        action();

        // Restore scroll position in the next frame
        requestAnimationFrame( () => {
            window.scrollTo( scrollX, scrollY );
        } );
    }, [] );

    return preserveScroll;
}
