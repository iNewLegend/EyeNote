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

      // Find the most relevant parent element
      let targetElement = element;
      let parentElement = element.parentElement;

      while (parentElement && !parentElement.closest(".notes-plugin")) {
        if (
          parentElement.textContent?.trim() &&
          parentElement !== document.body &&
          parentElement !== document.documentElement
        ) {
          targetElement = parentElement;
          break;
        }
        parentElement = parentElement.parentElement;
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
