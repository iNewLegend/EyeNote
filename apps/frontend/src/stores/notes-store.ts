import type {
    CreateNotePayload,
    NoteRecord,
    UpdateNotePayload,
    ViewportPosition,
} from "@eye-note/definitions";
import { create } from "zustand";
import type { Note } from "../types";
import { getPageAnalyzer } from "../lib/page-analyzer";
import {
    createNote as createNoteApi,
    deleteNote as deleteNoteApi,
    fetchNotes as fetchNotesApi,
    updateNote as updateNoteApi,
} from "../lib/api-client";

interface LoadNotesParams {
    url ?: string;
    groupId ?: string;
}

interface NotesStore {
    notes : Note[];
    isLoading : boolean;
    error ?: string;
    loadNotes : ( params ?: LoadNotesParams ) => Promise<void>;
    createNote : ( element : Element, pointerPosition ?: ViewportPosition ) => Promise<Note>;
    updateNote : ( id : string, updates : UpdateNotePayload ) => Promise<Note>;
    deleteNote : ( id : string ) => Promise<void>;
    setNoteEditing : ( id : string, isEditing : boolean ) => void;
    hasNoteForElement : ( element : Element ) => boolean;
    clearNotes : () => void;
    rehydrateNotes : () => void;
}

const createTempId = () => {
    if ( typeof crypto !== "undefined" && "randomUUID" in crypto ) {
        return `temp-${ crypto.randomUUID() }`;
    }
    return `temp-${ Date.now() }-${ Math.random().toString( 16 ).slice( 2 ) }`;
};

function mapRecordToNote ( record : NoteRecord, overrides : Partial<Note> = {} ) : Note {
    return {
        ...record,
        isEditing: false,
        isPendingSync: false,
        isLocalDraft: false,
        highlightedElement: null,
        ...overrides,
    };
}

function clamp ( value : number ) : number {
    if ( Number.isNaN( value ) ) {
        return 0;
    }
    return Math.max( 0, Math.min( 1, value ) );
}

function resolveOffsetRatio ( note : Note ) {
    if ( note.elementOffsetRatio ) {
        return note.elementOffsetRatio;
    }

    if ( note.elementOffset && note.elementRect && note.elementRect.width && note.elementRect.height ) {
        return {
            x: clamp( note.elementOffset.x / note.elementRect.width ),
            y: clamp( note.elementOffset.y / note.elementRect.height ),
        };
    }

    return { x: 0, y: 0 };
}

function safeFindElement ( selector : string ) : HTMLElement | null {
    try {
        return document.querySelector( selector ) as HTMLElement | null;
    } catch {
        return null;
    }
}

function rehydrateNotePosition ( note : Note ) : Note {
    const element = safeFindElement( note.elementPath );

    if ( !element ) {
        if ( note.highlightedElement ) {
            return { ...note, highlightedElement: null };
        }
        return note;
    }

    const rect = element.getBoundingClientRect();
    const ratio = resolveOffsetRatio( note );
    const computedX = rect.left + rect.width * clamp( ratio.x );
    const computedY = rect.top + rect.height * clamp( ratio.y );

    const shouldUpdatePosition =
        Math.abs( ( note.x ?? 0 ) - computedX ) > 0.5 ||
        Math.abs( ( note.y ?? 0 ) - computedY ) > 0.5;

    if ( !shouldUpdatePosition && note.highlightedElement === element ) {
        return note;
    }

    return {
        ...note,
        x: computedX,
        y: computedY,
        highlightedElement: element,
    };
}

