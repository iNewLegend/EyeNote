import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import type { GroupRecord } from "@eye-note/definitions";
import {
    initializeGroupsStore,
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
    const [ newGroupName, setNewGroupName ] = useState( "" );
    const [ inviteCodeInput, setInviteCodeInput ] = useState( "" );
    const [ isCreatingGroup, setIsCreatingGroup ] = useState( false );
    const [ isJoiningGroup, setIsJoiningGroup ] = useState( false );
    const [ leavingGroupId, setLeavingGroupId ] = useState<string | null>( null );
    const authUser = useAuthStore( ( state ) => state.user );
    const isAuthenticated = useAuthStore( ( state ) => state.isAuthenticated );
    const refreshAuthStatus = useAuthStore( ( state ) => state.refreshStatus );
    const signOutUser = useAuthStore( ( state ) => state.signOut );
    const signInUser = useAuthStore( ( state ) => state.signIn );
    const [ isBackendHealthy, setIsBackendHealthy ] = useState<boolean | null>( null );
    const groups = useGroupsStore( ( state ) => state.groups );
    const activeGroupIds = useGroupsStore( ( state ) => state.activeGroupIds );
    const groupsError = useGroupsStore( ( state ) => state.error );
    const groupsLoading = useGroupsStore( ( state ) => state.isLoading );
    const fetchGroups = useGroupsStore( ( state ) => state.fetchGroups );
    const setGroupActive = useGroupsStore( ( state ) => state.setGroupActive );
    const createGroup = useGroupsStore( ( state ) => state.createGroup );
    const joinGroupByCode = useGroupsStore( ( state ) => state.joinGroupByCode );
    const leaveGroup = useGroupsStore( ( state ) => state.leaveGroup );
    const resetGroups = useGroupsStore( ( state ) => state.reset );

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

    useEffect( () => {
        initializeGroupsStore().catch( ( error ) => {
            console.warn( "[EyeNote] Failed to initialize groups store", error );
        } );
    }, [] );

    useEffect( () => {
        if ( !isAuthenticated || isBackendHealthy === false ) {
            resetGroups();
            return;
        }

        if ( !isAuthenticated || isBackendHealthy === null ) {
            return;
        }

        let cancelled = false;

        initializeGroupsStore()
            .then( () => {
                if ( cancelled ) {
                    return;
                }
                return fetchGroups();
            } )
            .catch( ( error ) => {
                if ( cancelled ) {
                    return;
                }
                console.warn( "[EyeNote] Failed to fetch groups", error );
            } );

        return () => {
            cancelled = true;
        };
    }, [ fetchGroups, isAuthenticated, isBackendHealthy, resetGroups ] );

    useAuthStatusEffects( refreshAuthStatus );

    useBackendHealthBridge( {
        syncModeStore: false,
        onUpdate: setIsBackendHealthy,
    } );

    const sortedGroups = useMemo(
        () => groups.slice().sort( ( a, b ) => a.name.localeCompare( b.name ) ),
        [ groups ]
    );

    const activeGroupSet = useMemo(
        () => new Set( activeGroupIds ),
        [ activeGroupIds ]
    );

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

    const handleCreateGroupSubmit = async ( event : React.FormEvent<HTMLFormElement> ) => {
        event.preventDefault();

        const name = newGroupName.trim();

        if ( name.length === 0 ) {
            toast( "Group name required", {
                description: "Enter a name before creating a group.",
            } );
            return;
        }

        try {
            setIsCreatingGroup( true );
            const group = await createGroup( {
                name,
            } );
            setNewGroupName( "" );
            toast( "Group created", {
                description: `Share invite code ${ group.inviteCode } with teammates.`,
            } );
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Failed to create group";
            toast( "Error", {
                description: message,
            } );
        } finally {
            setIsCreatingGroup( false );
        }
    };

    const handleJoinGroupSubmit = async ( event : React.FormEvent<HTMLFormElement> ) => {
        event.preventDefault();

        const inviteCode = inviteCodeInput.trim();

        if ( inviteCode.length === 0 ) {
            toast( "Invite code required", {
                description: "Enter a group's invite code to join.",
            } );
            return;
        }

        try {
            setIsJoiningGroup( true );
            const { group, joined } = await joinGroupByCode( inviteCode );
            setInviteCodeInput( "" );

            toast( joined ? "Joined group" : "Already a member", {
                description: joined
                    ? `You're ready to collaborate in ${ group.name }.`
                    : `You're already part of ${ group.name }.`,
            } );
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Failed to join group";
            toast( "Error", {
                description: message,
            } );
        } finally {
            setIsJoiningGroup( false );
        }
    };

    const handleToggleGroup = useCallback(
        async ( groupId : string, isActive : boolean ) => {
            try {
                await setGroupActive( groupId, isActive );
            } catch ( error ) {
                const message = error instanceof Error ? error.message : "Failed to update group selection";
                toast( "Error", {
                    description: message,
                } );
            }
        },
        [ setGroupActive ]
    );

    const handleLeaveGroup = useCallback(
        async ( group : GroupRecord ) => {
            if ( group.ownerId === authUser?.id ) {
                toast( "Transfer ownership first", {
                    description: "Assign a new owner before leaving your group.",
                } );
                return;
            }

            try {
                setLeavingGroupId( group.id );
                await leaveGroup( group.id );
                toast( "Left group", {
                    description: `You left ${ group.name }.`,
                } );
            } catch ( error ) {
                const message = error instanceof Error ? error.message : "Failed to leave group";
                toast( "Error", {
                    description: message,
                } );
            } finally {
                setLeavingGroupId( null );
            }
        },
        [ authUser?.id, leaveGroup ]
    );

    const handleCopyInviteCode = useCallback( async ( inviteCode : string ) => {
        if ( typeof navigator === "undefined" || !navigator.clipboard ) {
            toast( "Clipboard unavailable", {
                description: "Copy the invite code manually.",
            } );
            return;
        }

        try {
            await navigator.clipboard.writeText( inviteCode );
            toast( "Invite code copied", {
                description: "Share it with teammates to bring them into the group.",
            } );
        } catch ( error ) {
            toast( "Error", {
                description: "Unable to copy the invite code. Copy it manually instead.",
            } );
        }
    }, [] );

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
                                {groupsLoading && (
                                    <span className="text-xs text-muted-foreground">Refreshing…</span>
                                )}
                            </div>

                            <div className="space-y-3">
                                <form onSubmit={handleCreateGroupSubmit} className="space-y-2">
                                    <Label
                                        htmlFor="group-name"
                                        className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                                    >
                                        Create Group
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            id="group-name"
                                            type="text"
                                            value={newGroupName}
                                            onChange={( event ) => setNewGroupName( event.target.value )}
                                            placeholder="Team name"
                                            className="flex-1 rounded-md border border-border bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/70"
                                        />
                                        <Button type="submit" disabled={isCreatingGroup}>
                                            {isCreatingGroup ? "Creating..." : "Create"}
                                        </Button>
                                    </div>
                                </form>

                                <form onSubmit={handleJoinGroupSubmit} className="space-y-2">
                                    <Label
                                        htmlFor="invite-code"
                                        className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                                    >
                                        Join With Invite Code
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            id="invite-code"
                                            type="text"
                                            value={inviteCodeInput}
                                            onChange={( event ) => setInviteCodeInput( event.target.value )}
                                            placeholder="Enter code"
                                            className="flex-1 rounded-md border border-border bg-background/80 px-3 py-2 text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/70"
                                        />
                                        <Button type="submit" variant="outline" disabled={isJoiningGroup}>
                                            {isJoiningGroup ? "Joining..." : "Join"}
                                        </Button>
                                    </div>
                                </form>
                            </div>

                            {groupsError && (
                                <div className="text-xs text-destructive">{groupsError}</div>
                            )}

                            <div className="space-y-3">
                                {groupsLoading && sortedGroups.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">
                                        Loading your groups…
                                    </div>
                                ) : sortedGroups.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">
                                        You are not part of any groups yet. Create one or ask a teammate
                                        for an invite code.
                                    </div>
                                ) : (
                                    sortedGroups.map( ( group ) => (
                                        <div
                                            key={group.id}
                                            className="space-y-3 rounded-md border border-border/60 bg-secondary/40 p-3"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-semibold text-foreground">
                                                        {group.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
                                                        {group.ownerId === authUser?.id ? " • You own this group" : ""}
                                                    </p>
                                                </div>
                                                <Switch
                                                    aria-label={`Toggle ${ group.name }`}
                                                    checked={activeGroupSet.has( group.id )}
                                                    onCheckedChange={( checked ) => {
                                                        void handleToggleGroup( group.id, checked );
                                                    }}
                                                />
                                            </div>
                                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <span>Invite code:</span>
                                                    <code className="rounded border border-border/60 bg-background/80 px-2 py-1 text-[10px] uppercase tracking-wider">
                                                        {group.inviteCode}
                                                    </code>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            void handleCopyInviteCode( group.inviteCode );
                                                        }}
                                                    >
                                                        Copy
                                                    </Button>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive"
                                                    disabled={group.ownerId === authUser?.id || leavingGroupId === group.id}
                                                    onClick={() => {
                                                        void handleLeaveGroup( group );
                                                    }}
                                                >
                                                    {leavingGroupId === group.id ? "Leaving..." : "Leave"}
                                                </Button>
                                            </div>
                                        </div>
                                    ) )
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
