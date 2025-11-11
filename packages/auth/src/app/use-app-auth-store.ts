import { create } from "zustand";

import {
    clearAuthSession,
    loadAuthSession,
    storeAuthSession,
} from "@eye-note/auth/src/app/auth-storage";
import {
    appSignInWithGoogle,
    appSignOut,
} from "@eye-note/auth/src/app/google-oauth";

import type { AuthUser } from "@eye-note/auth/src/shared";

type AuthState = {
    user : AuthUser | null;
    isAuthenticated : boolean;
    isLoading : boolean;
    error ?: string | null;
    signIn : () => Promise<void>;
    signOut : () => Promise<void>;
    refresh : () => void;
};

const initialSession = typeof window !== "undefined" ? loadAuthSession() : null;

export const useAppAuthStore = create<AuthState>( ( set ) => ( {
    user: initialSession?.user ?? null,
    isAuthenticated: Boolean( initialSession?.authToken ),
    isLoading: false,
    error: null,
    async signIn () {
        set( { isLoading: true, error: null } );
        try {
            const result = await appSignInWithGoogle();
            if ( !result.success || !result.user || !result.session ) {
                throw new Error( result.error || "Authentication failed" );
            }
            storeAuthSession( result.session );
            set( {
                user: result.user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            } );
        } catch ( error ) {
            console.error( "App sign-in error", error );
            clearAuthSession();
            set( {
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: error instanceof Error ? error.message : "Authentication failed",
            } );
            throw error;
        }
    },
    async signOut () {
        try {
            await appSignOut();
        } finally {
            clearAuthSession();
            set( {
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
            } );
        }
    },
    refresh () {
        const session = loadAuthSession();
        set( {
            user: session?.user ?? null,
            isAuthenticated: Boolean( session?.authToken ),
        } );
    },
} ) );
