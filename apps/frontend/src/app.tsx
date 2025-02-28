import { useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useNotesStore } from "./stores/notes-store";
import { NoteComponent } from "./features/notes/note-component";
import { useInspectorMode } from "./hooks/use-inspector-mode";

function App() {
    const { notes, createNote } = useNotesStore();
    const { hoveredElement, setHoveredElement, setSelectedElement, isInspectorMode } =
        useInspectorMode();

    const handleClick = useCallback(
        (e: MouseEvent) => {
            console.log("Click event in app.tsx", {
                e,
                target: e.target,
                currentTarget: e.currentTarget,
                hoveredElement,
                isInspectorMode,
                isInteractionBlocker: (e.target as Element).id === "eye-note-interaction-blocker",
            });

            if (!isInspectorMode || !hoveredElement) {
                console.log("Not in inspector mode or no hovered element");
                return;
            }

            // Always prevent default behavior and stop propagation in inspector mode
            e.preventDefault();
            e.stopPropagation();

            // Check if we clicked on the interaction blocker or a plugin element
            const target = e.target as Element;
            const isInteractionBlocker = target.id === "eye-note-interaction-blocker";
            const isPluginElement = target.closest(".notes-plugin");

            // If we clicked on a plugin element (but not the interaction blocker), don't create a note
            if (isPluginElement && !isInteractionBlocker) {
                console.log("Clicked on plugin element, not creating note");
                return;
            }

            console.log("Creating note for element", hoveredElement);

            // Create the note if we're in inspector mode and have a hovered element
            createNote(hoveredElement);
            setHoveredElement(null);
            setSelectedElement(hoveredElement);
        },
        [isInspectorMode, hoveredElement, setHoveredElement, setSelectedElement, createNote]
    );

    useEffect(() => {
        console.log("isInspectorMode", isInspectorMode);
        if (isInspectorMode) {
            document.addEventListener("click", handleClick, { capture: true });
            return () => document.removeEventListener("click", handleClick, { capture: true });
        }
    }, [isInspectorMode, handleClick]);

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
