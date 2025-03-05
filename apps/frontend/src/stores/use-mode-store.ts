import { create } from "zustand";

export const enum AppMode {
    NEUTRAL = 0, // 0000
    INSPECTOR_MODE = 1 << 0, // 0001
    NOTES_MODE = 1 << 1, // 0010
    // We can easily add more modes in the future
    // SOME_OTHER_MODE = 1 << 2,   // 0100
    // ANOTHER_MODE = 1 << 3,      // 1000
}

interface ModeStore {
    modes: number;
    setMode: (mode: AppMode) => void;
    addMode: (mode: AppMode) => void;
    removeMode: (mode: AppMode) => void;
    toggleMode: (mode: AppMode) => void;
    clearModes: () => void;
    isMode: (mode: AppMode) => boolean;
    isOnlyMode: (mode: AppMode) => boolean;
    isModes: (modes: AppMode[]) => boolean;
    hasAnyMode: (modes: AppMode[]) => boolean;
}

// Helper function to update DOM classes based on modes
const updateDOMClasses = (modes: number) => {
    document.body.classList.remove("inspector-mode", "adding-note");
    document.body.style.cursor = "";

    if (modes & AppMode.INSPECTOR_MODE) {
        document.body.classList.add("inspector-mode");
        // Only set cursor to none if we're not in notes mode
        if (!(modes & AppMode.NOTES_MODE)) {
            document.body.style.cursor = "none";
        }
    }

    if (modes & AppMode.NOTES_MODE) {
        document.body.classList.add("adding-note");
    }
};

export const useModeStore = create<ModeStore>((set, get) => ({
    modes: AppMode.NEUTRAL,

    setMode: (mode: AppMode) => {
        set({ modes: mode });
        updateDOMClasses(mode);
    },

    addMode: (mode: AppMode) => {
        const newModes = get().modes | mode;
        set({ modes: newModes });
        updateDOMClasses(newModes);
    },

    removeMode: (mode: AppMode) => {
        const newModes = get().modes & ~mode;
        set({ modes: newModes });
        updateDOMClasses(newModes);
    },

    toggleMode: (mode: AppMode) => {
        const newModes = get().modes ^ mode;
        set({ modes: newModes });
        updateDOMClasses(newModes);
    },

    clearModes: () => {
        set({ modes: AppMode.NEUTRAL });
        updateDOMClasses(AppMode.NEUTRAL);
    },

    // Check if a specific mode is active (can be along with others)
    isMode: (mode: AppMode) => {
        return (get().modes & mode) === mode;
    },

    // Check if ONLY this mode is active (no other modes)
    isOnlyMode: (mode: AppMode) => {
        return get().modes === mode;
    },

    // Check if ALL specified modes are active (can have additional modes)
    isModes: (modes: AppMode[]) => {
        const combinedModes = modes.reduce((acc, mode) => acc | mode, 0);
        return (get().modes & combinedModes) === combinedModes;
    },

    // Check if ANY of the specified modes are active
    hasAnyMode: (modes: AppMode[]) => {
        const combinedModes = modes.reduce((acc, mode) => acc | mode, 0);
        return (get().modes & combinedModes) !== 0;
    },
}));
