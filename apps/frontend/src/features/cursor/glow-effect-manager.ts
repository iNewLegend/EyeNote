export class GlowEffectManager {
  private static instance: GlowEffectManager;
  private isEnabled: boolean = false;
  private rafId: number | null = null;
  private lastX: number = 0;
  private lastY: number = 0;
  private updateThreshold: number = 5; // Minimum pixel distance for update

  private constructor() {}

  static getInstance(): GlowEffectManager {
    if (!GlowEffectManager.instance) {
      GlowEffectManager.instance = new GlowEffectManager();
    }
    return GlowEffectManager.instance;
  }

  private shouldUpdate(x: number, y: number): boolean {
    const dx = Math.abs(x - this.lastX);
    const dy = Math.abs(y - this.lastY);
    return dx > this.updateThreshold || dy > this.updateThreshold;
  }

  updatePosition(x: number, y: number): void {
    if (!this.isEnabled || !this.shouldUpdate(x, y)) return;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    this.rafId = requestAnimationFrame(() => {
      document.documentElement.style.setProperty("--x", `${x}px`);
      document.documentElement.style.setProperty("--y", `${y}px`);
      this.lastX = x;
      this.lastY = y;
      this.rafId = null;
    });
  }

  enable(): void {
    if (!this.isEnabled) {
      this.isEnabled = true;
      document.addEventListener("mousemove", this.handleMouseMove, {
        passive: true,
      });
    }
  }

  disable(): void {
    if (this.isEnabled) {
      this.isEnabled = false;
      document.removeEventListener("mousemove", this.handleMouseMove);
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }
  }

  private handleMouseMove = (e: MouseEvent): void => {
    if (document.body.classList.contains("shift-pressed")) {
      this.updatePosition(e.clientX, e.clientY);
    }
  };
}
