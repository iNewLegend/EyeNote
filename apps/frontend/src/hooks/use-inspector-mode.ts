import { useEffect, useRef, useCallback } from "react";
import { useHighlightStore } from "../stores/highlight-store";
import { useNotesStore } from "../stores/notes-store";
import { useModeStore } from "../stores/use-mode-store";

export function useInspectorMode() {
    const lastProcessedElement = useRef<Element | null>(null);
    const {
        hoveredElement,
        setHoveredElement,
        selectedElement,
        setSelectedElement,
        clearAllHighlights,
        highlightedElements,
    } = useHighlightStore();
    const { isInspectorMode, isAddingNote, setInspectorMode, setAddingNote } = useModeStore();
    const { hasNoteForElement } = useNotesStore();

    // Function to update overlay position
    const updateOverlayPosition = useCallback((element: Element | null) => {
        const overlay = document.getElementById("eye-note-highlight-overlay");
        if (!overlay) return;

        if (!element) {
            overlay.style.display = "none";
            return;
        }

        // Store current scroll position
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        const rect = element.getBoundingClientRect();
        overlay.style.display = "block";
        overlay.style.top = rect.top + "px";
        overlay.style.left = rect.left + "px";
        overlay.style.width = rect.width + "px";
        overlay.style.height = rect.height + "px";

        // Restore scroll position to prevent unwanted scrolling
        requestAnimationFrame(() => {
            window.scrollTo(scrollX, scrollY);
        });
    }, []);

    // Function to update cursor dot position
    const updateCursorPosition = useCallback((x: number, y: number) => {
        const cursorDot = document.querySelector(".cursor-dot");
        if (!cursorDot) return;

        requestAnimationFrame(() => {
            (cursorDot as HTMLElement).style.left = `${x}px`;
            (cursorDot as HTMLElement).style.top = `${y}px`;
        });
    }, []);

    // Handle shift key events to toggle inspector mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Shift" && !isInspectorMode) {
                // Reset the last processed element when entering inspector mode
                if (!isAddingNote) {
                    lastProcessedElement.current = null;
                }
                setInspectorMode(true);

                // Configure the interaction blocker
                const interactionBlocker = document.getElementById("eye-note-interaction-blocker");
                if (interactionBlocker) {
                    interactionBlocker.style.display = "block";
                    interactionBlocker.style.pointerEvents = "none";
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === "Shift") {
                setInspectorMode(false);

                // Only clear highlights if we're not adding a note
                if (!isAddingNote) {
                    clearAllHighlights();

                    // Reset the last processed element
                    const currentElement = lastProcessedElement.current;
                    if (currentElement instanceof HTMLElement) {
                        currentElement.style.cursor = "";
                    }
                    lastProcessedElement.current = null;

                    // Hide the overlay and interaction blocker
                    updateOverlayPosition(null);
                    const interactionBlocker = document.getElementById(
                        "eye-note-interaction-blocker"
                    );
                    if (interactionBlocker) {
                        interactionBlocker.style.display = "none";
                    }
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("keyup", handleKeyUp);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("keyup", handleKeyUp);
        };
    }, [
        isInspectorMode,
        setInspectorMode,
        clearAllHighlights,
        isAddingNote,
        updateOverlayPosition,
    ]);

    // Handle mouse movement for element inspection
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Always update cursor dot position in inspector mode
            if (isInspectorMode) {
                updateCursorPosition(e.clientX, e.clientY);
            }

            // If we're adding a note, don't process mouse movements for highlighting
            if (isAddingNote) {
                return;
            }

            if (!isInspectorMode) {
                if (lastProcessedElement.current) {
                    setHoveredElement(null);
                    // Remove any cursor style changes
                    const currentElement = lastProcessedElement.current;
                    if (currentElement instanceof HTMLElement) {
                        currentElement.style.cursor = "";
                    }
                    lastProcessedElement.current = null;
                }
                return;
            }

            const element = document.elementFromPoint(e.clientX, e.clientY);
            if (!element || element === lastProcessedElement.current) return;

            // Don't highlight elements that already have notes, unless they're already highlighted
            if (hasNoteForElement(element) && !highlightedElements.has(element)) {
                setHoveredElement(null);
                lastProcessedElement.current = element;
                return;
            }

            // Don't highlight plugin elements
            if (element.closest(".notes-plugin") || element.closest("#eye-not-shadow-dom")) {
                setHoveredElement(null);
                lastProcessedElement.current = element;
                return;
            }

            // Update cursor style for the element
            const currentElement = lastProcessedElement.current;
            if (currentElement instanceof HTMLElement) {
                currentElement.style.cursor = "";
            }

            if (element instanceof HTMLElement) {
                element.style.cursor = "none";
            }

            setHoveredElement(element);
            lastProcessedElement.current = element;

            // Update the overlay to highlight the element
            updateOverlayPosition(element);
        };

        document.addEventListener("mousemove", handleMouseMove);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
        };
    }, [
        isInspectorMode,
        setHoveredElement,
        hasNoteForElement,
        highlightedElements,
        isAddingNote,
        updateOverlayPosition,
        updateCursorPosition,
    ]);

    // Handle element selection for note creation
    const selectElementForNote = useCallback(
        (element: HTMLElement) => {
            // Store current scroll position
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;

            setSelectedElement(element);
            setAddingNote(true);
            updateOverlayPosition(element);

            // Restore scroll position
            requestAnimationFrame(() => {
                window.scrollTo(scrollX, scrollY);
            });
        },
        [setSelectedElement, setAddingNote, updateOverlayPosition]
    );

    // Handle note dismissal
    const dismissNote = useCallback(() => {
        setAddingNote(false);

        // If inspector mode is off after dismissal, hide the overlay
        if (!isInspectorMode) {
            updateOverlayPosition(null);

            const interactionBlocker = document.getElementById("eye-note-interaction-blocker");
            if (interactionBlocker) {
                interactionBlocker.style.display = "none";
            }
        } else {
            // If we're still in inspector mode (shift key still pressed),
            // make sure the interaction blocker is properly configured
            const interactionBlocker = document.getElementById("eye-note-interaction-blocker");
            if (interactionBlocker) {
                interactionBlocker.style.display = "block";
                interactionBlocker.style.pointerEvents = "none";
            }

            // If there's a hovered element, update the overlay to show it
            if (hoveredElement) {
                updateOverlayPosition(hoveredElement);
            }
        }
    }, [isInspectorMode, setAddingNote, hoveredElement, updateOverlayPosition]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isInspectorMode) {
                clearAllHighlights();
                setInspectorMode(false);
                setAddingNote(false);
            }
        };
    }, [isInspectorMode, clearAllHighlights, setInspectorMode, setAddingNote]);

    return {
        hoveredElement,
        setHoveredElement,
        selectedElement,
        setSelectedElement,
        isInspectorMode,
        isAddingNote,
        selectElementForNote,
        dismissNote,
    };
}
