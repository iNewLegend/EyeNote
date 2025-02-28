import { create } from "zustand";

interface HighlightStore {
    highlightedElements: Set<Element>;
    hoveredElement: Element | null;
    selectedElement: Element | null;
    isInspectorMode: boolean;
    addHighlight: (element: Element) => void;
    removeHighlight: (element: Element) => void;
    setHoveredElement: (element: Element | null) => void;
    setSelectedElement: (element: Element | null) => void;
    setInspectorMode: (isInspectorMode: boolean) => void;
    clearAllHighlights: () => void;
}

export const useHighlightStore = create<HighlightStore>((set, get) => ({
    highlightedElements: new Set(),
    hoveredElement: null,
    selectedElement: null,
    isInspectorMode: false,

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

    setInspectorMode: (isInspectorMode: boolean) => {
        set({ isInspectorMode });
        if (isInspectorMode) {
            document.body.classList.add("inspector-mode");
        } else {
            document.body.classList.remove("inspector-mode");
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
