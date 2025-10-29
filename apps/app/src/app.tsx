import { useCallback, useMemo, useState } from "react";

import {
    Button,
    SettingsSurface,
    type SettingsDialogItem,
    Toaster,
    toast,
} from "@eye-note/ui";

import { useAppAuth } from "@eye-note/auth/app";

import { useAppSettings } from "./hooks/use-dashboard-settings";
import { Header } from "./components/header";
import {
    GeneralSettingsSection,
    type AppSettingDescriptor,
} from "./components/general-settings-section";
import { CollaborationPreviewSection } from "./components/collaboration-preview-section";

const settingDescriptors : AppSettingDescriptor[] = [
    {
        key: "enabled",
        label: "Enable overlay",
        description: "Keep the EyeNote overlay available on supported pages.",
    },
    {
        key: "notificationSound",
        label: "Notification sound",
        description: "Play a chime when collaborators leave a new note.",
    },
    {
        key: "showUnreadBadge",
        label: "Show unread badge",
        description: "Display an unread indicator on the overlay launcher when updates arrive.",
    },
];

const collaborationHighlights = [
    "Create and join collaboration groups in the browser app.",
    "Manage invitations, member roles, and default channels without opening the extension.",
    "Centralize team onboarding by sharing a single app link.",
];

function AppApp () {
    const { settings, setSetting, resetSettings } = useAppSettings();
    const {
        user,
        isAuthenticated,
        isLoading,
        signIn,
        signOut,
    } = useAppAuth();
    const [ activeSection, setActiveSection ] = useState( "general" );

    const handleSignIn = useCallback( async () => {
        if ( isLoading ) {
            return;
        }
        try {
            await signIn();
            toast( {
                title: "Signed in",
                description: "You are now signed in to EyeNote.",
            } );
        } catch ( error ) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Unable to complete authentication. Please try again.";
            toast( {
                title: "Sign-in failed",
                description: message,
            } );
        }
    }, [ isLoading, signIn ] );

    const handleSignOut = useCallback( async () => {
        try {
            await signOut();
            toast( {
                title: "Signed out",
                description: "You have been signed out of EyeNote.",
            } );
        } catch ( error ) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Unable to sign out. Please try again.";
            toast( {
                title: "Sign-out failed",
                description: message,
            } );
        }
    }, [ signOut ] );

    const handleNotify = useCallback( () => {
        toast( {
            title: "Groups app",
            description: "We are bringing group management to the standalone app—stay tuned!",
        } );
    }, [] );

    const handleLearnMore = useCallback( () => {
        toast( {
            title: "Switching to app",
            description: "Settings you configure here will sync once the app connects to EyeNote Cloud.",
        } );
    }, [] );

    const generalContent = useMemo(
        () => (
            <GeneralSettingsSection
                descriptors={settingDescriptors}
                settings={settings}
                onToggle={setSetting}
                onReset={resetSettings}
                onSignIn={handleSignIn}
                isAuthenticated={isAuthenticated}
                isLoading={isLoading}
            />
        ),
        [
            handleSignIn,
            isAuthenticated,
            isLoading,
            resetSettings,
            setSetting,
            settings,
        ]
    );

    const collaborationContent = useMemo(
        () => (
            <CollaborationPreviewSection
                highlights={collaborationHighlights}
                isAuthenticated={isAuthenticated}
                isLoading={isLoading}
                onSignIn={handleSignIn}
                onNotify={handleNotify}
                onLearnMore={handleLearnMore}
            />
        ),
        [
            handleLearnMore,
            handleNotify,
            handleSignIn,
            isAuthenticated,
            isLoading,
        ]
    );

    const settingsItems = useMemo<SettingsDialogItem[]>(
        () => [
            {
                id: "general",
                label: "General",
                description: "Configure overlay preferences and notifications.",
                content: generalContent,
            },
            {
                id: "collaboration",
                label: "Collaboration",
                description: "Preview the upcoming shared group manager experience.",
                content: collaborationContent,
            },
        ],
        [ collaborationContent, generalContent ]
    );

    const headerSlot = isAuthenticated ? (
        <div className="flex items-center gap-3">
            <div className="text-right">
                <p className="text-sm font-semibold text-foreground">
                    {user?.name ?? user?.email ?? "Signed in"}
                </p>
                {user?.email ? (
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                ) : null}
            </div>
            <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleSignOut}
            >
                Sign out
            </Button>
        </div>
    ) : (
        <Button
            type="button"
            size="sm"
            onClick={handleSignIn}
            disabled={isLoading}
        >
            {isLoading ? "Signing in..." : "Sign in with Google"}
        </Button>
    );

    return (
        <div className="min-h-screen bg-background">
            <div className="container flex min-h-screen flex-col gap-10 py-12">
                <Header />
                <SettingsSurface
                    title="Extension settings"
                    description="Manage overlay behavior and collaboration options without launching the extension."
                    items={settingsItems}
                    selectedItemId={activeSection}
                    onSelectedItemChange={setActiveSection}
                    headerSlot={headerSlot}
                />
            </div>
            <Toaster position="top-right" />
        </div>
    );
}

export default AppApp;
