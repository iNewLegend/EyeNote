import { useEffect } from "react";

type NotesLifecycleArgs = {
    isAuthenticated : boolean;
    isConnected : boolean;
    currentUrl : string;
    clearNotes : () => void;
    loadNotes : ( params : { url : string } ) => Promise<void>;
    notesLength : number;
    rehydrateNotes : () => void;
};

export function useNotesLifecycle ( {
    isAuthenticated,
    isConnected,
    currentUrl,
    clearNotes,
    loadNotes,
    notesLength,
    rehydrateNotes,
}: NotesLifecycleArgs ) {
    useEffect( () => {
        if ( ! isAuthenticated || ! isConnected ) {
            clearNotes();
            return;
        }

        clearNotes();

        loadNotes( { url: currentUrl } ).catch( ( error: unknown ) => {
            console.error( "Failed to load notes:", error );
        } );
    }, [ isAuthenticated, isConnected, clearNotes, loadNotes, currentUrl ] );

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
