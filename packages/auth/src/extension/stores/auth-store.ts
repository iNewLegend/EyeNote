import { create } from "zustand";

import type { AuthUser } from "@eye-note/auth/src/shared";

interface AuthStore {
    user : AuthUser | null;
    isAuthenticated : boolean;
    signIn : () => Promise<void>;
    signOut : () => Promise<void>;
    refreshStatus : () => Promise<void>;
}

export const useAuthStore = create<AuthStore>( ( set ) => ( {
    user: null,
    isAuthenticated: false,
    async refreshStatus () {
        try {
            const response = await chrome.runtime.sendMessage( { type: "GET_AUTH_STATUS" } );
            set( {
                user: ( response.user as AuthUser | undefined ) ?? null,
                isAuthenticated: Boolean( response.isAuthenticated ),
            } );
        } catch ( error ) {
            console.error( "Failed to refresh auth status:", error );
            set( { user: null, isAuthenticated: false } );
        }
    },
    signIn: async () => {
        try {
            const response = await chrome.runtime.sendMessage( { type: "SIGN_IN" } );
            if ( response.success ) {
                set( {
                    user: ( response.user as AuthUser | undefined ) ?? null,
                    isAuthenticated: true,
                } );
                return;
            }

            const message = response.error ?? "Sign in failed";
            set( { user: null, isAuthenticated: false } );
            throw new Error( message );
        } catch ( error ) {
            console.error( "Failed to sign in:", error );
            set( { user: null, isAuthenticated: false } );
            throw error;
        }
    },
    signOut: async () => {
        try {
            const response = await chrome.runtime.sendMessage( { type: "SIGN_OUT" } );
            if ( response.success ) {
                set( { user: null, isAuthenticated: false } );
                return;
            }

            const message = response.error ?? "Sign out failed";
            throw new Error( message );
        } catch ( error ) {
            console.error( "Failed to sign out", error );
            throw error;
        }
    },
} ) );
