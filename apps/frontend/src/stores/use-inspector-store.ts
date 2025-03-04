import { create } from "zustand";

interface InspectorStore {
    isActive: boolean;
    setIsActive: (isActive: boolean) => void;
}

export const useInspectorStore = create<InspectorStore>((set) => ({
    isActive: false,
    setIsActive: (isActive) => set({ isActive }),
}));
