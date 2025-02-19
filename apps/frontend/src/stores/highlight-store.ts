import { create } from "zustand";

interface HighlightStore {
    highlightedElements: Set<Element>;
    hoveredElement: Element | null;
    selectedElement: Element | null;
    isShiftMode: boolean;
    addHighlight: (element: Element) => void;
    removeHighlight: (element: Element) => void;
    setHoveredElement: (element: Element | null) => void;
    setSelectedElement: (element: Element | null) => void;
    setShiftMode: (isShiftMode: boolean) => void;
    clearAllHighlights: () => void;
}

export const useHighlightStore = create<HighlightStore>((set, get) => ({
    highlightedElements: new Set(),
    hoveredElement: null,
    selectedElement: null,
    isShiftMode: false,

    addHighlight: (element: Element) => {
        element.classList.add("eye-note-highlight");
        set((state) => {
            const newHighlightedElements = new Set(state.highlightedElements);
            newHighlightedElements.add(element);
            return { highlightedElements: newHighlightedElements };
        });
    },

    removeHighlight: (element: Element) => {
        element.classList.remove("eye-note-highlight");
        set((state) => {
            const newHighlightedElements = new Set(state.highlightedElements);
            newHighlightedElements.delete(element);
            return { highlightedElements: newHighlightedElements };
        });
    },

    setHoveredElement: (element: Element | null) => {
        set({ hoveredElement: element });
    },

    setSelectedElement: (element: Element | null) => {
        set({ selectedElement: element });
    },

    setShiftMode: (isShiftMode: boolean) => {
        set({ isShiftMode });
        if (isShiftMode) {
            document.body.classList.add("shift-pressed");
        } else {
            document.body.classList.remove("shift-pressed");
        }
    },

    clearAllHighlights: () => {
        const { highlightedElements } = get();
        highlightedElements.forEach((element) => {
            element.classList.remove("eye-note-highlight");
        });
        set({
            highlightedElements: new Set(),
            hoveredElement: null,
        });
    },
}));
