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

        const handleMouseMove = (e: MouseEvent) => {
            if (!isShiftMode) return;

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

        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("keyup", handleKeyUp);
        document.addEventListener("mousemove", handleMouseMove);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("keyup", handleKeyUp);
            document.removeEventListener("mousemove", handleMouseMove);
            setShiftMode(false);
            clearAllHighlights();
        };
    }, [
        isShiftMode,
        setShiftMode,
        setHoveredElement,
        clearAllHighlights,
        hasNoteForElement,
        highlightedElements,
    ]);

    return {
        hoveredElement,
        setHoveredElement,
        selectedElement,
        setSelectedElement,
        isShiftMode,
    };
}
