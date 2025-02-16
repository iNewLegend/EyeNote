export class HighlightManager {
  private static instance: HighlightManager;
  private highlightedElements: Set<Element>;

  private constructor() {
    this.highlightedElements = new Set();
    console.log("[HighlightManager] Initialized");
  }

  static getInstance(): HighlightManager {
    if (!HighlightManager.instance) {
      HighlightManager.instance = new HighlightManager();
    }
    return HighlightManager.instance;
  }

  addHighlight(element: Element): void {
    if (!element || element.closest(".notes-plugin")) {
      return;
    }

    try {
      // Skip if element is already highlighted
      if (element.classList.contains("eye-note-highlight")) {
        return;
      }

      // Add highlight to the new element
      element.classList.add("eye-note-highlight");
      this.highlightedElements.add(element);
      console.log("[HighlightManager] Added highlight to:", element);
    } catch (error) {
      console.error("[HighlightManager] Error adding highlight:", error);
    }
  }

  removeHighlight(element: Element): void {
    if (!element) return;

    try {
      if (element.classList.contains("eye-note-highlight")) {
        element.classList.remove("eye-note-highlight");
        this.highlightedElements.delete(element);
        console.log("[HighlightManager] Removed highlight from:", element);
      }
    } catch (error) {
      console.error("[HighlightManager] Error removing highlight:", error);
    }
  }

  clearAllHighlights(): void {
    try {
      document.querySelectorAll(".eye-note-highlight").forEach((element) => {
        element.classList.remove("eye-note-highlight");
      });
      this.highlightedElements.clear();
      console.log("[HighlightManager] Cleared all highlights");
    } catch (error) {
      console.error("[HighlightManager] Error clearing highlights:", error);
    }
  }

  isHighlighted(element: Element): boolean {
    if (!element) return false;
    return element.classList.contains("eye-note-highlight");
  }

  getHighlightedElements(): Set<Element> {
    // Clean up any elements that might have been removed from the DOM
    let removedCount = 0;
    this.highlightedElements.forEach((element) => {
      if (!document.contains(element)) {
        this.highlightedElements.delete(element);
        removedCount++;
      }
    });
    if (removedCount > 0) {
      console.log(
        "[HighlightManager] Cleaned up",
        removedCount,
        "removed elements"
      );
    }
    return new Set(this.highlightedElements);
  }
}
