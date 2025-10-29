import { useCallback } from "react";

import { useAppAuthStore } from "./use-app-auth-store";

export function useAppAuth () {
    const {
        user,
        isAuthenticated,
        isLoading,
        error,
        signIn,
        signOut,
    } = useAppAuthStore();

    const handleSignIn = useCallback( () => signIn(), [ signIn ] );
    const handleSignOut = useCallback( () => signOut(), [ signOut ] );

    return {
        user,
        isAuthenticated,
        isLoading,
        error,
        signIn: handleSignIn,
        signOut: handleSignOut,
    };
}
