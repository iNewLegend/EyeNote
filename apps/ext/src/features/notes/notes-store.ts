import type { ViewportPosition } from "@eye-note/definitions";
import { create } from "zustand";
import type { StoreApi } from "zustand";
import type { Note } from "../../types";
import { getPageAnalyzer } from "../../lib/page-analyzer";
import { createDraftFromElement, rehydrateNotePosition } from "./notes-utils";

type NotesState = {
    notes : Note[];
    isLoading : boolean;
    error ?: string;
};

type NotesActions = {
    setNotes : ( notes : Note[] ) => void;
    upsertNote : ( note : Note ) => void;
    mergeNote : ( id : string, updates : Partial<Note> ) => void;
    removeNoteById : ( id : string ) => void;
    setIsLoading : ( isLoading : boolean ) => void;
    setError : ( error ?: string ) => void;
    createNote : (
        element : Element,
        pointerPosition ?: ViewportPosition,
        initialGroupId ?: string | null
    ) => Promise<Note>;
    setNoteEditing : ( id : string, isEditing : boolean ) => void;
    hasNoteForElement : ( element : Element ) => boolean;
    clearNotes : () => void;
    rehydrateNotes : () => void;
    rehydrateNotesForPaths : ( rootPaths : string[] ) => void;
};

export type NotesStore = NotesState & NotesActions;

const initialState : NotesState = {
    notes: [],
    isLoading: false,
    error: undefined,
};

type NotesStoreApi = Pick<StoreApi<NotesStore>, "setState" | "getState">;

function createNotesActions ( api : NotesStoreApi ) : NotesActions {
    return {
        setNotes: ( notes ) => setNotesState( api, notes ),
        upsertNote: ( note ) => upsertNoteState( api, note ),
        mergeNote: ( id, updates ) => mergeNoteState( api, id, updates ),
        removeNoteById: ( id ) => removeNoteState( api, id ),
        setIsLoading: ( isLoading ) => setIsLoadingState( api, isLoading ),
        setError: ( error ) => setErrorState( api, error ),
        createNote: ( element, pointerPosition, initialGroupId ) =>
            createDraftNoteEffect( api, element, pointerPosition, initialGroupId ),
        setNoteEditing: ( id, isEditing ) => setNoteEditingEffect( api, id, isEditing ),
        hasNoteForElement: ( element ) => hasNoteForElementSelector( api, element ),
        clearNotes: () => clearNotesEffect( api ),
        rehydrateNotes: () => rehydrateNotesEffect( api ),
        rehydrateNotesForPaths: ( paths : string[] ) => rehydrateNotesForPathsEffect( api, paths ),
    };
}

/**
 * NotesStore (Zustand)
 *
 * Holds the client-side notes array and exposes actions for:
 * - Creating a local draft from a selected element
 * - Upserting/merging/removing notes
 * - Rehydrating note positions (full or targeted by mutated roots)
 * - Toggling editing state and handling loading/errors
 */
export const useNotesStore = create<NotesStore>( ( set, get ) => ( {
    ...initialState,
    ...createNotesActions( { setState: set, getState: get } ),
} ) );

/**
 * Effect: create a local draft from a DOM element, capture analyzer snapshot,
 * insert into the store immediately (optimistic), and return the draft.
 */
async function createDraftNoteEffect (
    api : NotesStoreApi,
    element : Element,
    pointerPosition ?: ViewportPosition,
    initialGroupId ?: string | null
) : Promise<Note> {
    const draft = createDraftFromElement( element, pointerPosition, initialGroupId );

    upsertNoteState( api, draft );

    console.log( "Creating note", {
        element,
        elementPath: draft.elementPath,
        rect: draft.elementRect,
        pointerPosition,
    } );

    return draft;
}

/** Replace the notes array with a new list. */
function setNotesState ( api : NotesStoreApi, notes : Note[] ) {
    api.setState( ( state ) => ( {
        ...state,
        notes,
    } ) );
}

