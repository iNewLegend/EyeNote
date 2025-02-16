import { GlowEffectManager } from "./glow-effect-manager";

export class CursorManager {
  private static instance: CursorManager;
  private isShiftMode: boolean = false;
  private glowEffectManager: GlowEffectManager;
  private lastStateChange: number = 0;

  private constructor() {
    this.glowEffectManager = GlowEffectManager.getInstance();
    this.isShiftMode = false;
    this.lastStateChange = 0;
    console.log("[CursorManager] Initialized");
  }

  static getInstance(): CursorManager {
    if (!CursorManager.instance) {
      CursorManager.instance = new CursorManager();
    }
    return CursorManager.instance;
  }

  enableShiftMode(): void {
    const now = Date.now();
    if (this.isShiftMode || now - this.lastStateChange < 200) {
      return;
    }

    console.log("[CursorManager] Enabling shift mode");
    this.isShiftMode = true;
    this.lastStateChange = now;
    document.body.classList.add("shift-pressed");
    this.glowEffectManager.enable();
    console.log(
      "[CursorManager] Shift mode enabled, body classes:",
      document.body.classList.toString()
    );
  }

  disableShiftMode(): void {
    const now = Date.now();
    if (!this.isShiftMode || now - this.lastStateChange < 200) {
      return;
    }

    console.log("[CursorManager] Disabling shift mode");
    this.isShiftMode = false;
    this.lastStateChange = now;
    document.body.classList.remove("shift-pressed");
    this.glowEffectManager.disable();
    console.log(
      "[CursorManager] Shift mode disabled, body classes:",
      document.body.classList.toString()
    );
  }

  isInShiftMode(): boolean {
    return this.isShiftMode;
  }
}
