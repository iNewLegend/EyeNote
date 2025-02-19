import { useState, useEffect, useCallback, useRef } from "react";
import { CursorManager } from "../features/cursor/cursor-manager";
import { HighlightManager } from "../features/highlight/highlight-manager";
import type { Note } from "../types";

export function useShiftHover(notes: Note[]) {
    const [hoveredElement, setHoveredElement] = useState<Element | null>(null);
    const [selectedElement, setSelectedElement] = useState<Element | null>(null);
    const [isShiftMode, setIsShiftMode] = useState(false);
    const lastProcessedElement = useRef<Element | null>(null);

    const cursorManager = CursorManager.getInstance();
    const highlightManager = HighlightManager.getInstance();

    const clearAllHighlights = useCallback(() => {
        console.log("[useShiftHover] Clearing all highlights");
        // Don't clear highlights for elements that have open note dialogs
        const elementsToKeep = notes
            .filter((note) => note.isEditing)
            .map((note) => note.highlightedElement)
            .filter((el): el is Element => el !== null && el !== undefined);

        // Remove highlights from all elements except those with open dialogs
        highlightManager.getHighlightedElements().forEach((element) => {
            if (!elementsToKeep.includes(element)) {
                highlightManager.removeHighlight(element);
            }
        });

        setHoveredElement(null);
        lastProcessedElement.current = null;
    }, [notes]);

    const clearHighlight = useCallback(
        (element: Element | null) => {
            if (
                element &&
                !notes.some((note) => note.highlightedElement === element && note.isEditing)
            ) {
                console.log("[useShiftHover] Clearing highlight from element:", element);
                highlightManager.removeHighlight(element);
                lastProcessedElement.current = null;
            }
        },
        [notes]
    );

    // Handle mouse events
    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isShiftMode) return;

            const x = e.clientX;
            const y = e.clientY;

            // Get all elements at the current point
            const elements = document.elementsFromPoint(x, y);

            // Filter out plugin elements and find the most relevant element
            const relevantElements = elements.filter(
                (el) =>
                    !el.closest(".notes-plugin") &&
                    el !== document.body &&
                    el !== document.documentElement
            );

            if (!relevantElements.length) return;

            // Always select the first (most nested) semantic or interactive element
            const targetElement =
                relevantElements.find((element) => {
                    // Check if it's a semantic element
                    const isSemanticElement =
                        /^(h[1-6]|p|li|dt|dd|figcaption|label|article|section|main|nav|header|footer|aside)$/i.test(
                            element.tagName
                        );

                    // Check if it's an interactive element
                    const isInteractiveElement = /^(button|a|input|select|textarea)$/i.test(
                        element.tagName
                    );

                    // Check if it has meaningful text content
                    const hasText = (element.textContent?.trim()?.length ?? 0) > 0;

                    return (isSemanticElement || isInteractiveElement) && hasText;
                }) || relevantElements[0]; // Fallback to most nested element if no semantic element found

            if (!targetElement || targetElement === lastProcessedElement.current) return;

            console.log("[useShiftHover] Selected element:", {
                tag: targetElement.tagName,
                id: targetElement.id,
                class: targetElement.className,
                isNested: relevantElements.indexOf(targetElement),
                hasChildren: targetElement.children?.length > 0,
                childrenTypes: targetElement.children
                    ? [...targetElement.children].map((child) => child.tagName)
                    : [],
            });

            // Clear previous highlight if different element
            if (hoveredElement && hoveredElement !== targetElement) {
                clearHighlight(hoveredElement);
            }

            // Add highlight to new element
            highlightManager.addHighlight(targetElement);
            lastProcessedElement.current = targetElement;
            setHoveredElement(targetElement);
        },
        [isShiftMode, hoveredElement, clearHighlight]
    );

    // Handle shift key events
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Shift" && !isShiftMode) {
                console.log("[useShiftHover] Shift key pressed");
                clearAllHighlights();
                setSelectedElement(null);

                cursorManager.enableShiftMode();
                setIsShiftMode(true);
                document.addEventListener("mousemove", handleMouseMove);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === "Shift" && isShiftMode) {
                console.log("[useShiftHover] Shift key released");
                document.removeEventListener("mousemove", handleMouseMove);

                // Clear highlight from currently hovered element
                if (hoveredElement) {
                    clearHighlight(hoveredElement);
                }

                setIsShiftMode(false);
                cursorManager.disableShiftMode();
                clearAllHighlights();
            }
        };

        window.addEventListener("keydown", handleKeyDown, { capture: true });
        window.addEventListener("keyup", handleKeyUp, { capture: true });

        return () => {
            window.removeEventListener("keydown", handleKeyDown, { capture: true });
            window.removeEventListener("keyup", handleKeyUp, { capture: true });
            document.removeEventListener("mousemove", handleMouseMove);

            if (isShiftMode) {
                setIsShiftMode(false);
                cursorManager.disableShiftMode();
                clearAllHighlights();
            }
        };
    }, [
        clearAllHighlights,
        handleMouseMove,
        cursorManager,
        isShiftMode,
        hoveredElement,
        clearHighlight,
    ]);

    // Handle mouseout/mouseleave events
    useEffect(() => {
        const handleMouseLeave = () => {
            if (isShiftMode && hoveredElement) {
                clearHighlight(hoveredElement);
                setHoveredElement(null);
                lastProcessedElement.current = null;
            }
        };

        document.addEventListener("mouseleave", handleMouseLeave);
        return () => {
            document.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, [isShiftMode, hoveredElement, clearHighlight]);

    // Clear highlights when notes change
    useEffect(() => {
        if (notes.some((note) => note.isEditing)) {
            console.log("[useShiftHover] Note dialog opened");
            document.removeEventListener("mousemove", handleMouseMove);
            setIsShiftMode(false);
            cursorManager.disableShiftMode();

            // Get the element being edited
            const editingNote = notes.find((note) => note.isEditing);
            if (editingNote?.highlightedElement) {
                // Ensure the highlight remains for the element being edited
                highlightManager.addHighlight(editingNote.highlightedElement);
                setSelectedElement(editingNote.highlightedElement);
            }
        }
    }, [notes, clearAllHighlights, handleMouseMove, cursorManager]);

    return {
        hoveredElement,
        setHoveredElement,
        selectedElement,
        setSelectedElement,
        isShiftMode,
    };
}
