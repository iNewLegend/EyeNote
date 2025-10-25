import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { AuthDialog } from "../../modules/auth";
import { Button } from "../../components/ui/button.tsx";
import { toast } from "sonner";
import { Toaster } from "../../components/ui/sonner.tsx";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../../components/ui/card.tsx";
import { Switch } from "../../components/ui/switch.tsx";
import { Label } from "../../components/ui/label.tsx";
import { ThemeProvider } from "../theme/theme-provider";
import "./extension-popup.css";
import { useAuthStore } from "../../modules/auth";
import { useAuthStatusEffects } from "../../modules/auth/hooks/use-auth-status-effects";
import { useBackendHealthBridge } from "../../hooks/use-backend-health-bridge";
import {
    useGroupsBootstrap,
    useGroupsStore,
} from "../../modules/groups";

interface StorageSettings {
    enabled : boolean;
    notificationSound : boolean;
    showUnreadBadge : boolean;
}

export function ExtensionPopup () {
    const [ settings, setSettings ] = useState<StorageSettings>( {
        enabled: true,
        notificationSound: true,
        showUnreadBadge: true,
    } );

    const [ isAuthOpen, setIsAuthOpen ] = useState( false );
    const [ isSigningIn, setIsSigningIn ] = useState( false );
    const authUser = useAuthStore( ( state ) => state.user );
    const isAuthenticated = useAuthStore( ( state ) => state.isAuthenticated );
    const refreshAuthStatus = useAuthStore( ( state ) => state.refreshStatus );
    const signOutUser = useAuthStore( ( state ) => state.signOut );
    const signInUser = useAuthStore( ( state ) => state.signIn );
    const [ isBackendHealthy, setIsBackendHealthy ] = useState<boolean | null>( null );
    const groups = useGroupsStore( ( state ) => state.groups );
    const activeGroupIds = useGroupsStore( ( state ) => state.activeGroupIds );

    useEffect( () => {
        if ( typeof chrome !== "undefined" && chrome.storage?.local ) {
            chrome.storage.local.get( "settings", ( result ) => {
                const storedSettings = ( result as { settings ?: StorageSettings } ).settings;
                if ( storedSettings ) {
                    setSettings( storedSettings );
                }
            } );
        }
    }, [] );

    useGroupsBootstrap( {
        isAuthenticated,
        canSync: isBackendHealthy === true,
        shouldResetOnUnsync: isBackendHealthy === false,
        logContext: "popup",
    } );

    useAuthStatusEffects( refreshAuthStatus );

    useBackendHealthBridge( {
        syncModeStore: false,
        onUpdate: setIsBackendHealthy,
    } );

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

    const toggleSetting = ( key : keyof typeof settings ) => {
        const newSettings = {
            ...settings,
            [ key ]: !settings[ key ],
        };
        setSettings( newSettings );
        if ( typeof chrome !== "undefined" && chrome.storage?.local ) {
            chrome.storage.local.set( { settings: newSettings } );
        }
    };

    const activeGroups = useMemo( () => {
        const activeSet = new Set( activeGroupIds );
        return groups.filter( ( group ) => activeSet.has( group.id ) );
    }, [ activeGroupIds, groups ] );

    const openGroupManagerInActiveTab = async () => {
        if ( !isAuthenticated ) {
            toast( "Sign in required", {
                description: "Sign in to manage your groups.",
            } );
            return;
        }

        if ( isBackendHealthy !== true ) {
            toast( "Backend unavailable", {
                description: "Reconnect to the backend to manage groups.",
            } );
            return;
        }

        if ( typeof chrome === "undefined" || !chrome.tabs?.query ) {
            toast( "Unsupported environment", {
                description: "Cannot reach the active tab from this context.",
            } );
            return;
        }

        const getActiveTab = () => new Promise<chrome.tabs.Tab | undefined>( ( resolve, reject ) => {
            chrome.tabs.query( { active: true, currentWindow: true }, ( tabs ) => {
                const lastError = chrome.runtime?.lastError;
                if ( lastError ) {
                    reject( new Error( lastError.message ) );
                    return;
                }
                resolve( tabs[ 0 ] );
            } );
        } );

        const sendMessage = ( tabId : number ) => new Promise<void>( ( resolve, reject ) => {
            chrome.tabs.sendMessage( tabId, { type: "OPEN_GROUP_MANAGER" }, () => {
                const lastError = chrome.runtime?.lastError;
                if ( lastError ) {
                    reject( new Error( lastError.message ) );
                    return;
                }
                resolve();
            } );
        } );

        try {
            const tab = await getActiveTab();
            if ( !tab?.id ) {
                throw new Error( "No active tab" );
            }
            await sendMessage( tab.id );
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Unable to reach content script";
            toast( "Cannot open manager", {
                description: `${ message }. Make sure EyeNote is active on this tab.`,
            } );
        }
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

    const isBackendDown = isBackendHealthy === false;

    return (
        <>
            <Toaster />
            <Card className="w-[350px] h-[500px] border-none shadow-none rounded-none bg-background overflow-hidden flex flex-col">
                <CardHeader className="pb-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">
                                EyeNote
                            </CardTitle>
                            {!isBackendDown && isAuthenticated && authUser && (
                                <CardDescription className="text-sm">{authUser.name}</CardDescription>
                            )}
                        </div>
                        {!isBackendDown && (
                            isAuthenticated ? (
                                <div className="flex items-center gap-2">
                                    {authUser?.picture && (
                                        <img
                                            src={authUser.picture}
                                            alt={authUser.name}
                                            className="w-8 h-8 rounded-full ring-1 ring-border"
                                        />
                                    )}
                                    <Button variant="ghost" size="sm" onClick={handleSignOut}>
                                        Sign Out
                                    </Button>
                                </div>
                            ) : (
                                <Button variant="default" size="sm" onClick={() => setIsAuthOpen( true )}>
                                    Sign In
                                </Button>
                            )
                        )}
                    </div>
                </CardHeader>

                {isBackendDown ? (
                    <CardContent className="flex-1 flex items-center justify-center p-6 text-center">
                        <div className="space-y-3">
                            <h2 className="text-lg font-semibold text-destructive">
                                Ops something went wrong, it’s not you, it’s us.
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                We’re having trouble reaching the servers. Try again in a moment.
                            </p>
                        </div>
                    </CardContent>
                ) : isAuthenticated ? (
                    <CardContent className="p-6 space-y-8 flex-1 overflow-auto">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold">Settings</h2>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between space-x-4">
                                    <Label
                                        htmlFor="enable-notes"
                                        className="flex-1 text-sm font-normal"
                                    >
                                        Enable Notes
                                    </Label>
                                    <Switch
                                        id="enable-notes"
                                        checked={settings.enabled}
                                        onCheckedChange={() => toggleSetting( "enabled" )}
                                    />
                                </div>
                                <div className="flex items-center justify-between space-x-4">
                                    <Label
                                        htmlFor="notification-sound"
                                        className="flex-1 text-sm font-normal"
                                    >
                                        Notification Sound
                                    </Label>
                                    <Switch
                                        id="notification-sound"
                                        checked={settings.notificationSound}
                                        onCheckedChange={() => toggleSetting( "notificationSound" )}
                                    />
                                </div>
                                <div className="flex items-center justify-between space-x-4">
                                    <Label
                                        htmlFor="unread-badge"
                                        className="flex-1 text-sm font-normal"
                                    >
                                        Show Unread Badge
                                    </Label>
                                    <Switch
                                        id="unread-badge"
                                        checked={settings.showUnreadBadge}
                                        onCheckedChange={() => toggleSetting( "showUnreadBadge" )}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold">Groups</h2>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Manage groups from any page using the in-page EyeNote controls. Open
                                the manager below and look for the "Manage groups" button in the
                                overlay.
                            </p>
                            <Button
                                variant="secondary"
                                onClick={openGroupManagerInActiveTab}
                                disabled={isBackendDown || !isAuthenticated}
                            >
                                Open group manager in current tab
                            </Button>
                            <div className="space-y-2">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Active groups
                                </h3>
                                {activeGroups.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">
                                        No active groups right now. Use the in-page manager to enable
                                        groups for your session.
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {activeGroups.map( ( group ) => (
                                            <span
                                                key={group.id}
                                                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs"
                                            >
                                                <span className="h-2 w-2 rounded-full bg-primary" />
                                                {group.name}
                                            </span>
                                        ) )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
                            <div className="flex gap-3 items-start">
                                <div className="p-1.5 bg-primary/20 rounded-md">
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="text-primary"
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 16v-4" />
                                        <path d="M12 8h.01" />
                                    </svg>
                                </div>
                                <p className="text-sm text-primary-foreground/80">
                                    Hold{" "}
                                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono border rounded-md bg-muted">
                                        SHIFT
                                    </kbd>{" "}
                                    + Click to create a note on any webpage element.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                ) : (
                    <CardContent className="flex-1 flex flex-col items-center justify-center p-6">
                        <div className="space-y-8 text-center">
                            <div className="space-y-6">
                                <div className="mx-auto w-fit">
                                    <img
                                        src="/icons/icon.svg"
                                        alt="EyeNote Logo"
                                        className="w-24 h-24 animate-in zoom-in duration-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-semibold">Welcome to EyeNote</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Sign in to start creating and sharing notes across the web.
                                    </p>
                                </div>
                            </div>
                            <Button
                                size="lg"
                                onClick={handleGetStarted}
                                disabled={isSigningIn}
                            >
                                {isSigningIn ? "Signing In..." : "Get Started"}
                            </Button>
                        </div>
                    </CardContent>
                )}
            </Card>

            {!isBackendDown && (
                <AuthDialog isOpen={isAuthOpen} onClose={() => setIsAuthOpen( false )} />
            )}
        </>
    );
}

// Mount the app
console.log( "Popup mounting..." );

try {
    const rootElement = document.getElementById( "root" );
    console.log( "Found root element:", rootElement );

    if ( !rootElement ) {
        throw new Error( "Root element not found" );
    }

    const root = createRoot( rootElement );
    console.log( "Created React root" );

    root.render(
        <React.StrictMode>
            <ThemeProvider defaultTheme="dark">
                <ExtensionPopup />
                <Toaster />
            </ThemeProvider>
        </React.StrictMode>
    );

    console.log( "Rendered React app" );
} catch ( error ) {
    console.error( "Error mounting React app:", error );
}
