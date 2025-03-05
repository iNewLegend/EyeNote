import { create } from "zustand";

interface ModeStore {
    isInspectorMode: boolean;
    isAddingNote: boolean;
    setInspectorMode: (isInspectorMode: boolean) => void;
    setAddingNote: (isAddingNote: boolean) => void;
}

export const useModeStore = create<ModeStore>((set, get) => ({
    isInspectorMode: false,
    isAddingNote: false,

    setInspectorMode: (isInspectorMode: boolean) => {
        set({ isInspectorMode });

        // Manage DOM classes and cursor for inspector mode
        if (isInspectorMode) {
            document.body.classList.add("inspector-mode");
            // Only set cursor to none if we're not adding a note
            if (!get().isAddingNote) {
                document.body.style.cursor = "none";
            }
        } else {
            document.body.classList.remove("inspector-mode");
            // Only reset cursor if we're not adding a note
            if (!get().isAddingNote) {
                document.body.style.cursor = "";
            }
        }
    },

    setAddingNote: (isAddingNote: boolean) => {
        set({ isAddingNote });
        // Manage DOM classes for adding note state
        if (isAddingNote) {
            document.body.classList.add("adding-note");
            document.body.style.cursor = ""; // Show normal cursor in add note mode
        } else {
            document.body.classList.remove("adding-note");
            // Let inspector mode handle the cursor if it's active
            if (get().isInspectorMode) {
                document.body.style.cursor = "none";
            } else {
                document.body.style.cursor = "";
            }
        }
    },
}));
