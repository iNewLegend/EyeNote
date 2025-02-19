import { create } from "zustand";

interface User {
    id: string;
    email: string;
    name: string;
    picture: string;
}

interface AuthStore {
    user: User | null;
    isAuthenticated: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
    user: null,
    isAuthenticated: false,
    signIn: async () => {
        try {
            const response = await chrome.runtime.sendMessage({ type: "SIGN_IN" });
            if (response.success) {
                set({ user: response.user, isAuthenticated: true });
            }
        } catch (error) {
            console.error("Failed to sign in:", error);
        }
    },
    signOut: async () => {
        try {
            const response = await chrome.runtime.sendMessage({ type: "SIGN_OUT" });
            if (response.success) {
                set({ user: null, isAuthenticated: false });
            }
        } catch (error) {
            console.error("Failed to sign out:", error);
        }
    },
}));
