import { useCallback, useRef } from "react";
import type {
    ListNotesQuery,
    PageIdentityPayload,
    PageIdentityResolution,
    UpdateNotePayload,
} from "@eye-note/definitions";
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
    const lastCapturedIdentity = useRef<PageIdentityPayload>();
    const lastResolvedIdentity = useRef<PageIdentityResolution>();
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
                if ( params.pageIdentity ) {
                    lastCapturedIdentity.current = params.pageIdentity;
                }

                const result = await fetchNotesForPage( {
                    url,
                    groupIds: params.groupIds,
                    pageIdentity: params.pageIdentity ?? lastCapturedIdentity.current,
                    pageId: params.pageId ?? lastResolvedIdentity.current?.pageId,
                    normalizedUrl:
                        params.normalizedUrl ??
                        params.pageIdentity?.normalizedUrl ??
                        lastCapturedIdentity.current?.normalizedUrl,
                } );

                setNotes( result.notes );

                if ( result.identity ) {
                    lastResolvedIdentity.current = result.identity;

                    console.log( "[EyeNote] Page identity resolved", {
                        requestedUrl: url,
                        groupIds: params.groupIds,
                        resolvedIdentity: result.identity,
                        capturedIdentity: lastCapturedIdentity.current,
                    } );

                    window.dispatchEvent(
                        new CustomEvent( "eye-note-page-identity-resolved", {
                            detail: {
                                identity: lastCapturedIdentity.current,
                                resolution: result.identity,
                            },
                        } )
                    );
                }

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
                    const syncedNote = await persistDraftNote( targetNote, updates, {
                        pageId: lastResolvedIdentity.current?.pageId,
                        pageIdentity: lastCapturedIdentity.current,
                    } );
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
