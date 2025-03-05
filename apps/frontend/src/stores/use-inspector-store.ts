import { create } from "zustand";

interface InspectorStore {
    isActive: boolean;
    isAddingNote: boolean;
    setIsActive: (isActive: boolean) => void;
    setAddingNote: (isAddingNote: boolean) => void;
}

export const useInspectorStore = create<InspectorStore>((set, get) => ({
    isActive: false,
    isAddingNote: false,

    setIsActive: (isActive: boolean) => {
        set({ isActive });

        // Manage DOM classes and cursor for inspector mode
        if (isActive) {
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
            if (get().isActive) {
                document.body.style.cursor = "none";
            } else {
                document.body.style.cursor = "";
            }
        }
    },
}));
