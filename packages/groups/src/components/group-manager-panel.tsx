import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge, Button, Label, Switch, cn } from "@eye-note/ui";
import type { UpdateGroupPayload } from "@eye-note/definitions";

import { useGroupsStore } from "../store/groups-store";
import { RoleManagementPanel } from "./role-management";

type GroupManagerPanelProps = {
    className ?: string;
    onClose ?: () => void;
    currentUserId ?: string | null;
};

export function GroupManagerPanel ( { className, onClose, currentUserId } : GroupManagerPanelProps ) {
    const groups = useGroupsStore( ( state ) => state.groups );
    const activeGroupIds = useGroupsStore( ( state ) => state.activeGroupIds );
    const groupsError = useGroupsStore( ( state ) => state.error );
    const groupsLoading = useGroupsStore( ( state ) => state.isLoading );
    const createGroup = useGroupsStore( ( state ) => state.createGroup );
    const joinGroupByCode = useGroupsStore( ( state ) => state.joinGroupByCode );
    const leaveGroup = useGroupsStore( ( state ) => state.leaveGroup );
    const setGroupActive = useGroupsStore( ( state ) => state.setGroupActive );
    const updateGroup = useGroupsStore( ( state ) => state.updateGroup );
    const createGroupInvite = useGroupsStore( ( state ) => state.createGroupInvite );

    const [ newGroupName, setNewGroupName ] = useState( "" );
    const [ newGroupColor, setNewGroupColor ] = useState( "#6366f1" );
    const [ inviteCodeInput, setInviteCodeInput ] = useState( "" );
    const [ isCreatingGroup, setIsCreatingGroup ] = useState( false );
    const [ isJoiningGroup, setIsJoiningGroup ] = useState( false );
    const [ leavingGroupId, setLeavingGroupId ] = useState<string | null>( null );
    const [ updatingGroupId, setUpdatingGroupId ] = useState<string | null>( null );
    const [ managingRolesForGroupId, setManagingRolesForGroupId ] = useState<string | null>( null );
    const [ inviteEmailInputs, setInviteEmailInputs ] = useState<Record<string, string>>( {} );
    const [ invitingGroupId, setInvitingGroupId ] = useState<string | null>( null );

    const sortedGroups = useMemo(
        () => groups.slice().sort( ( a, b ) => a.name.localeCompare( b.name ) ),
        [ groups ]
    );
    const activeGroupSet = useMemo( () => new Set( activeGroupIds ), [ activeGroupIds ] );

    const handleCreateGroup = useCallback( async ( event : React.FormEvent<HTMLFormElement> ) => {
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
            await createGroup( { name, color: newGroupColor } );
            setNewGroupName( "" );
            setNewGroupColor( "#6366f1" );
            toast( "Group created", {
                description: "Use the invite form below to send teammates a single-use code.",
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
    }, [ createGroup, newGroupName, newGroupColor, onClose ] );

    const handleJoinGroup = useCallback( async ( event : React.FormEvent<HTMLFormElement> ) => {
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
            const response = await joinGroupByCode( inviteCode );
            setInviteCodeInput( "" );

            if ( response.joined ) {
                toast( "Joined group", {
                    description: `You're ready to collaborate in ${ response.group.name }`,
                } );
                onClose?.();
                return;
            }

            if ( response.requiresApproval ) {
                toast( "Request sent", {
                    description: `We'll notify you when ${ response.group.name } approves your request.`,
                } );
                return;
            }

            toast( "Already a member", {
                description: `You're already part of ${ response.group.name }.`,
            } );
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Failed to join group";
            toast( "Error", {
                description: message,
            } );
        } finally {
            setIsJoiningGroup( false );
        }
    }, [ inviteCodeInput, joinGroupByCode, onClose ] );

    const handleToggleGroup = useCallback( async ( groupId : string, isActive : boolean ) => {
        try {
            await setGroupActive( groupId, isActive );
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Failed to update group selection";
            toast( "Error", {
                description: message,
            } );
        }
    }, [ setGroupActive ] );

    const handleLeaveGroup = useCallback( async ( groupId : string, groupName : string, ownerId : string ) => {
        if ( ownerId === currentUserId ) {
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
    }, [ currentUserId, leaveGroup ] );

    const handleUpdateGroup = useCallback( async ( groupId : string, payload : UpdateGroupPayload ) => {
        try {
            setUpdatingGroupId( groupId );
            await updateGroup( groupId, payload );
            toast( "Group updated", {
                description: "Your group settings were saved.",
            } );
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Failed to update group";
            toast( "Error", {
                description: message,
            } );
        } finally {
            setUpdatingGroupId( null );
        }
    }, [ updateGroup ] );

    const handleSendInvite = useCallback( async ( groupId : string ) => {
        const email = ( inviteEmailInputs[ groupId ] ?? "" ).trim();
        if ( email.length === 0 ) {
            toast( "Email required", {
                description: "Enter the teammate's email before sending an invite.",
            } );
            return;
        }

        setInvitingGroupId( groupId );
        try {
            const invite = await createGroupInvite( groupId, email );
            setInviteEmailInputs( ( prev ) => ( { ...prev, [ groupId ]: "" } ) );

            const copied = typeof navigator !== "undefined" && navigator.clipboard
                ? await navigator.clipboard.writeText( invite.code ).then( () => true ).catch( () => false )
                : false;

            toast( "Invite ready", {
                description: copied
                    ? `Single-use code copied to your clipboard (${ invite.code }).`
                    : `Share this code with your teammate: ${ invite.code }`,
            } );
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Failed to create invite";
            toast( "Invite failed", { description: message } );
        } finally {
            setInvitingGroupId( null );
        }
    }, [ createGroupInvite, inviteEmailInputs ] );

    if ( managingRolesForGroupId ) {
        return (
            <RoleManagementPanel
                groupId={managingRolesForGroupId}
                onClose={() => setManagingRolesForGroupId( null )}
            />
        );
    }

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
                        <input
                            aria-label="Group color"
                            type="color"
                            value={newGroupColor}
                            onChange={( event ) => setNewGroupColor( event.target.value )}
                            className="h-10 w-12 cursor-pointer rounded-md border border-border"
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
                            placeholder="Enter code from your invite"
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
                        You are not part of any groups yet. Create one or ask a group owner to send you a single-use invite.
                    </div>
                ) : (
                    sortedGroups.map( ( group ) => (
                        <div
                            key={group.id}
                            className="space-y-3 rounded-md border border-border/60 bg-secondary/40 p-3"
                        >
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="h-3 w-3 rounded-full"
                                        style={{ backgroundColor: group.color }}
                                        aria-label="Group color"
                                    />
                                    <p className="text-sm font-medium text-foreground">
                                        {group.name}
                                        {group.ownerId === currentUserId ? " • You own this group" : ""}
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                    {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
                                </Badge>
                                <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>Active</span>
                                    <Switch
                                        checked={activeGroupSet.has( group.id )}
                                        onCheckedChange={( checked ) => {
                                            void handleToggleGroup( group.id, checked === true );
                                        }}
                                    />
                                </div>
                            </div>
                            {group.ownerId === currentUserId && (
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <label className="flex items-center gap-2">
                                        <span>Marker color</span>
                                        <input
                                            type="color"
                                            value={group.color}
                                            onChange={( event ) => {
                                                void handleUpdateGroup( group.id, {
                                                    color: event.target.value,
                                                } );
                                            }}
                                            className="h-8 w-10 cursor-pointer rounded-md border border-border"
                                            disabled={updatingGroupId === group.id}
                                        />
                                    </label>
                                    {updatingGroupId === group.id && <span>Saving…</span>}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setManagingRolesForGroupId( group.id )}
                                        className="ml-auto"
                                    >
                                        Manage Roles
                                    </Button>
                                </div>
                            )}
                            {group.ownerId === currentUserId ? (
                                <form
                                    className="space-y-2"
                                    onSubmit={( event ) => {
                                        event.preventDefault();
                                        void handleSendInvite( group.id );
                                    }}
                                >
                                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Invite teammate
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="email"
                                            value={inviteEmailInputs[ group.id ] ?? ""}
                                            onChange={( event ) => {
                                                const value = event.target.value;
                                                setInviteEmailInputs( ( prev ) => ( { ...prev, [ group.id ]: value } ) );
                                            }}
                                            placeholder="teammate@example.com"
                                            className="flex-1 rounded-md border border-border bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/70"
                                            disabled={invitingGroupId === group.id}
                                        />
                                        <Button
                                            type="submit"
                                            variant="outline"
                                            disabled={invitingGroupId === group.id}
                                        >
                                            {invitingGroupId === group.id ? "Sending..." : "Send"}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        We'll generate a single-use code and copy it so you can drop it in chat or email.
                                    </p>
                                </form>
                            ) : null}
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                {group.ownerId !== currentUserId ? (
                                    <div className="flex flex-col gap-1">
                                        <span className="font-medium text-foreground">Need an invite?</span>
                                        <span>Ask a group owner to send a single-use code to your email.</span>
                                    </div>
                                ) : (
                                    <div />
                                )}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    disabled={group.ownerId === currentUserId || leavingGroupId === group.id}
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
