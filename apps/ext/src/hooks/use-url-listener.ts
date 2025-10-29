import { useRef, useEffect } from "react";

export function useUrlListener ( setCurrentUrl: ( url: string ) => void ) {
    const lastKnownUrlRef = useRef( window.location.href );

    useEffect( () => {
        const updateUrlIfChanged = () => {
            const href = window.location.href;
            if ( lastKnownUrlRef.current !== href ) {
                lastKnownUrlRef.current = href;
                setCurrentUrl( href );
            }
        };

        const handleVisibilityChange = () => {
            if ( ! document.hidden ) {
                updateUrlIfChanged();
            }
        };

        const history = window.history;
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        const patchedPushState: History["pushState"] = function ( ... args ) {
            const result = originalPushState.apply(
                history,
                args as Parameters<History["pushState"]>
            );
            updateUrlIfChanged();
            return result;
        };

        const patchedReplaceState: History["replaceState"] = function ( ... args ) {
            const result = originalReplaceState.apply(
                history,
                args as Parameters<History["replaceState"]>
            );
            updateUrlIfChanged();
            return result;
        };

        window.addEventListener( "popstate", updateUrlIfChanged );
        window.addEventListener( "hashchange", updateUrlIfChanged );
        document.addEventListener( "visibilitychange", handleVisibilityChange );
        history.pushState = patchedPushState;
        history.replaceState = patchedReplaceState;

        const pollId = window.setInterval( updateUrlIfChanged, 1000 );

        return () => {
            window.removeEventListener( "popstate", updateUrlIfChanged );
            window.removeEventListener( "hashchange", updateUrlIfChanged );
            document.removeEventListener( "visibilitychange", handleVisibilityChange );
            window.clearInterval( pollId );
            history.pushState = originalPushState;
            history.replaceState = originalReplaceState;
        };
    }, [ setCurrentUrl ] );

    return lastKnownUrlRef;
}
