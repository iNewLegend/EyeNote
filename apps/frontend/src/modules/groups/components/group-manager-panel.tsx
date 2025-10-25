import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Switch } from "../../../components/ui/switch";
import { cn } from "../../../lib/utils";
import { useAuthStore } from "../../../modules/auth";
import { useGroupsStore } from "../groups-store";

type GroupManagerPanelProps = {
    className ?: string;
    onClose ?: () => void;
};

export function GroupManagerPanel ( { className, onClose } : GroupManagerPanelProps ) {
    const authUser = useAuthStore( ( state ) => state.user );
    const groups = useGroupsStore( ( state ) => state.groups );
    const activeGroupIds = useGroupsStore( ( state ) => state.activeGroupIds );
    const groupsError = useGroupsStore( ( state ) => state.error );
    const groupsLoading = useGroupsStore( ( state ) => state.isLoading );
    const createGroup = useGroupsStore( ( state ) => state.createGroup );
    const joinGroupByCode = useGroupsStore( ( state ) => state.joinGroupByCode );
    const leaveGroup = useGroupsStore( ( state ) => state.leaveGroup );
    const setGroupActive = useGroupsStore( ( state ) => state.setGroupActive );

    const [ newGroupName, setNewGroupName ] = useState( "" );
    const [ inviteCodeInput, setInviteCodeInput ] = useState( "" );
    const [ isCreatingGroup, setIsCreatingGroup ] = useState( false );
    const [ isJoiningGroup, setIsJoiningGroup ] = useState( false );
    const [ leavingGroupId, setLeavingGroupId ] = useState<string | null>( null );

    const sortedGroups = useMemo(
        () => groups.slice().sort( ( a, b ) => a.name.localeCompare( b.name ) ),
        [ groups ]
    );
    const activeGroupSet = useMemo(
        () => new Set( activeGroupIds ),
        [ activeGroupIds ]
    );

    const handleCreateGroup = useCallback(
        async ( event : React.FormEvent<HTMLFormElement> ) => {
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
                const group = await createGroup( { name } );
                setNewGroupName( "" );
                toast( "Group created", {
                    description: `Share invite code ${ group.inviteCode } with teammates.`,
                } );
                onClose?.();
            } catch ( error ) {
                const message = error instanceof Error ? error.message : "Failed to create group";
                toast( "Error", {
                    description: message,
                } );
            } finally {
                setIsCreatingGroup( false );
            }
        },
        [ createGroup, newGroupName, onClose ]
    );

    const handleJoinGroup = useCallback(
        async ( event : React.FormEvent<HTMLFormElement> ) => {
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
                onClose?.();
            } catch ( error ) {
                const message = error instanceof Error ? error.message : "Failed to join group";
                toast( "Error", {
                    description: message,
                } );
            } finally {
                setIsJoiningGroup( false );
            }
        },
        [ inviteCodeInput, joinGroupByCode, onClose ]
    );

    const handleToggleGroup = useCallback(
        async ( groupId : string, isActive : boolean ) => {
            try {
                await setGroupActive( groupId, isActive );
            } catch ( error ) {
                const message =
                    error instanceof Error ? error.message : "Failed to update group selection";
                toast( "Error", {
                    description: message,
                } );
            }
        },
        [ setGroupActive ]
    );

    const handleLeaveGroup = useCallback(
        async ( groupId : string, groupName : string, ownerId : string ) => {
            if ( ownerId === authUser?.id ) {
                toast( "Transfer ownership first", {
                    description: "Assign a new owner before leaving your group.",
                } );
                return;
            }

            try {
                setLeavingGroupId( groupId );
                await leaveGroup( groupId );
                toast( "Left group", {
                    description: `You left ${ groupName }.`,
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
        } catch {
            toast( "Error", {
                description: "Unable to copy the invite code. Copy it manually instead.",
            } );
        }
    }, [] );

    return (
        <div className={cn( "space-y-5", className )}>
            <div className="space-y-3">
                <form onSubmit={handleCreateGroup} className="space-y-2">
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
                            disabled={isCreatingGroup}
                        />
                        <Button type="submit" disabled={isCreatingGroup}>
                            {isCreatingGroup ? "Creating..." : "Create"}
                        </Button>
                    </div>
                </form>

                <form onSubmit={handleJoinGroup} className="space-y-2">
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
                            disabled={isJoiningGroup}
                        />
                        <Button type="submit" variant="outline" disabled={isJoiningGroup}>
                            {isJoiningGroup ? "Joining..." : "Join"}
                        </Button>
                    </div>
                </form>
            </div>

            {groupsError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                    {groupsError}
                </div>
            )}

            <div className="space-y-3">
                {groupsLoading && sortedGroups.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                        Loading your groups…
                    </div>
                ) : sortedGroups.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                        You are not part of any groups yet. Create one or ask a teammate for an
                        invite code.
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
                                <div className="flex flex-wrap items-center gap-2">
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
                                        void handleLeaveGroup( group.id, group.name, group.ownerId );
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
    );
}
