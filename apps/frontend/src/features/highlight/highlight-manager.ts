export class HighlightManager {
  private static instance: HighlightManager;
  private highlightedElements: Set<Element>;
  private mutationObserver: MutationObserver;
  private rafId: number | null = null;
  private lastHighlightedElement: Element | null = null;
  private overlay: HTMLDivElement;

  private constructor() {
    this.highlightedElements = new Set();

    // Create highlight overlay element
    this.overlay = document.createElement("div");
    this.overlay.id = "eye-note-highlight-overlay";
    this.overlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483647;
      border: 2px solid #4804ad;
      background: rgba(72, 4, 173, 0.1);
      transition: all 0.2s ease;
      box-sizing: border-box;
      display: none;
    `;
    document.body.appendChild(this.overlay);

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

  private updateOverlay(element: Element | null): void {
    if (!element) {
      this.overlay.style.display = "none";
      return;
    }
    const rect = element.getBoundingClientRect();
    this.overlay.style.display = "block";
    this.overlay.style.top = rect.top + "px";
    this.overlay.style.left = rect.left + "px";
    this.overlay.style.width = rect.width + "px";
    this.overlay.style.height = rect.height + "px";
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

      // Add element to tracked set and update overlay
      this.highlightedElements.add(element);
      this.lastHighlightedElement = element;
      this.updateOverlay(element);

      // Update cursor style if element is HTMLElement
      if (element instanceof HTMLElement) {
        element.style.cursor = "crosshair";
      }

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

      // Reset cursor style if element is HTMLElement
      if (element instanceof HTMLElement) {
        element.style.cursor = "";
      }

      // Remove from tracked set and hide overlay
      this.highlightedElements.delete(element);
      if (this.lastHighlightedElement === element) {
        this.lastHighlightedElement = null;
        this.updateOverlay(null);
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

      // Reset cursor styles and clear tracked elements
      this.highlightedElements.forEach((element) => {
        if (element instanceof HTMLElement) {
          element.style.cursor = "";
        }
      });

      this.highlightedElements.clear();
      this.lastHighlightedElement = null;
      this.updateOverlay(null);

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
        this.updateOverlay(null);
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
    this.overlay.remove();
  }
}
