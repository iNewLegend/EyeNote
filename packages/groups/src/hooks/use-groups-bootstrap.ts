import { useEffect } from "react";
import { initializeGroupsStore, useGroupsStore } from "../store/groups-store";

interface UseGroupsBootstrapArgs {
    isAuthenticated : boolean;
    canSync : boolean;
    shouldResetOnUnsync ?: boolean;
    logContext ?: string;
}

export function useGroupsBootstrap ( {
    isAuthenticated,
    canSync,
    shouldResetOnUnsync = false,
    logContext = "groups",
} : UseGroupsBootstrapArgs ) {
    const fetchGroups = useGroupsStore( ( state ) => state.fetchGroups );
    const resetGroups = useGroupsStore( ( state ) => state.reset );

    useEffect( () => {
        initializeGroupsStore().catch( ( error ) => {
            console.warn( `[EyeNote] Failed to initialize groups store (${ logContext })`, error );
        } );
    }, [ logContext ] );

    useEffect( () => {
        if ( !isAuthenticated ) {
            resetGroups();
            return;
        }

        if ( !canSync ) {
            if ( shouldResetOnUnsync ) {
                resetGroups();
            }
            return;
        }

        let cancelled = false;

        initializeGroupsStore()
            .then( () => {
                if ( cancelled ) {
                    return;
                }
                return fetchGroups();
            } )
            .catch( ( error ) => {
                if ( cancelled ) {
                    return;
                }
                console.warn( `[EyeNote] Failed to fetch groups (${ logContext })`, error );
            } );

        return () => {
            cancelled = true;
        };
    }, [ canSync, fetchGroups, isAuthenticated, resetGroups, shouldResetOnUnsync, logContext ] );
}
