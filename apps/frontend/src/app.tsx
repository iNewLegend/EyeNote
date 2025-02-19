import { useEffect, useCallback } from "react";
import { useToast } from "./components/ui/toast-context";
import { useNotesStore } from "./stores/notes-store";
import { useHighlightStore } from "./stores/highlight-store";
import { NoteComponent } from "./features/notes/note-component";

function App() {
    const { toast } = useToast();
    const { notes, createNote } = useNotesStore();
    const { hoveredElement, setHoveredElement, setSelectedElement, isShiftMode } =
        useHighlightStore();

    const handleClick = useCallback(
        (e: MouseEvent) => {
            if (!isShiftMode || !hoveredElement) return;
            // Prevent creating notes on plugin elements
            if ((e.target as Element).closest(".notes-plugin")) return;

            // Create the note
            createNote(hoveredElement);
            setHoveredElement(null);
            setSelectedElement(hoveredElement);

            // Prevent any default behavior or event bubbling
            e.preventDefault();
            e.stopPropagation();
        },
        [isShiftMode, hoveredElement, setHoveredElement, setSelectedElement, createNote]
    );

    useEffect(() => {
        if (isShiftMode) {
            document.addEventListener("click", handleClick, { capture: true });
            return () => document.removeEventListener("click", handleClick, { capture: true });
        }
    }, [isShiftMode, handleClick]);

    return (
        <div className="notes-plugin">
            {notes.map((note) => (
                <NoteComponent
                    key={note.id}
                    note={note}
                    setSelectedElement={setSelectedElement}
                    onUpdateToast={(title, description) => toast({ title, description })}
                />
            ))}
        </div>
    );
}

export default App;
