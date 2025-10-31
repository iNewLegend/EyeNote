import { useEffect } from "react";

export function useAuthStatusEffects ( refreshAuthStatus : () => Promise<void> ) {
    useEffect( () => {
        refreshAuthStatus().catch( ( error : unknown ) => {
            console.error( "Failed to refresh auth status:", error );
        } );
    }, [ refreshAuthStatus ] );

    useEffect( () => {
        if ( typeof chrome === "undefined" || !chrome.storage?.onChanged ) {
            return;
        }

        const listener : Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
            changes,
            areaName
        ) => {
            if ( areaName !== "local" ) {
                return;
            }

            if ( changes.authToken || changes.authTokenExpiresAt ) {
                refreshAuthStatus().catch( ( error : unknown ) => {
                    console.error( "Failed to refresh auth status after storage change:", error );
                } );
            }
        };

        chrome.storage.onChanged.addListener( listener );
        return () => {
            chrome.storage.onChanged.removeListener( listener );
        };
    }, [ refreshAuthStatus ] );
}
