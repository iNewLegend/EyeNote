import { useEffect, useRef } from "react";
import { useHighlightStore } from "../stores/highlight-store";
import { useNotesStore } from "../stores/notes-store";

export function useShiftHover() {
    const lastProcessedElement = useRef<Element | null>(null);
    const {
        hoveredElement,
        setHoveredElement,
        selectedElement,
        setSelectedElement,
        isShiftMode,
        setShiftMode,
        clearAllHighlights,
        highlightedElements,
    } = useHighlightStore();
    const { hasNoteForElement } = useNotesStore();

    // Handle shift key events
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Shift" && !isShiftMode) {
                setShiftMode(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === "Shift") {
                setShiftMode(false);
                clearAllHighlights();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("keyup", handleKeyUp);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("keyup", handleKeyUp);
        };
    }, [isShiftMode, setShiftMode, clearAllHighlights]);

    // Handle mouse movement
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isShiftMode) {
                if (lastProcessedElement.current) {
                    setHoveredElement(null);
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
            if (element.closest(".notes-plugin")) {
                setHoveredElement(null);
                lastProcessedElement.current = element;
                return;
            }

            setHoveredElement(element);
            lastProcessedElement.current = element;
        };

        document.addEventListener("mousemove", handleMouseMove);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
        };
    }, [isShiftMode, setHoveredElement, hasNoteForElement, highlightedElements]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isShiftMode) {
                clearAllHighlights();
                setShiftMode(false);
            }
        };
    }, []);

    return {
        hoveredElement,
        setHoveredElement,
        selectedElement,
        setSelectedElement,
        isShiftMode,
    };
}
