import { create } from "zustand";
import type { AuthUser } from "@eye-note/definitions";
import {
    getAuthStatus,
    signInWithGoogle,
    signOutUser,
} from "../shared/google-auth";
import { sendRuntimeMessage } from "../../../lib/chrome/runtime-message";

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
            const response = await getAuthStatus();
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
            const canLaunchOAuth = Boolean( chrome.identity?.launchWebAuthFlow );
            let response :
                | Awaited<ReturnType<typeof signInWithGoogle>>
                | { success ?: boolean; user ?: AuthUser; error ?: string };

            if ( canLaunchOAuth ) {
                response = await signInWithGoogle();

                if ( !response.success && response.error?.includes( "not supported" ) ) {
                    response = await sendRuntimeMessage<{
                        success ?: boolean;
                        user ?: AuthUser;
                        error ?: string;
                    }>( { type: "SIGN_IN" } );
                }
            } else {
                response = await sendRuntimeMessage<{
                    success ?: boolean;
                    user ?: AuthUser;
                    error ?: string;
                }>( { type: "SIGN_IN" } );
            }

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
            const canLaunchOAuth = Boolean( chrome.identity?.launchWebAuthFlow );
            let response :
                | Awaited<ReturnType<typeof signOutUser>>
                | { success ?: boolean; error ?: string };

            if ( canLaunchOAuth ) {
                response = await signOutUser();

                if ( !response.success && response.error?.includes( "not supported" ) ) {
                    response = await sendRuntimeMessage<{
                        success ?: boolean;
                        error ?: string;
                    }>( { type: "SIGN_OUT" } );
                }
            } else {
                response = await sendRuntimeMessage<{
                    success ?: boolean;
                    error ?: string;
                }>( { type: "SIGN_OUT" } );
            }

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
