import type { Note } from "../../types";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { useHighlightStore } from "../../stores/highlight-store";
import { useNotesStore } from "../../stores/notes-store";

interface NoteComponentProps {
    note: Note;
    setSelectedElement: (element: Element | null) => void;
    onUpdateToast: (title: string, description: string) => void;
    onNoteDismissed: () => void;
}

export function NoteComponent({
    note,
    setSelectedElement,
    onUpdateToast,
    onNoteDismissed,
}: NoteComponentProps) {
    const { updateNote, deleteNote, setNoteEditing } = useNotesStore();
    const { addHighlight, removeHighlight } = useHighlightStore();

    console.log("Rendering NoteComponent", {
        note,
        isEditing: note.isEditing,
        position: { x: note.x, y: note.y },
    });

    const handleNoteUpdate = (id: number, content: string) => {
        console.log("Updating note", { id, content });
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
                    zIndex: 2147483647,
                }}
                onClick={() => {
                    console.log("Note marker clicked", note);
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
                    console.log("Dialog open change", { open, note });
                    if (!open) {
                        const element = note.highlightedElement;
                        if (element) {
                            removeHighlight(element);
                            setSelectedElement(null);
                        }
                        setNoteEditing(note.id, false);
                        onNoteDismissed();
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
                        zIndex: 2147483647,
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
                                onNoteDismissed();
                            }}
                        >
                            Delete
                        </Button>
                        <Button
                            onClick={() => {
                                setNoteEditing(note.id, false);
                                onNoteDismissed();
                            }}
                        >
                            Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