/** Insert or replace a note by id, preserving array order for existing ids. */
function upsertNoteState ( api : NotesStoreApi, updatedNote : Note ) {
    api.setState( ( state ) => {
        const index = state.notes.findIndex( ( note ) => note.id === updatedNote.id );

        if ( index === -1 ) {
            return {
                ...state,
                notes: [ ...state.notes, updatedNote ],
            };
        }

        const notes = [ ...state.notes ];
        notes[ index ] = updatedNote;

        return {
            ...state,
            notes,
        };
    } );
}

/** Shallow-merge fields into a note by id. */
function mergeNoteState ( api : NotesStoreApi, id : string, updates : Partial<Note> ) {
    api.setState( ( state ) => ( {
        ...state,
        notes: state.notes.map( ( note ) => ( note.id === id ? { ...note, ...updates } : note ) ),
    } ) );
}

/** Remove a note by id. */
function removeNoteState ( api : NotesStoreApi, id : string ) {
    api.setState( ( state ) => ( {
        ...state,
        notes: state.notes.filter( ( note ) => note.id !== id ),
    } ) );
}

/** Toggle the loading flag used by consumers to show fetching states. */
function setIsLoadingState ( api : NotesStoreApi, isLoading : boolean ) {
    api.setState( ( state ) => ( {
        ...state,
        isLoading,
    } ) );
}

/** Store a user-presentable error message; clears when undefined. */
function setErrorState ( api : NotesStoreApi, error ?: string ) {
    api.setState( ( state ) => ( {
        ...state,
        error,
    } ) );
}

/** Effect: set the editing flag for a specific note id. */
function setNoteEditingEffect ( api : NotesStoreApi, id : string, isEditing : boolean ) {
    api.setState( ( state ) => ( {
        ...state,
        notes: state.notes.map( ( note ) => ( note.id === id ? { ...note, isEditing } : note ) ),
    } ) );
}

/** Selector: true if a note already targets the provided element reference. */
function hasNoteForElementSelector ( api : NotesStoreApi, element : Element ) : boolean {
    return api.getState().notes.some( ( note ) => note.highlightedElement === element );
}

/** Effect: clear notes and reset loading/error flags. */
function clearNotesEffect ( api : NotesStoreApi ) {
    api.setState( ( state ) => ( {
        ...state,
        notes: [],
        isLoading: false,
        error: undefined,
    } ) );
}

/**
 * Effect: full-page rehydration. Rebuild PageAnalyzer map and recompute
 * positions for every note.
 */
function rehydrateNotesEffect ( api : NotesStoreApi ) {
    try {
        getPageAnalyzer().analyzePage();
    } catch ( error ) {
        console.warn( "[EyeNote] Failed to analyze page during rehydration", error );
    }

    api.setState( ( state ) => ( {
        ...state,
        notes: state.notes.map( ( note ) => rehydrateNotePosition( note ) ),
    } ) );
}

/**
 * Effect: targeted rehydration for mutated subtrees. Only notes whose
 * `elementPath` begins with one of the provided root paths are recomputed.
 */
function rehydrateNotesForPathsEffect ( api : NotesStoreApi, rootPaths : string[] ) {
    if ( rootPaths.length === 0 ) {
        return;
    }

    const normalize = ( path : string ) =>
        path
            .replace( /:nth-of-type\(\d+\)/g, "" )
            .replace( /:nth-child\(\d+\)/g, "" )
            .replace( /\s+/g, " " )
            .trim();
    const normalizedRoots = rootPaths.map( normalize );

    api.setState( ( state ) => {
        const rehydratedIds : string[] = [];
        const nextNotes = state.notes.map( ( note ) => {
            const normalizedNotePath = normalize( note.elementPath );
            const targetMutation = normalizedRoots.some( ( root ) => normalizedNotePath.startsWith( root ) );
            const needsRecovery = note.highlightedElement == null;
            if ( targetMutation || needsRecovery ) {
                rehydratedIds.push( note.id );
                return rehydrateNotePosition( note );
            }
            return note;
        } );

        if ( rehydratedIds.length > 0 ) {
            console.log( "[EyeNote][Notes] rehydrateNotesForPaths", {
                rootPaths,
                normalizedRoots,
                rehydratedIds,
            } );
        }

        return {
            ...state,
            notes: nextNotes,
        };
    } );
}
