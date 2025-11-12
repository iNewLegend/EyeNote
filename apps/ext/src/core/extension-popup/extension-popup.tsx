import React, { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, DowntimeNotice, SignInPrompt, Toaster } from "@eye-note/ui";
import "./extension-popup.css";
import { useAuthStore, useAuthStatusEffects } from "@eye-note/auth/extension";
import { useBackendHealthStore } from "@eye-note/backend-health";
import { useBackendHealthBridge } from "../../hooks/use-backend-health-bridge";
import { useGroupsBootstrap } from "../../modules/groups";
import { useTabMessaging } from "../../hooks/use-tab-messaging";
import { ActiveGroupsList } from "./components/active-groups-list";
import { PopupHeader } from "./components/popup-header";
import { QuickControlsSection } from "./components/quick-controls-section";
import { HelpTip } from "./components/help-tip";

export function ExtensionPopup () {
    const [ isSigningIn, setIsSigningIn ] = useState( false );
    const isAuthenticated = useAuthStore( ( state ) => state.isAuthenticated );
    const refreshAuthStatus = useAuthStore( ( state ) => state.refreshStatus );
    const signOutUser = useAuthStore( ( state ) => state.signOut );
    const signInUser = useAuthStore( ( state ) => state.signIn );
    const backendHealthStatus = useBackendHealthStore( ( state ) => state.status );
    const isBackendHealthy = backendHealthStatus === "healthy";
    const isBackendDown = backendHealthStatus === "unhealthy";

    useGroupsBootstrap( {
        isAuthenticated,
        canSync: isBackendHealthy === true,
        shouldResetOnUnsync: isBackendHealthy === false,
        logContext: "popup",
    } );

    useAuthStatusEffects( refreshAuthStatus );

    useBackendHealthBridge( {
        syncModeStore: false,
    } );

    const { sendMessageWithToast } = useTabMessaging();

    const handleSignOut = async () => {
        try {
            await signOutUser();
            toast( "Signed out", {
                description: "You have been successfully signed out",
            } );
        } catch ( error ) {
            toast( "Error", {
                description: "Failed to sign out. Please try again.",
            } );
        }
    };

    const handleOpenGroupManager = async () => {
        await sendMessageWithToast( { type: "OPEN_GROUP_MANAGER" }, "Cannot open groups" );
    };

    const handleOpenQuickMenuDialog = async () => {
        await sendMessageWithToast( { type: "OPEN_QUICK_MENU_DIALOG" }, "Cannot open menu" );
    };

    const handleGetStarted = async () => {
        if ( isSigningIn ) {
            return;
        }

        try {
            setIsSigningIn( true );
            await signInUser();
            toast( "Welcome to EyeNote", {
                description: "You are now signed in.",
            } );
        } catch ( error ) {
            toast( "Error", {
                description: "Failed to sign in. Please try again.",
            } );
        } finally {
            setIsSigningIn( false );
        }
    };

    return (
        <>
            <Toaster />
            <Card className="w-[350px] h-[500px] border-none shadow-none rounded-none bg-background overflow-hidden flex flex-col">
                <PopupHeader
                    isBackendDown={isBackendDown}
                    isAuthenticated={isAuthenticated}
                    onSignOut={handleSignOut}
                />

                {isBackendDown ? (
                    <CardContent className="flex-1 flex items-center justify-center p-6 text-center">
                        <DowntimeNotice className="text-center" />
                    </CardContent>
                ) : isAuthenticated ? (
                    <CardContent className="p-6 space-y-8 flex-1 overflow-auto">
                        <QuickControlsSection
                            onOpenQuickMenu={handleOpenQuickMenuDialog}
                            onOpenGroupManager={handleOpenGroupManager}
                        />

                        <ActiveGroupsList />

                        <HelpTip />
                    </CardContent>
                ) : (
                    <SignInPrompt
                        onGetStarted={handleGetStarted}
                        isSigningIn={isSigningIn}
                    />
                )}
            </Card>
        </>
    );
}
