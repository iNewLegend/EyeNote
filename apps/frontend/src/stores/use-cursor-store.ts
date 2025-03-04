import { create } from "zustand";

interface CursorStore {
    position: { x: number; y: number };
    setPosition: (x: number, y: number) => void;
}

export const useCursorStore = create<CursorStore>((set) => ({
    position: { x: 0, y: 0 },
    setPosition: (x, y) => set({ position: { x, y } }),
}));
