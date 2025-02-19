import type { Note } from "../../types";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { useHighlightStore } from "../../stores/highlight-store";
import { useNotesStore } from "../../stores/notes-store";

interface NoteComponentProps {
    note: Note;
    setSelectedElement: (element: Element | null) => void;
    onUpdateToast: (title: string, description: string) => void;
}

export function NoteComponent({ note, setSelectedElement, onUpdateToast }: NoteComponentProps) {
    const { updateNote, deleteNote, setNoteEditing } = useNotesStore();
    const { addHighlight, removeHighlight } = useHighlightStore();

    const handleNoteUpdate = (id: number, content: string) => {
        updateNote(id, content);
        onUpdateToast("Note updated", "Your note has been saved successfully");
    };

    return (
        <div>
            <div
                className="note-marker"
                style={{
                    left: `${note.x ?? 0}px`,
                    top: `${note.y ?? 0}px`,
                }}
                onClick={() => {
                    const element = note.highlightedElement;
                    if (element) {
                        setSelectedElement(element);
                        addHighlight(element);
                    }
                    setNoteEditing(note.id, true);
                }}
            />
            <Dialog
                open={note.isEditing}
                onOpenChange={(open) => {
                    if (!open) {
                        const element = note.highlightedElement;
                        if (element) {
                            removeHighlight(element);
                            setSelectedElement(null);
                        }
                        setNoteEditing(note.id, false);
                    } else {
                        if (note.highlightedElement) {
                            addHighlight(note.highlightedElement);
                            setSelectedElement(note.highlightedElement);
                        }
                    }
                }}
            >
                <DialogContent
                    className="note-content"
                    style={{
                        position: "absolute",
                        left: `${note.x}px`,
                        top: `${note.y}px`,
                        transform: "none",
                    }}
                >
                    <DialogTitle className="sr-only">Add Note</DialogTitle>
                    <DialogDescription className="sr-only">
                        Add or edit your note for the selected element. Use the textarea below to
                        write your note, then click Save to confirm or Delete to remove the note.
                    </DialogDescription>
                    <textarea
                        className="w-full min-h-[100px] p-2 border border-border rounded resize-y font-sans"
                        defaultValue={note.content}
                        placeholder="Enter your note..."
                        autoFocus
                        onBlur={(e) => handleNoteUpdate(note.id, e.target.value)}
                    />
                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                const element = note.highlightedElement;
                                if (element) {
                                    removeHighlight(element);
                                    setSelectedElement(null);
                                }
                                deleteNote(note.id);
                            }}
                        >
                            Delete
                        </Button>
                        <Button onClick={() => handleNoteUpdate(note.id, note.content)}>
                            Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
