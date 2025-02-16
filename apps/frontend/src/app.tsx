import { useState, useEffect, useCallback } from "react";
import type { Note } from "./types";
import { useToast } from "./components/ui/toast-context";
import { useShiftHover } from "./hooks/use-shift-hover";
import { NoteManager } from "./features/notes/note-manager";
import { NoteComponent } from "./features/notes/note-component";

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const { toast } = useToast();
  const noteManager = NoteManager.getInstance();

  const { hoveredElement, setHoveredElement, setSelectedElement, isShiftMode } =
    useShiftHover(notes);

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!isShiftMode || !hoveredElement) return;

      // Prevent creating notes on plugin elements
      if ((e.target as Element).closest(".notes-plugin")) return;

      // Create the note
      const newNote = noteManager.createNote(hoveredElement);
      setNotes((prevNotes) => [...prevNotes, newNote]);
      setHoveredElement(null);
      setSelectedElement(hoveredElement);

      // Prevent any default behavior or event bubbling
      e.preventDefault();
      e.stopPropagation();

      toast({
        title: "Note Created",
        description: "Click the marker to edit your note.",
      });
    },
    [isShiftMode, hoveredElement, setHoveredElement, setSelectedElement, toast]
  );

  useEffect(() => {
    if (isShiftMode) {
      document.addEventListener("click", handleClick, { capture: true });
      return () =>
        document.removeEventListener("click", handleClick, { capture: true });
    }
  }, [isShiftMode, handleClick]);

  return (
    <div className="notes-plugin">
      {notes.map((note) => (
        <NoteComponent
          key={note.id}
          note={note}
          onUpdate={setNotes}
          setSelectedElement={setSelectedElement}
          onUpdateToast={(title, description) => toast({ title, description })}
        />
      ))}
    </div>
  );
}

export default App;
