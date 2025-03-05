import { useEffect, useRef, useCallback } from "react";
import { useHighlightStore } from "../stores/highlight-store";
import { useNotesStore } from "../stores/notes-store";
import { useModeStore, AppMode } from "../stores/use-mode-store";

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
    const { modes, setMode, addMode, removeMode, isMode } = useModeStore();
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
            if (e.key === "Shift" && !isMode(AppMode.INSPECTOR_MODE)) {
                // Reset the last processed element when entering inspector mode
                if (!isMode(AppMode.NOTES_MODE)) {
                    lastProcessedElement.current = null;
                }
                addMode(AppMode.INSPECTOR_MODE);

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
                // Only remove inspector mode if we're not in notes mode
                if (!isMode(AppMode.NOTES_MODE)) {
                    removeMode(AppMode.INSPECTOR_MODE);

                    // Only clear highlights if we're not in notes mode
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
    }, [isMode, addMode, removeMode, clearAllHighlights, updateOverlayPosition]);

    // Handle mouse movement for element inspection
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Always update cursor dot position in inspector mode
            if (isMode(AppMode.INSPECTOR_MODE)) {
                updateCursorPosition(e.clientX, e.clientY);
            }

            // If we're in notes mode, don't process mouse movements for highlighting
            if (isMode(AppMode.NOTES_MODE)) {
                return;
            }

            if (!isMode(AppMode.INSPECTOR_MODE)) {
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
        isMode,
        setHoveredElement,
        hasNoteForElement,
        highlightedElements,
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
            addMode(AppMode.NOTES_MODE);
            updateOverlayPosition(element);

            // Restore scroll position
            requestAnimationFrame(() => {
                window.scrollTo(scrollX, scrollY);
            });
        },
        [setSelectedElement, addMode, updateOverlayPosition]
    );

    // Handle note dismissal
    const dismissNote = useCallback(() => {
        // Clear all modes except DEBUG_MODE
        const currentModes = modes;
        if (currentModes & AppMode.NOTES_MODE) {
            removeMode(AppMode.NOTES_MODE);
        }
        if (currentModes & AppMode.INSPECTOR_MODE) {
            removeMode(AppMode.INSPECTOR_MODE);
        }
    }, [modes, removeMode]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isMode(AppMode.INSPECTOR_MODE)) {
                clearAllHighlights();
                setMode(AppMode.NEUTRAL);
            }
        };
    }, [isMode, clearAllHighlights, setMode]);

    return {
        hoveredElement,
        setHoveredElement,
        selectedElement,
        setSelectedElement,
        isInspectorMode: isMode(AppMode.INSPECTOR_MODE),
        isAddingNote: isMode(AppMode.NOTES_MODE),
        selectElementForNote,
        dismissNote,
    };
}
