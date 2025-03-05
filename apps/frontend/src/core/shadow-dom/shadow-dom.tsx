import React from "react";
import { useEffect, useCallback, useState } from "react";
import { toast } from "sonner";
import { useNotesStore } from "../../stores/notes-store";
import { NoteComponent } from "../../features/notes/note-component";
import { useInspectorMode } from "../../hooks/use-inspector-mode";
import { ThemeProvider } from "../theme/theme-provider";
import { Toaster } from "../../components/ui/sonner";

export const ShadowDOM: React.FC = () => {
    const { notes, createNote } = useNotesStore();
    const {
        hoveredElement,
        setHoveredElement,
        setSelectedElement,
        selectElementForNote,
        dismissNote,
        isInspectorMode,
    } = useInspectorMode();
    const [isProcessingNoteDismissal, setIsProcessingNoteDismissal] = useState(false);

    const handleClick = useCallback(
        (e: MouseEvent) => {
            console.log("Click event in app.tsx", {
                e,
                target: e.target,
                currentTarget: e.currentTarget,
                hoveredElement,
                isInspectorMode,
                isInteractionBlocker: (e.target as Element).id === "eye-note-interaction-blocker",
                isProcessingNoteDismissal,
            });

            // If we're processing a note dismissal, ignore the click
            if (isProcessingNoteDismissal) {
                e.preventDefault();
                e.stopPropagation();
                console.log("Ignoring click during note dismissal processing");
                return;
            }

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

            // Store current scroll position
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;

            // Create the note if we're in inspector mode and have a hovered element
            createNote(hoveredElement);
            setHoveredElement(null);

            // Use our new selectElementForNote helper function
            if (hoveredElement instanceof HTMLElement) {
                selectElementForNote(hoveredElement);
            }

            // Dispatch a custom event to notify the content script that an element has been selected
            window.dispatchEvent(
                new CustomEvent("eye-note:element-selected", {
                    detail: { element: hoveredElement },
                })
            );

            // Use requestAnimationFrame to restore scroll position after the note is created
            requestAnimationFrame(() => {
                window.scrollTo(scrollX, scrollY);
            });
        },
        [
            isInspectorMode,
            hoveredElement,
            setHoveredElement,
            createNote,
            selectElementForNote,
            isProcessingNoteDismissal,
        ]
    );

    useEffect(() => {
        if (isInspectorMode) {
            document.addEventListener("click", handleClick, { capture: true });
            return () => document.removeEventListener("click", handleClick, { capture: true });
        }
    }, [isInspectorMode, handleClick]);

    // Function to handle note dismissal
    const handleNoteDismissed = useCallback(() => {
        // Set a flag to prevent immediate click handling
        setIsProcessingNoteDismissal(true);

        // Use our new dismissNote helper function
        dismissNote();

        // Reset the flag after a short delay to allow the DOM to update
        setTimeout(() => {
            setIsProcessingNoteDismissal(false);
        }, 100);
    }, [dismissNote]);

    return (
        <ThemeProvider>
            <div id="eye-not-shadow-dom">
                <Toaster />
                <div className="notes-plugin">
                    {notes.map((note) => (
                        <NoteComponent
                            key={note.id}
                            note={note}
                            setSelectedElement={setSelectedElement}
                            onUpdateToast={(title, description) => toast(title, { description })}
                            onNoteDismissed={handleNoteDismissed}
                        />
                    ))}
                </div>
            </div>
        </ThemeProvider>
    );
};
