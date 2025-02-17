export class GlowEffectManager {
  private static instance: GlowEffectManager;
  private isEnabled: boolean = false;
  private glowElement: HTMLDivElement | null = null;

  private constructor() {
    this.glowElement = document.querySelector(".cursor-glow");
  }

  static getInstance(): GlowEffectManager {
    if (!GlowEffectManager.instance) {
      GlowEffectManager.instance = new GlowEffectManager();
    }
    return GlowEffectManager.instance;
  }

  updatePosition(x: number, y: number): void {
    if (!this.isEnabled || !this.glowElement) return;
    this.glowElement.style.transform = `translate(${x}px, ${y}px)`;
  }

  enable(): void {
    if (!this.isEnabled) {
      this.isEnabled = true;
      this.glowElement = document.querySelector(".cursor-glow");
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
      this.updatePosition(e.clientX, e.clientY);
    }
  };
}
