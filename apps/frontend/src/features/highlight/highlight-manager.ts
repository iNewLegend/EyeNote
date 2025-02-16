export class HighlightManager {
  private static instance: HighlightManager;
  private highlightedElements: Set<Element>;
  private mutationObserver: MutationObserver;
  private rafId: number | null = null;
  private highlightClass = "eye-note-highlight";
  private lastHighlightedElement: Element | null = null;

  private constructor() {
    this.highlightedElements = new Set();

    // Create mutation observer to clean up highlights for removed elements
    this.mutationObserver = new MutationObserver((mutations) => {
      let needsCleanup = false;

      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          for (const node of mutation.removedNodes) {
            if (node instanceof Element && this.highlightedElements.has(node)) {
              this.highlightedElements.delete(node);
              needsCleanup = true;
            }
          }
        }
      }

      if (needsCleanup) {
        this.cleanupHighlights();
      }
    });

    // Start observing document for removed nodes
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

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
      if (element === this.lastHighlightedElement) {
        return;
      }

      // Cancel any pending RAF
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
      }

      // Remove highlight from previous element
      if (
        this.lastHighlightedElement &&
        this.lastHighlightedElement !== element
      ) {
        this.lastHighlightedElement.classList.remove(this.highlightClass);
        this.highlightedElements.delete(this.lastHighlightedElement);
      }

      // Add highlight to the new element
      element.classList.add(this.highlightClass);
      this.highlightedElements.add(element);
      this.lastHighlightedElement = element;

      console.log("[HighlightManager] Added highlight to:", element);
    } catch (error) {
      console.error("[HighlightManager] Error adding highlight:", error);
    }
  }

  removeHighlight(element: Element): void {
    if (!element) return;

    try {
      // Cancel any pending RAF
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
      }

      // Immediately remove the highlight
      element.classList.remove(this.highlightClass);
      this.highlightedElements.delete(element);
      if (this.lastHighlightedElement === element) {
        this.lastHighlightedElement = null;
      }
      console.log("[HighlightManager] Removed highlight from:", element);
    } catch (error) {
      console.error("[HighlightManager] Error removing highlight:", error);
    }
  }

  clearAllHighlights(): void {
    try {
      // Cancel any pending RAF
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
      }

      // Immediately remove all highlights
      this.highlightedElements.forEach((element) => {
        element.classList.remove(this.highlightClass);
      });
      this.highlightedElements.clear();
      this.lastHighlightedElement = null;
      console.log("[HighlightManager] Cleared all highlights");
    } catch (error) {
      console.error("[HighlightManager] Error clearing highlights:", error);
    }
  }

  private cleanupHighlights(): void {
    const elementsToRemove: Element[] = [];

    this.highlightedElements.forEach((element) => {
      if (!document.contains(element)) {
        elementsToRemove.push(element);
      }
    });

    elementsToRemove.forEach((element) => {
      this.highlightedElements.delete(element);
      if (this.lastHighlightedElement === element) {
        this.lastHighlightedElement = null;
      }
    });
  }

  isHighlighted(element: Element): boolean {
    return this.highlightedElements.has(element);
  }

  getHighlightedElements(): Set<Element> {
    this.cleanupHighlights();
    return new Set(this.highlightedElements);
  }

  destroy(): void {
    this.clearAllHighlights();
    this.mutationObserver.disconnect();
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
