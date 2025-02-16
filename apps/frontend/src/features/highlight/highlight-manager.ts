export class HighlightManager {
  private static instance: HighlightManager;
  private highlightedElements: Set<Element>;
  private mutationObserver: MutationObserver;
  private rafId: number | null = null;
  private highlightClass = "eye-note-highlight";
  private lastHighlightedElement: Element | null = null;
  private originalStyles: WeakMap<Element, { backgroundColor: string }>;
  private styleElement: HTMLStyleElement | null = null;

  private constructor() {
    this.highlightedElements = new Set();
    this.originalStyles = new WeakMap();

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

    // Add cursor style for highlighted elements
    this.styleElement = document.createElement("style");
    this.styleElement.id = "eye-note-cursor-styles";
    this.styleElement.textContent = `
      body.shift-pressed .eye-note-highlight,
      body.shift-pressed .eye-note-highlight * {
        cursor: url('${chrome.runtime.getURL(
          "cursor.png"
        )}') 6 6, auto !important;
      }
    `;
    document.head.appendChild(this.styleElement);

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
        this.removeHighlight(this.lastHighlightedElement);
      }

      // Store original styles
      const computedStyle = window.getComputedStyle(element);
      this.originalStyles.set(element, {
        backgroundColor: computedStyle.backgroundColor,
      });

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

      // Restore original styles
      const originalStyles = this.originalStyles.get(element);
      if (originalStyles && element instanceof HTMLElement) {
        element.style.backgroundColor = originalStyles.backgroundColor;
        this.originalStyles.delete(element);
      }

      // Remove highlight class
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

      // Restore original styles and remove highlights
      this.highlightedElements.forEach((element) => {
        const originalStyles = this.originalStyles.get(element);
        if (originalStyles && element instanceof HTMLElement) {
          element.style.backgroundColor = originalStyles.backgroundColor;
          this.originalStyles.delete(element);
        }
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
      const originalStyles = this.originalStyles.get(element);
      if (originalStyles) {
        this.originalStyles.delete(element);
      }
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
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }
}
