import { create } from "zustand";

interface CursorStore {
    isInspectorMode: boolean;
    position: { x: number; y: number };
    setInspectorMode: (isInspectorMode: boolean) => void;
    setPosition: (x: number, y: number) => void;
}

export const useCursorStore = create<CursorStore>((set) => ({
    isInspectorMode: false,
    position: { x: 0, y: 0 },
    setInspectorMode: (isInspectorMode) => set({ isInspectorMode }),
    setPosition: (x, y) => set({ position: { x, y } }),
}));
