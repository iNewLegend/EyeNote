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
    createNote : ( element : Element, pointerPosition ?: ViewportPosition ) => Promise<Note>;
    setNoteEditing : ( id : string, isEditing : boolean ) => void;
    hasNoteForElement : ( element : Element ) => boolean;
    clearNotes : () => void;
    rehydrateNotes : () => void;
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
        createNote: ( element, pointerPosition ) =>
            createDraftNoteEffect( api, element, pointerPosition ),
        setNoteEditing: ( id, isEditing ) => setNoteEditingEffect( api, id, isEditing ),
        hasNoteForElement: ( element ) => hasNoteForElementSelector( api, element ),
        clearNotes: () => clearNotesEffect( api ),
        rehydrateNotes: () => rehydrateNotesEffect( api ),
    };
}

export const useNotesStore = create<NotesStore>( ( set, get ) => ( {
    ...initialState,
    ...createNotesActions( { setState: set, getState: get } ),
} ) );

async function createDraftNoteEffect (
    api : NotesStoreApi,
    element : Element,
    pointerPosition ?: ViewportPosition
) : Promise<Note> {
    const draft = createDraftFromElement( element, pointerPosition );

    upsertNoteState( api, draft );

    console.log( "Creating note", {
        element,
        elementPath: draft.elementPath,
        rect: draft.elementRect,
        pointerPosition,
    } );

    return draft;
}

function setNotesState ( api : NotesStoreApi, notes : Note[] ) {
    api.setState( ( state ) => ( {
        ...state,
        notes,
    } ) );
}

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

function mergeNoteState ( api : NotesStoreApi, id : string, updates : Partial<Note> ) {
    api.setState( ( state ) => ( {
        ...state,
        notes: state.notes.map( ( note ) => ( note.id === id ? { ...note, ...updates } : note ) ),
    } ) );
}

function removeNoteState ( api : NotesStoreApi, id : string ) {
    api.setState( ( state ) => ( {
        ...state,
        notes: state.notes.filter( ( note ) => note.id !== id ),
    } ) );
}

function setIsLoadingState ( api : NotesStoreApi, isLoading : boolean ) {
    api.setState( ( state ) => ( {
        ...state,
        isLoading,
    } ) );
}

function setErrorState ( api : NotesStoreApi, error ?: string ) {
    api.setState( ( state ) => ( {
        ...state,
        error,
    } ) );
}

function setNoteEditingEffect ( api : NotesStoreApi, id : string, isEditing : boolean ) {
    api.setState( ( state ) => ( {
        ...state,
        notes: state.notes.map( ( note ) => ( note.id === id ? { ...note, isEditing } : note ) ),
    } ) );
}

function hasNoteForElementSelector ( api : NotesStoreApi, element : Element ) : boolean {
    return api.getState().notes.some( ( note ) => note.highlightedElement === element );
}

function clearNotesEffect ( api : NotesStoreApi ) {
    api.setState( ( state ) => ( {
        ...state,
        notes: [],
        isLoading: false,
        error: undefined,
    } ) );
}

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
