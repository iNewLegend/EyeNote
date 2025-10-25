import { useEffect } from "react";

type NotesLifecycleArgs = {
    isAuthenticated : boolean;
    isConnected : boolean;
    currentUrl : string;
    clearNotes : () => void;
    loadNotes : ( params : { url : string; groupIds ?: string[] } ) => Promise<void>;
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
}: NotesLifecycleArgs ) {
    useEffect( () => {
        if ( ! isAuthenticated || ! isConnected ) {
            clearNotes();
            return;
        }

        clearNotes();

        const groupIds = activeGroupIds.length > 0 ? activeGroupIds : undefined;

        loadNotes( { url: currentUrl, groupIds } ).catch( ( error: unknown ) => {
            console.error( "Failed to load notes:", error );
        } );
    }, [
        activeGroupIds,
        clearNotes,
        currentUrl,
        isAuthenticated,
        isConnected,
        loadNotes,
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
