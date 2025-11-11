import { useEffect } from "react";

import type { PageIdentity } from "@eye-note/page-identity";

type NotesLifecycleArgs = {
    isAuthenticated : boolean;
    isConnected : boolean;
    currentUrl : string;
    pageIdentity ?: PageIdentity;
    clearNotes : () => void;
    loadNotes : ( params : { url : string; groupIds ?: string[]; pageIdentity ?: PageIdentity } ) => Promise<void>;
    notesLength : number;
    rehydrateNotes : () => void;
    activeGroupIds : string[];
};

export function useNotesLifecycle ( {
    isAuthenticated,
    isConnected,
    currentUrl,
    clearNotes,
    loadNotes,
    notesLength,
    rehydrateNotes,
    activeGroupIds,
    pageIdentity,
}: NotesLifecycleArgs ) {
    useEffect( () => {
        if ( ! isAuthenticated || ! isConnected ) {
            clearNotes();
            return;
        }

        if ( ! pageIdentity ) {
            return;
        }

        clearNotes();

        const groupIds = activeGroupIds.length > 0 ? activeGroupIds : undefined;

        loadNotes( { url: currentUrl, groupIds, pageIdentity } ).catch( ( error: unknown ) => {
            console.error( "Failed to load notes:", error );
        } );
    }, [
        activeGroupIds,
        clearNotes,
        currentUrl,
        isAuthenticated,
        isConnected,
        loadNotes,
        pageIdentity,
    ] );

    useEffect( () => {
        if ( ! isConnected || notesLength === 0 ) {
            return;
        }

        rehydrateNotes();
    }, [ isConnected, notesLength, rehydrateNotes ] );

    useEffect( () => {
        if ( ! isConnected ) {
            return;
        }

        const handleRelayout = () => {
            rehydrateNotes();
        };

        window.addEventListener( "resize", handleRelayout );
        window.addEventListener( "scroll", handleRelayout, true );

        return () => {
            window.removeEventListener( "resize", handleRelayout );
            window.removeEventListener( "scroll", handleRelayout, true );
        };
    }, [ isConnected, rehydrateNotes ] );
}
