import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import {
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Input,
    Label,
    DowntimeNotice,
    SignInPrompt,
    Toaster,
} from "@eye-note/ui";
import "./extension-popup.css";
import { useAuthStore, useAuthStatusEffects } from "@eye-note/auth/extension";
import { useBackendHealthStore } from "@eye-note/backend-health";
import { useBackendHealthBridge } from "../../hooks/use-backend-health-bridge";
import {
    useGroupsBootstrap,
    useGroupsStore,
} from "../../modules/groups";
import { Menu, Users } from "lucide-react";

export function ExtensionPopup () {
    const [ isSigningIn, setIsSigningIn ] = useState( false );
    const authUser = useAuthStore( ( state ) => state.user );
    const isAuthenticated = useAuthStore( ( state ) => state.isAuthenticated );
    const refreshAuthStatus = useAuthStore( ( state ) => state.refreshStatus );
    const signOutUser = useAuthStore( ( state ) => state.signOut );
    const signInUser = useAuthStore( ( state ) => state.signIn );
    const backendHealthStatus = useBackendHealthStore( ( state ) => state.status );
    const isBackendHealthy = backendHealthStatus === "healthy";
    const groups = useGroupsStore( ( state ) => state.groups );
    const activeGroupIds = useGroupsStore( ( state ) => state.activeGroupIds );
    const createGroup = useGroupsStore( ( state ) => state.createGroup );
    const joinGroupByCode = useGroupsStore( ( state ) => state.joinGroupByCode );
    const [ newGroupName, setNewGroupName ] = useState( "" );
    const [ inviteCodeInput, setInviteCodeInput ] = useState( "" );
    const [ isCreatingGroup, setIsCreatingGroup ] = useState( false );
    const [ isJoiningGroup, setIsJoiningGroup ] = useState( false );

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

    const activeGroups = useMemo( () => {
        const activeSet = new Set( activeGroupIds );
        return groups.filter( ( group ) => activeSet.has( group.id ) );
    }, [ activeGroupIds, groups ] );

    const sendMessageToActiveTab = async ( payload : { type : string } ) => {
        if ( typeof chrome === "undefined" || !chrome.tabs?.query ) {
            return {
                success: false,
                error: "Cannot reach the active tab from this context.",
            } as const;
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

        const sendMessage = ( tabId : number ) => new Promise<boolean>( ( resolve, reject ) => {
            chrome.tabs.sendMessage( tabId, payload, ( response ) => {
                const lastError = chrome.runtime?.lastError;
                if ( lastError ) {
                    reject( new Error( lastError.message ) );
                    return;
                }
                resolve( Boolean( response?.success ) );
            } );
        } );

        try {
            const tab = await getActiveTab();
            if ( !tab?.id ) {
                throw new Error( "No active tab" );
            }
            const wasAccepted = await sendMessage( tab.id );
            if ( !wasAccepted ) {
                return {
                    success: false,
                    error: "Content script rejected the request.",
                } as const;
            }
            return { success: true } as const;
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Unable to reach content script";
            return {
                success: false,
                error: message,
            } as const;
        }
    };

    const buildMessageFailureDescription = ( error ?: string ) =>
        error ? `${ error } Make sure EyeNote is active on this tab.` : "Make sure EyeNote is active on this tab.";

    const handleOpenGroupManager = async () => {
        const result = await sendMessageToActiveTab( { type: "OPEN_GROUP_MANAGER" } );
        if ( !result.success ) {
            toast( "Cannot open groups", {
                description: buildMessageFailureDescription( result.error ),
            } );
        }
    };

    const handleOpenQuickMenuDialog = async () => {
        const result = await sendMessageToActiveTab( { type: "OPEN_QUICK_MENU_DIALOG" } );
        if ( !result.success ) {
            toast( "Cannot open menu", {
                description: buildMessageFailureDescription( result.error ),
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

    const isBackendDown = backendHealthStatus === "unhealthy";
    const defaultGroupColor = "#6366f1";

    const handleCreateGroup = async ( event : React.FormEvent<HTMLFormElement> ) => {
        event.preventDefault();
        const name = newGroupName.trim();

        if ( name.length === 0 ) {
            toast( "Group name required", {
                description: "Enter a team name before creating a group.",
            } );
            return;
        }

        try {
            setIsCreatingGroup( true );
            const group = await createGroup( { name, color: defaultGroupColor } );
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

    const handleJoinGroup = async ( event : React.FormEvent<HTMLFormElement> ) => {
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
                        {!isBackendDown && isAuthenticated && (
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
                        )}
                    </div>
                </CardHeader>

                {isBackendDown ? (
                    <CardContent className="flex-1 flex items-center justify-center p-6 text-center">
                        <DowntimeNotice className="text-center" />
                    </CardContent>
                ) : isAuthenticated ? (
                    <CardContent className="p-6 space-y-8 flex-1 overflow-auto">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold">Quick controls</h2>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Launch in-page tools without leaving your current tab. Each button
                                opens a content overlay inside the site you are viewing.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="outline"
                                    className="w-full justify-between rounded-full"
                                    onClick={handleOpenQuickMenuDialog}
                                >
                                    <span>Menu</span>
                                    <Menu className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-between rounded-full"
                                    onClick={handleOpenGroupManager}
                                >
                                    <span>Manage Groups</span>
                                    <Users className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <h2 className="text-sm font-semibold">Manage groups</h2>
                                <p className="text-sm text-muted-foreground">
                                    Create a new collaboration group or join an existing team with an invite
                                    code.
                                </p>
                            </div>
                            <form
                                className="space-y-3 rounded-lg border border-border/60 p-4"
                                onSubmit={handleCreateGroup}
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="popup-create-group-name" className="text-sm font-medium">
                                        Team name
                                    </Label>
                                    <Input
                                        id="popup-create-group-name"
                                        value={newGroupName}
                                        onChange={( event ) => setNewGroupName( event.target.value )}
                                        placeholder="Acme Product Team"
                                        autoComplete="off"
                                        maxLength={60}
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={isCreatingGroup}>
                                    {isCreatingGroup ? "Creating..." : "Create"}
                                </Button>
                            </form>
                            <form
                                className="space-y-3 rounded-lg border border-border/60 p-4"
                                onSubmit={handleJoinGroup}
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="popup-join-group-code" className="text-sm font-medium">
                                        Invite code
                                    </Label>
                                    <Input
                                        id="popup-join-group-code"
                                        value={inviteCodeInput}
                                        onChange={( event ) => setInviteCodeInput( event.target.value )}
                                        placeholder="EN-XXXXXX"
                                        autoComplete="off"
                                        maxLength={24}
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={isJoiningGroup}>
                                    {isJoiningGroup ? "Joining..." : "Join"}
                                </Button>
                            </form>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <h2 className="text-sm font-semibold">Groups</h2>
                                <p className="text-sm text-muted-foreground">
                                    Active groups sync automatically here. Use the menu dialog to open
                                    the full manager inside your current tab.
                                </p>
                            </div>
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
                                                <span
                                                    className="h-2 w-2 rounded-full border border-border/60"
                                                    style={{ backgroundColor: group.color }}
                                                />
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
                    <SignInPrompt
                        onGetStarted={handleGetStarted}
                        isSigningIn={isSigningIn}
                    />
                )}
            </Card>

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
                <ExtensionPopup />
                <Toaster />
        </React.StrictMode>
    );

    console.log( "Rendered React app" );
} catch ( error ) {
    console.error( "Error mounting React app:", error );
}
