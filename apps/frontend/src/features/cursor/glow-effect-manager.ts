export class GlowEffectManager {
  private static instance: GlowEffectManager;
  private isEnabled: boolean = false;

  private constructor() {}

  static getInstance(): GlowEffectManager {
    if (!GlowEffectManager.instance) {
      GlowEffectManager.instance = new GlowEffectManager();
    }
    return GlowEffectManager.instance;
  }

  updatePosition(x: number, y: number): void {
    if (this.isEnabled) {
      document.body.style.setProperty("--x", `${x}px`);
      document.body.style.setProperty("--y", `${y}px`);
    }
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
    }
  }

  private handleMouseMove = (e: MouseEvent): void => {
    if (document.body.classList.contains("shift-pressed")) {
      requestAnimationFrame(() => this.updatePosition(e.clientX, e.clientY));
    }
  };
}
