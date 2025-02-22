import { useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useNotesStore } from "./stores/notes-store";
import { NoteComponent } from "./features/notes/note-component";
import { useShiftHover } from "./hooks/use-shift-hover";

function App() {
    const { notes, createNote } = useNotesStore();
    const { hoveredElement, setHoveredElement, setSelectedElement, isShiftMode } = useShiftHover();

    const handleClick = useCallback(
        (e: MouseEvent) => {
            console.log({
                e,
                hoveredElement,
                isShiftMode,
            });

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
        console.log("isShiftMode", isShiftMode);
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
                    onUpdateToast={(title, description) => toast(title, { description })}
                />
            ))}
        </div>
    );
}

export default App;
