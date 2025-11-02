import type { CSSProperties } from "react";
import type { Note } from "../../../types";

interface NoteMarkerProps {
    note : Note;
    style : CSSProperties;
    onClick : () => void;
}

export function NoteMarker ( { note, style, onClick } : NoteMarkerProps ) {
    return (
        <div
            style={style}
            data-note-id={note.id}
            data-has-element={note.highlightedElement ? "1" : "0"}
            data-pending={note.isPendingSync ? "1" : "0"}
            className={`note-marker${ note.isPendingSync ? " is-pending" : "" }`}
            onClick={onClick}
        />
    );
}
