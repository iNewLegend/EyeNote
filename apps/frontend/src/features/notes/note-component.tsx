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
import { useCallback } from "react";

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

  const calculatePosition = useCallback(() => {
    const DIALOG_WIDTH = 300; // Width of the dialog
    const DIALOG_PADDING = 20; // Padding from viewport edges
    const MARKER_SIZE = 24; // Size of the note marker

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = (note.x ?? 0) + MARKER_SIZE; // Default position next to marker
    let y = note.y ?? 0; // Default position at marker's top

    // Adjust horizontal position if dialog would overflow viewport
    if (x + DIALOG_WIDTH + DIALOG_PADDING > viewportWidth) {
      x = (note.x ?? 0) - DIALOG_WIDTH - MARKER_SIZE / 2; // Position to the left of marker
    }

    // Adjust vertical position if dialog would overflow viewport
    if (y + 300 + DIALOG_PADDING > viewportHeight) {
      // 300 is an approximate max height
      y = Math.max(DIALOG_PADDING, viewportHeight - 300 - DIALOG_PADDING);
    }

    // Ensure dialog doesn't go off the left edge
    x = Math.max(DIALOG_PADDING, x);

    // Ensure dialog doesn't go off the top edge
    y = Math.max(DIALOG_PADDING, y);

    return { x, y };
  }, [note.x, note.y]);

  const handleNoteUpdate = (id: number, content: string) => {
    noteManager.updateNote(id, content);
    onUpdate(noteManager.getNotes());
    onUpdateToast("Note Updated", "Your note has been saved.");
  };

  const position = calculatePosition();

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
            left: `${position.x}px`,
            top: `${position.y}px`,
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
