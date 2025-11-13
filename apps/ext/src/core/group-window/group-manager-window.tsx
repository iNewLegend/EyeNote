import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
    Button,
    DowntimeNotice,
    SignInPrompt,
} from "@eye-note/ui";
import { GroupManagerPanel, useGroupsBootstrap } from "@eye-note/groups";
import { useAuthStore, useAuthStatusEffects } from "@eye-note/auth/extension";
import { useBackendHealthBridge } from "../../hooks/use-backend-health-bridge";
import { useBackendHealthStore } from "@eye-note/backend-health";

import "./group-manager-window.css";

export function GroupManagerWindow () {
    const user = useAuthStore( ( state ) => state.user );
    const isAuthenticated = useAuthStore( ( state ) => state.isAuthenticated );
    const hasAuthHydrated = useAuthStore( ( state ) => state.hasHydrated );
    const refreshAuthStatus = useAuthStore( ( state ) => state.refreshStatus );
    const signInUser = useAuthStore( ( state ) => state.signIn );
    const signOutUser = useAuthStore( ( state ) => state.signOut );

    const backendHealthStatus = useBackendHealthStore( ( state ) => state.status );
    const isBackendHealthy = backendHealthStatus === "healthy";
    const isBackendUnhealthy = backendHealthStatus === "unhealthy";

    const [ isSigningIn, setIsSigningIn ] = useState( false );
    const [ isSigningOut, setIsSigningOut ] = useState( false );

    useBackendHealthBridge( { syncModeStore: false } );
    useAuthStatusEffects( refreshAuthStatus );

    useGroupsBootstrap( {
        isAuthenticated,
        canSync: isBackendHealthy,
        shouldResetOnUnsync: !isBackendHealthy,
        logContext: "group-window",
    } );

    const handleSignIn = useCallback( async () => {
        if ( isSigningIn ) {
            return;
        }

        try {
            setIsSigningIn( true );
            await signInUser();
        } finally {
            setIsSigningIn( false );
        }
    }, [ isSigningIn, signInUser ] );

    const handleSignOut = useCallback( async () => {
        if ( isSigningOut ) {
            return;
        }

        try {
            setIsSigningOut( true );
            await signOutUser();
        } finally {
            setIsSigningOut( false );
        }
    }, [ isSigningOut, signOutUser ] );

    const handleCloseWindow = useCallback( () => {
        window.close();
    }, [] );

    const content : ReactNode = useMemo( () => {
        if ( !hasAuthHydrated ) {
            return (
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                    Checking your session…
                </div>
            );
        }

        if ( isBackendUnhealthy ) {
            return (
                <div className="flex flex-1 items-center justify-center">
                    <DowntimeNotice className="text-center" />
                </div>
            );
        }

        if ( !isAuthenticated ) {
            return (
                <div className="flex flex-1 items-center justify-center">
                    <SignInPrompt
                        onGetStarted={handleSignIn}
                        isSigningIn={isSigningIn}
                        getStartedLabel={isBackendHealthy ? "Sign in with Google" : "Backend unavailable"}
                        signingInLabel="Signing in..."
                    />
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <GroupManagerPanel currentUserId={user?.id ?? null} />
            </div>
        );
    }, [
        hasAuthHydrated,
        handleSignIn,
        isAuthenticated,
        isBackendHealthy,
        isBackendUnhealthy,
        isSigningIn,
        user?.id,
    ] );

    return (
        <div className="group-window-shell">
            <header className="flex items-center justify-between border-b border-border/60 bg-card/80 px-5 py-3 shadow-sm">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">EyeNote</p>
                    <h1 className="text-lg font-semibold text-foreground">Group Manager</h1>
                </div>
                <div className="flex items-center gap-2">
                    {isAuthenticated ? (
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={handleSignOut}
                            disabled={isSigningOut}
                        >
                            {isSigningOut ? "Signing out..." : "Sign out"}
                        </Button>
                    ) : null}
                    <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={handleCloseWindow}
                    >
                        Close
                    </Button>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto bg-background px-5 py-4">
                {content}
            </main>
        </div>
    );
}
