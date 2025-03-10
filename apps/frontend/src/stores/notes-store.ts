import { create } from "zustand";
import type { Note } from "../types";
import { getElementPath } from "../utils/element-path";

interface NotesStore {
    notes : Note[];
    createNote : ( element : Element ) => Note;
    updateNote : ( id : number, content : string ) => void;
    deleteNote : ( id : number ) => void;
    setNoteEditing : ( id : number, isEditing : boolean ) => void;
    hasNoteForElement : ( element : Element ) => boolean;
}

export const useNotesStore = create<NotesStore>( ( set, get ) => ( {
    notes: [],
    createNote: ( element : Element ) => {
        const elementPath = getElementPath( element );
        const rect = element.getBoundingClientRect();

        console.log( "Creating note", {
            element,
            elementPath,
            rect: {
                right: rect.right,
                top: rect.top,
            },
        } );

        const newNote : Note = {
            id: Date.now(),
            elementPath,
            content: "",
            url: window.location.href,
            groupId: "",
            createdAt: Date.now(),
            createdBy: "current-user",
            comments: [],
            x: rect.right,
            y: rect.top,
            isEditing: true,
            highlightedElement: element,
        };

        set( ( state ) => {
            return { notes: [ ...state.notes, newNote ] };
        } );
        return newNote;
    },
    updateNote: ( id : number, content : string ) => {
        set( ( state ) => ( {
            notes: state.notes.map( ( note ) =>
                note.id === id ? { ...note, content, isEditing: false } : note
            ),
        } ) );
    },
    deleteNote: ( id : number ) => {
        set( ( state ) => ( {
            notes: state.notes.filter( ( note ) => note.id !== id ),
        } ) );
    },
    setNoteEditing: ( id : number, isEditing : boolean ) => {
        set( ( state ) => ( {
            notes: state.notes.map( ( note ) => ( note.id === id ? { ...note, isEditing } : note ) ),
        } ) );
    },
    hasNoteForElement: ( element : Element ) => {
        return get().notes.some( ( note ) => note.highlightedElement === element );
    },
} ) );
