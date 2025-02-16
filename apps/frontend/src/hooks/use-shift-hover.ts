import { useState, useEffect, useCallback, useRef } from "react";
import { CursorManager } from "../features/cursor/cursor-manager";
import { HighlightManager } from "../features/highlight/highlight-manager";
import type { Note } from "../types";

export function useShiftHover(notes: Note[]) {
  const [hoveredElement, setHoveredElement] = useState<Element | null>(null);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [isShiftMode, setIsShiftMode] = useState(false);

  // Use refs for values that need to persist between renders but shouldn't trigger re-renders
  const stateRef = useRef({
    isShiftMode: false,
    hoveredElement: null as Element | null,
  });

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
    stateRef.current.hoveredElement = null;
  }, [notes]);

  const clearHighlight = useCallback(
    (element: Element | null) => {
      if (
        element &&
        !notes.some(
          (note) => note.highlightedElement === element && note.isEditing
        )
      ) {
        console.log(
          "[useShiftHover] Clearing highlight from element:",
          element
        );
        highlightManager.removeHighlight(element);
      }
    },
    [notes]
  );

  // Handle mouse events
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!stateRef.current.isShiftMode) return;

      const x = e.clientX;
      const y = e.clientY;
      const element = document.elementFromPoint(x, y) as Element;

      if (!element) return;

      // First, clear any existing highlight
      if (stateRef.current.hoveredElement) {
        highlightManager.removeHighlight(stateRef.current.hoveredElement);
        stateRef.current.hoveredElement = null;
        setHoveredElement(null);
      }

      // Don't proceed if hovering over plugin elements
      if (element.closest(".notes-plugin")) return;

      // Find the most relevant element by checking text content and dimensions
      let targetElement = element;

      // Check if the current element is a semantic element (h1-h6, p, etc.)
      const isSemanticElement =
        /^h[1-6]$|^p$|^li$|^dt$|^dd$|^figcaption$|^label$/i.test(
          element.tagName
        );

      // If it's not a semantic element, try to find a better parent
      if (!isSemanticElement) {
        let bestElement = element;
        let parentElement = element.parentElement;
        let bestTextLength = element.textContent?.trim().length || 0;
        let bestArea = 0;

        // Get element's area
        const rect = element.getBoundingClientRect();
        bestArea = rect.width * rect.height;

        while (parentElement && !parentElement.closest(".notes-plugin")) {
          // Skip body and html
          if (
            parentElement === document.body ||
            parentElement === document.documentElement
          ) {
            break;
          }

          const parentRect = parentElement.getBoundingClientRect();
          const parentArea = parentRect.width * parentRect.height;
          const parentTextLength =
            parentElement.textContent?.trim().length || 0;
          const isParentSemantic =
            /^h[1-6]$|^p$|^li$|^dt$|^dd$|^figcaption$|^label$/i.test(
              parentElement.tagName
            );

          // Check if this parent is a better target based on:
          // 1. Has meaningful text content
          // 2. Not too large compared to current best
          // 3. Contains the mouse position within its bounds
          // 4. Preferably a semantic element
          if (
            parentTextLength > 0 &&
            (isParentSemantic || parentArea < bestArea * 1.5) && // Stricter size comparison for non-semantic elements
            x >= parentRect.left &&
            x <= parentRect.right &&
            y >= parentRect.top &&
            y <= parentRect.bottom
          ) {
            bestElement = parentElement;
            bestArea = parentArea;
            bestTextLength = parentTextLength;

            // If we found a semantic element, stop looking further
            if (isParentSemantic) {
              break;
            }
          }

          parentElement = parentElement.parentElement;
        }

        targetElement = bestElement;
      }

      // Don't add highlight if it's a plugin element or the same as current
      if (targetElement.closest(".notes-plugin")) return;
      if (targetElement === stateRef.current.hoveredElement) return;

      // Add highlight to new element
      highlightManager.addHighlight(targetElement);
      stateRef.current.hoveredElement = targetElement;
      setHoveredElement(targetElement);
    },
    [] // Remove clearHighlight dependency as we're using highlightManager directly
  );

  // Handle shift key events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift" && !stateRef.current.isShiftMode) {
        console.log("[useShiftHover] Shift key pressed");
        clearAllHighlights();
        setSelectedElement(null);

        cursorManager.enableShiftMode();
        stateRef.current.isShiftMode = true;
        setIsShiftMode(true);
        document.addEventListener("mousemove", handleMouseMove);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift" && stateRef.current.isShiftMode) {
        console.log("[useShiftHover] Shift key released");
        document.removeEventListener("mousemove", handleMouseMove);

        // Clear highlight from currently hovered element
        if (stateRef.current.hoveredElement) {
          clearHighlight(stateRef.current.hoveredElement);
        }

        stateRef.current.isShiftMode = false;
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

      if (stateRef.current.isShiftMode) {
        stateRef.current.isShiftMode = false;
        setIsShiftMode(false);
        cursorManager.disableShiftMode();
        clearAllHighlights();
      }
    };
  }, [clearAllHighlights, handleMouseMove, cursorManager]);

  // Handle mouseout/mouseleave events
  useEffect(() => {
    const handleMouseLeave = () => {
      if (stateRef.current.isShiftMode && stateRef.current.hoveredElement) {
        clearHighlight(stateRef.current.hoveredElement);
        stateRef.current.hoveredElement = null;
        setHoveredElement(null);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [clearHighlight]);

  // Clear highlights when notes change
  useEffect(() => {
    if (notes.some((note) => note.isEditing)) {
      console.log("[useShiftHover] Note dialog opened");
      document.removeEventListener("mousemove", handleMouseMove);
      stateRef.current.isShiftMode = false;
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
