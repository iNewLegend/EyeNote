import { create } from "zustand";

interface HighlightStore {
    highlightedElements: Set<Element>;
    hoveredElement: Element | null;
    selectedElement: Element | null;
    isInspectorMode: boolean;
    isAddingNote: boolean;
    addHighlight: (element: Element) => void;
    removeHighlight: (element: Element) => void;
    setHoveredElement: (element: Element | null) => void;
    setSelectedElement: (element: Element | null) => void;
    setInspectorMode: (isInspectorMode: boolean) => void;
    setAddingNote: (isAddingNote: boolean) => void;
    clearAllHighlights: () => void;
}

export const useHighlightStore = create<HighlightStore>((set, get) => ({
    highlightedElements: new Set(),
    hoveredElement: null,
    selectedElement: null,
    isInspectorMode: false,
    isAddingNote: false,

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

        if (element) {
            set({ isAddingNote: true });
        }
    },

    setInspectorMode: (isInspectorMode: boolean) => {
        set({ isInspectorMode });
        if (isInspectorMode) {
            document.body.classList.add("inspector-mode");
        } else {
            if (!get().isAddingNote) {
                document.body.classList.remove("inspector-mode");
            }

            set({ hoveredElement: null });
        }
    },

    setAddingNote: (isAddingNote: boolean) => {
        set({ isAddingNote });

        // Update the body class for adding note state
        if (isAddingNote) {
            document.body.classList.add("adding-note");
        } else {
            document.body.classList.remove("adding-note");
        }

        // When we finish adding a note, remove inspector mode class if inspector mode is off
        if (!isAddingNote && !get().isInspectorMode) {
            document.body.classList.remove("inspector-mode");
        }
    },

    clearAllHighlights: () => {
        const { highlightedElements, isAddingNote, selectedElement } = get();

        highlightedElements.forEach((element) => {
            if (!isAddingNote || element !== selectedElement) {
                element.classList.remove("eye-note-highlight");
            }
        });

        const newHighlightedElements = new Set<Element>();
        if (isAddingNote && selectedElement) {
            newHighlightedElements.add(selectedElement);
        }

        set({
            highlightedElements: newHighlightedElements,
            hoveredElement: null,
        });
    },
}));
