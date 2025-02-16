import type { Note } from "../../types";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { HighlightManager } from "../highlight/highlight-manager";
import { NoteManager } from "./note-manager";

interface NoteComponentProps {
  note: Note;
  onUpdate: (notes: Note[]) => void;
  setSelectedElement: (element: Element | null) => void;
  onUpdateToast: (title: string, description: string) => void;
}

export function NoteComponent({
  note,
  onUpdate,
  setSelectedElement,
  onUpdateToast,
}: NoteComponentProps) {
  const highlightManager = HighlightManager.getInstance();
  const noteManager = NoteManager.getInstance();

  const handleNoteUpdate = (id: number, content: string) => {
    noteManager.updateNote(id, content);
    onUpdate(noteManager.getNotes());
    onUpdateToast("Note Updated", "Your note has been saved.");
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
            highlightManager.addHighlight(element);
          }
          noteManager.setNoteEditing(note.id, true);
          onUpdate(noteManager.getNotes());
        }}
      />
      <Dialog
        open={note.isEditing}
        onOpenChange={(open) => {
          if (!open) {
            const element = note.highlightedElement;
            if (element) {
              const otherNotesEditing = noteManager
                .getNotes()
                .some(
                  (n) =>
                    n.id !== note.id &&
                    n.isEditing &&
                    n.highlightedElement === element
                );
              if (!otherNotesEditing) {
                highlightManager.removeHighlight(element);
                setSelectedElement(null);
              }
            }
            noteManager.setNoteEditing(note.id, false);
            onUpdate(noteManager.getNotes());
          } else {
            if (note.highlightedElement) {
              highlightManager.addHighlight(note.highlightedElement);
              setSelectedElement(note.highlightedElement);
            }
          }
        }}
      >
        <DialogContent
          className="note-content"
          style={{
            position: "absolute",
            left: `${note.x ?? 0}px`,
            top: `${(note.y ?? 0) + 20}px`,
            transform: "none",
          }}
        >
          <DialogTitle className="sr-only">Add Note</DialogTitle>
          <DialogDescription className="sr-only">
            Add or edit your note for the selected element. Use the textarea
            below to write your note, then click Save to confirm or Delete to
            remove the note.
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
                  highlightManager.removeHighlight(element);
                  setSelectedElement(null);
                }
                noteManager.deleteNote(note.id);
                onUpdate(noteManager.getNotes());
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
