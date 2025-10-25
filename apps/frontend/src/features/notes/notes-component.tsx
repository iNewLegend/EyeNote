import { useState, useEffect, useMemo } from "react";
import type { Note } from "../../types";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { useHighlightStore } from "../../stores/highlight-store";
import { useNotesStore } from "./notes-store";
import { useNotesController } from "./notes-controller";

interface NoteComponentProps {
    note : Note;
    container : HTMLElement | null;
    setSelectedElement : ( element : Element | null ) => void;
    onNoteDismissed : () => void;
}

export function NotesComponent ( {
    note,
    container,
    setSelectedElement,
    onNoteDismissed,
} : NoteComponentProps ) {
    useEffect( () => {
        console.debug( "[EyeNote] Rendering note marker", {
            id: note.id,
            x: note.x,
            y: note.y,
            hasElement: Boolean( note.highlightedElement ),
            elementPath: note.elementPath,
        } );
    }, [ note.id, note.x, note.y, note.highlightedElement, note.elementPath ] );

    const { deleteNote, updateNote } = useNotesController();
    const setNoteEditing = useNotesStore( ( state ) => state.setNoteEditing );
    const { addHighlight, removeHighlight } = useHighlightStore();
    const [ draftContent, setDraftContent ] = useState( note.content );
    const [ isSaving, setIsSaving ] = useState( false );
    const [ isDeleting, setIsDeleting ] = useState( false );

    useEffect( () => {
        setDraftContent( note.content );
    }, [ note.content ] );

    const isActionLocked = useMemo( () => {
        const isPersistingExistingNote = !note.isLocalDraft && note.isPendingSync;
        return isPersistingExistingNote || isSaving || isDeleting;
    }, [ note.isLocalDraft, note.isPendingSync, isSaving, isDeleting ] );

    const handleOpenChange = ( open : boolean, options : { force ?: boolean } = {} ) => {
        const force = options.force ?? false;

        if ( !open && isActionLocked && !force ) {
            return;
        }

        console.log( "[Debug] Dialog onOpenChange", {
            open,
            noteId: note.id,
            currentIsEditing: note.isEditing,
        } );

        if ( !open ) {
            console.log( "[Debug] Dialog closing" );
            const element = note.highlightedElement;
            if ( element ) {
                removeHighlight( element );
                setSelectedElement( null );
            }
            setNoteEditing( note.id, false );
            requestAnimationFrame( () => {
                console.log( "[Debug] Calling onNoteDismissed" );
                onNoteDismissed();
            } );
        } else {
            console.log( "[Debug] Dialog opening" );
            if ( note.highlightedElement ) {
                addHighlight( note.highlightedElement );
                setSelectedElement( note.highlightedElement );

                const scrollX = window.scrollX;
                const scrollY = window.scrollY;

                requestAnimationFrame( () => {
                    window.scrollTo( scrollX, scrollY );
                } );
            }
        }
    };

    const handleSave = async () => {
        if ( isActionLocked ) {
            return;
        }

        try {
            setIsSaving( true );
            await updateNote( note.id, { content: draftContent } );
            setIsSaving( false );
            handleOpenChange( false, { force: true } );
        } catch ( error ) {
            console.error( "Failed to save note:", error );
        } finally {
            setIsSaving( false );
        }
    };

    const handleDelete = async () => {
        if ( isActionLocked ) {
            return;
        }

        try {
            setIsDeleting( true );
            await deleteNote( note.id );
            setIsDeleting( false );
            handleOpenChange( false, { force: true } );
            onNoteDismissed();
        } catch ( error ) {
            console.error( "Failed to delete note:", error );
        } finally {
            setIsDeleting( false );
        }
    };

    const isExistingPending = note.isPendingSync && !note.isLocalDraft;

    const handleCancel = async () => {
        if ( note.isLocalDraft ) {
            try {
                await deleteNote( note.id );
            } catch ( error ) {
                console.error( "Failed to discard draft note:", error );
            }
            handleOpenChange( false, { force: true } );
            onNoteDismissed();
            return;
        }

        handleOpenChange( false );
    };

    return (
        <div>
            <div
                style={{
                    left: `${ note.x ?? 0 }px`,
                    top: `${ note.y ?? 0 }px`,
                    zIndex: 2147483647,
                    transform: "translate(-50%, -50%)",
                }}
                data-note-id={note.id}
                data-has-element={note.highlightedElement ? "1" : "0"}
                data-pending={note.isPendingSync ? "1" : "0"}
                className={`note-marker${ note.isPendingSync ? " is-pending" : "" }`}
                onClick={() => {
                    console.log( "[Debug] Note marker clicked", {
                        note,
                        element: note.highlightedElement,
                    } );
                    const element = note.highlightedElement;
                    if ( element ) {
                        setSelectedElement( element );
                        addHighlight( element );
                    }
                    console.log( "[Debug] Before setNoteEditing", {
                        noteId: note.id,
                        currentIsEditing: note.isEditing,
                    } );
                    handleOpenChange( true );
                    setNoteEditing( note.id, true );
                    console.log( "[Debug] After setNoteEditing" );
                }}
            />
            <Dialog open={Boolean( note.isEditing )} onOpenChange={handleOpenChange}>
                <DialogContent
                    {...( container ? { container } : {} )}
                    className="note-content"
                    style={{
                        position: "absolute",
                        left: `${ note.x }px`,
                        top: `${ note.y }px`,
                        transform: "none",
                        zIndex: 2147483647,
                    }}
                    onPointerDownOutside={( e ) => {
                        console.log( "[Debug] Dialog pointer down outside" );
                        if ( note.isLocalDraft ) {
                            e.preventDefault();
                            return;
                        }
                        handleOpenChange( false );
                    }}
                    onInteractOutside={( e ) => {
                        if ( note.isLocalDraft ) {
                            e.preventDefault();
                        }
                    }}
                >
                    <DialogTitle className="sr-only">Add Note</DialogTitle>
                    <DialogDescription className="sr-only">
                        Add or edit your note for the selected element. Use the textarea below to
                        write your note, then click Save to confirm or Delete to remove the note.
                    </DialogDescription>
                    <textarea
                        className="w-full min-h-[100px] p-2 border border-border rounded resize-y font-sans"
                        value={draftContent}
                        onChange={( event ) => setDraftContent( event.target.value )}
                        placeholder="Enter your note..."
                        autoFocus
                        disabled={isActionLocked}
                    />
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={handleCancel} disabled={isActionLocked}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting || isExistingPending}
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving || isExistingPending}>
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
