export class HighlightManager {
  private static instance: HighlightManager;
  private currentHighlightedElement: Element | null = null;
  private mutationObserver: MutationObserver;
  private rafId: number | null = null;
  private overlay: HTMLDivElement;

  private constructor() {
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
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          for (const node of mutation.removedNodes) {
            if (
              node instanceof Element &&
              node === this.currentHighlightedElement
            ) {
              this.currentHighlightedElement = null;
              this.updateOverlay(null);
            }
          }
        }
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
      if (element === this.currentHighlightedElement) {
        return;
      }

      // Cancel any pending RAF
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
      }

      // Remove highlight from previous element
      if (this.currentHighlightedElement) {
        if (this.currentHighlightedElement instanceof HTMLElement) {
          this.currentHighlightedElement.style.cursor = "";
        }
      }

      // Update current highlighted element and overlay
      this.currentHighlightedElement = element;
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

      // Clear current highlighted element and hide overlay
      if (this.currentHighlightedElement === element) {
        this.currentHighlightedElement = null;
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

      // Reset cursor style if current element is HTMLElement
      if (this.currentHighlightedElement instanceof HTMLElement) {
        this.currentHighlightedElement.style.cursor = "";
      }

      // Clear current highlighted element and hide overlay
      this.currentHighlightedElement = null;
      this.updateOverlay(null);

      console.log("[HighlightManager] Cleared all highlights");
    } catch (error) {
      console.error("[HighlightManager] Error clearing highlights:", error);
    }
  }

  isHighlighted(element: Element): boolean {
    return this.currentHighlightedElement === element;
  }

  getHighlightedElements(): Set<Element> {
    return this.currentHighlightedElement
      ? new Set([this.currentHighlightedElement])
      : new Set();
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