export const useNotesStore = create<NotesStore>( ( set, get ) => ( {
    notes: [],
    isLoading: false,
    error: undefined,
    loadNotes: async ( params = {} ) => {
        set( ( state ) => ( {
            ...state,
            isLoading: true,
            error: undefined,
        } ) );

        try {
            const url = params.url ?? window.location.href;
            const records = await fetchNotesApi( {
                url,
                groupId: params.groupId,
            } );

            const notes = records.map<Note>( ( record ) => mapRecordToNote( record ) );

            set( ( state ) => ( {
                ...state,
                notes,
                isLoading: false,
            } ) );

            requestAnimationFrame( () => {
                get().rehydrateNotes();
            } );
        } catch ( error ) {
            set( ( state ) => ( {
                ...state,
                isLoading: false,
                error: error instanceof Error ? error.message : "Failed to load notes",
            } ) );
        }
    },
    createNote: async ( element : Element, pointerPosition ?: ViewportPosition ) => {
        const rect = element.getBoundingClientRect();
        const pointer : ViewportPosition = pointerPosition ?? {
            x: rect.right,
            y: rect.top,
        };

        const analyzer = getPageAnalyzer();
        const snapshot = analyzer.analyzeElement( element, {
            pointerPosition: pointer,
        } );

        console.log( "Creating note", {
            element,
            elementPath: snapshot.elementPath,
            rect: snapshot.rect,
            pointer,
        } );

        const tempId = createTempId();

        const newNote : Note = {
            id: tempId,
            elementPath: snapshot.elementPath,
            content: "",
            url: window.location.href,
            groupId: undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            x: snapshot.viewportPosition.x,
            y: snapshot.viewportPosition.y,
            elementRect: snapshot.rect,
            elementOffset: snapshot.elementOffset,
            elementOffsetRatio: snapshot.elementOffsetRatio,
            scrollPosition: snapshot.scrollPosition,
            locationCapturedAt: snapshot.timestamp,
            isEditing: true,
            highlightedElement: element,
            isPendingSync: true,
            isLocalDraft: true,
        };

        set( ( state ) => {
            return { notes: [ ...state.notes, newNote ] };
        } );

        return newNote;
    },
    updateNote: async ( id : string, updates : UpdateNotePayload ) => {
        const previousNotes = get().notes;
        const targetNote = previousNotes.find( ( note ) => note.id === id );

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

            set( ( state ) => ( {
                notes: state.notes.map( ( note ) =>
                    note.id === id ? draftBeforeSave : note
                ),
            } ) );

            try {
                const payload : CreateNotePayload = {
                    elementPath: targetNote.elementPath,
                    content: updates.content ?? targetNote.content ?? "",
                    url: targetNote.url,
                    groupId: targetNote.groupId,
                    x: targetNote.x,
                    y: targetNote.y,
                    elementRect: targetNote.elementRect,
                    elementOffset: targetNote.elementOffset,
                    elementOffsetRatio: targetNote.elementOffsetRatio,
                    scrollPosition: targetNote.scrollPosition,
                    locationCapturedAt: targetNote.locationCapturedAt,
                };

                const record = await createNoteApi( payload );
                const syncedNote : Note = mapRecordToNote( record, {
                    highlightedElement: targetNote.highlightedElement,
                } );

                set( ( state ) => ( {
                    notes: state.notes.map( ( note ) =>
                        note.id === id ? syncedNote : note
                    ),
                } ) );

                return syncedNote;
            } catch ( error ) {
                console.error( "[EyeNote] Failed to persist draft note", error );
                set( ( state ) => ( {
                    notes: state.notes.map( ( note ) =>
                        note.id === id ? { ...targetNote, ...updates, isPendingSync: false } : note
                    ),
                } ) );
                throw error;
            }
        }

        set( ( state ) => ( {
            notes: state.notes.map( ( note ) =>
                note.id === id
                    ? {
                        ...note,
                        ...updates,
                        updatedAt: new Date().toISOString(),
                        isPendingSync: true,
                    }
                    : note
            ),
        } ) );

        try {
            const record = await updateNoteApi( id, updates );
            const syncedNote : Note = mapRecordToNote( record, {
                highlightedElement: previousNotes.find( ( note ) => note.id === id )?.highlightedElement ?? null,
            } );

            set( ( state ) => ( {
                notes: state.notes.map( ( note ) =>
                    note.id === id ? syncedNote : note
                ),
            } ) );

            return syncedNote;
        } catch ( error ) {
            set( { notes: previousNotes } );
            throw error;
        }
    },
    deleteNote: async ( id : string ) => {
        const previousNotes = get().notes;
        const targetNote = previousNotes.find( ( note ) => note.id === id );

        if ( targetNote?.isLocalDraft ) {
            set( ( state ) => ( {
                notes: state.notes.filter( ( note ) => note.id !== id ),
            } ) );
            return;
        }

        set( ( state ) => ( {
            notes: state.notes.filter( ( note ) => note.id !== id ),
        } ) );

        try {
            await deleteNoteApi( id );
        } catch ( error ) {
            set( { notes: previousNotes } );
            throw error;
        }
    },
    setNoteEditing: ( id : string, isEditing : boolean ) => {
        set( ( state ) => ( {
            notes: state.notes.map( ( note ) => ( note.id === id ? { ...note, isEditing } : note ) ),
        } ) );
    },
    hasNoteForElement: ( element : Element ) => {
        return get().notes.some( ( note ) => note.highlightedElement === element );
    },
    clearNotes: () => {
        set( ( state ) => ( {
            ...state,
            notes: [],
            isLoading: false,
            error: undefined,
        } ) );
    },
    rehydrateNotes: () => {
        const analyzer = getPageAnalyzer();
        try {
            analyzer.analyzePage();
        } catch ( error ) {
            console.warn( "[EyeNote] Failed to analyze page during rehydration", error );
        }

        set( ( state ) => {
            const updatedNotes = state.notes.map( ( note ) => rehydrateNotePosition( note ) );
            return { ...state, notes: updatedNotes };
        } );
    },
} ) );
