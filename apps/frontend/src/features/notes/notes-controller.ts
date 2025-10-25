import { useCallback } from "react";
import type { ListNotesQuery, UpdateNotePayload } from "@eye-note/definitions";
import type { Note } from "../../types";
import { useNotesStore } from "./notes-store";
import type { NotesStore } from "./notes-store";
import {
    fetchNotesForPage,
    persistDraftNote,
    persistExistingNote,
    deleteNoteRecord,
} from "./notes-api";

type NotesController = {
    loadNotes : ( params ?: ListNotesQuery ) => Promise<void>;
    updateNote : ( id : string, updates : UpdateNotePayload ) => Promise<Note>;
    deleteNote : ( id : string ) => Promise<void>;
    createNote : NotesStore["createNote"];
    clearNotes : NotesStore["clearNotes"];
    rehydrateNotes : NotesStore["rehydrateNotes"];
};

export function useNotesController () : NotesController {
    const createNote = useNotesStore( ( state ) => state.createNote );
    const clearNotes = useNotesStore( ( state ) => state.clearNotes );
    const rehydrateNotes = useNotesStore( ( state ) => state.rehydrateNotes );
    const setNotes = useNotesStore( ( state ) => state.setNotes );
    const upsertNote = useNotesStore( ( state ) => state.upsertNote );
    const removeNoteById = useNotesStore( ( state ) => state.removeNoteById );
    const setIsLoading = useNotesStore( ( state ) => state.setIsLoading );
    const setError = useNotesStore( ( state ) => state.setError );

    const loadNotes = useCallback(
        async ( params : ListNotesQuery = {} ) => {
            setIsLoading( true );
            setError( undefined );

            try {
                const url = params.url ?? window.location.href;
                const notes = await fetchNotesForPage( {
                    url,
                    groupId: params.groupId,
                } );

                setNotes( notes );

                requestAnimationFrame( () => {
                    rehydrateNotes();
                } );
            } catch ( error ) {
                setError( error instanceof Error ? error.message : "Failed to load notes" );
            } finally {
                setIsLoading( false );
            }
        },
        [ rehydrateNotes, setError, setIsLoading, setNotes ]
    );

    const updateNote = useCallback(
        async ( id : string, updates : UpdateNotePayload ) : Promise<Note> => {
            const { notes } = useNotesStore.getState();
            const targetNote = notes.find( ( note ) => note.id === id );

            if ( !targetNote ) {
                console.warn( "[EyeNote] Attempted to update unknown note", id );
                return Promise.reject( new Error( "Note not found" ) );
            }

            if ( targetNote.isLocalDraft ) {
                const draftBeforeSave = {
                    ...targetNote,
                    ...updates,
                    isPendingSync: true,
                };

                upsertNote( draftBeforeSave );

                try {
                    const syncedNote = await persistDraftNote( targetNote, updates );
                    upsertNote( syncedNote );
                    return syncedNote;
                } catch ( error ) {
                    upsertNote( {
                        ...targetNote,
                        ...updates,
                        isPendingSync: false,
                    } );
                    throw error;
                }
            }

            const optimisticNote : Note = {
                ...targetNote,
                ...updates,
                updatedAt: new Date().toISOString(),
                isPendingSync: true,
            };

            upsertNote( optimisticNote );

            try {
                const syncedNote = await persistExistingNote(
                    targetNote.id,
                    updates,
                    targetNote.highlightedElement ?? null
                );

                upsertNote( syncedNote );
                return syncedNote;
            } catch ( error ) {
                setNotes( notes );
                throw error;
            }
        },
        [ setNotes, upsertNote ]
    );

    const deleteNote = useCallback(
        async ( id : string ) => {
            const { notes } = useNotesStore.getState();
            const targetNote = notes.find( ( note ) => note.id === id );

            if ( !targetNote ) {
                return;
            }

            if ( targetNote.isLocalDraft ) {
                removeNoteById( id );
                return;
            }

            removeNoteById( id );

            try {
                await deleteNoteRecord( id );
            } catch ( error ) {
                setNotes( notes );
                throw error;
            }
        },
        [ removeNoteById, setNotes ]
    );

    return {
        loadNotes,
        updateNote,
        deleteNote,
        createNote,
        clearNotes,
        rehydrateNotes,
    };
}
