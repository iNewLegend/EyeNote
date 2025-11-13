import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge, Button, Label, Switch, cn } from "@eye-note/ui";
import type { UpdateGroupPayload } from "@eye-note/definitions";

import { useGroupsStore } from "../store/groups-store";
import { RoleManagementPanel } from "./role-management";

type InviteSelection = {
    maxUses : number | null;
    expiresInMinutes : number | null;
};

const INVITE_EXPIRATION_OPTIONS = [
    { label: "Never", value: null },
    { label: "30 minutes", value: 30 },
    { label: "1 hour", value: 60 },
    { label: "6 hours", value: 60 * 6 },
    { label: "1 day", value: 60 * 24 },
    { label: "7 days", value: 60 * 24 * 7 },
];

const INVITE_MAX_USE_OPTIONS = [
    { label: "No limit", value: null },
    { label: "1 use", value: 1 },
    { label: "5 uses", value: 5 },
    { label: "10 uses", value: 10 },
    { label: "25 uses", value: 25 },
];

const DEFAULT_INVITE_SELECTION : InviteSelection = {
    maxUses: null,
    expiresInMinutes: null,
};

const INVITE_LINK_BASE_URL = "https://eyenote.io/invite";

const buildInviteLink = ( code : string ) => `${ INVITE_LINK_BASE_URL.replace( /\/$/, "" ) }/${ code }`;

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
    const invitesByGroupId = useGroupsStore( ( state ) => state.invitesByGroupId );
    const inviteStateByGroupId = useGroupsStore( ( state ) => state.inviteStateByGroupId );
    const fetchGroupInvites = useGroupsStore( ( state ) => state.fetchGroupInvites );
    const revokeGroupInvite = useGroupsStore( ( state ) => state.revokeGroupInvite );

    const [ newGroupName, setNewGroupName ] = useState( "" );
    const [ newGroupColor, setNewGroupColor ] = useState( "#6366f1" );
    const [ inviteCodeInput, setInviteCodeInput ] = useState( "" );
    const [ isCreatingGroup, setIsCreatingGroup ] = useState( false );
    const [ isJoiningGroup, setIsJoiningGroup ] = useState( false );
    const [ leavingGroupId, setLeavingGroupId ] = useState<string | null>( null );
    const [ updatingGroupId, setUpdatingGroupId ] = useState<string | null>( null );
    const [ managingRolesForGroupId, setManagingRolesForGroupId ] = useState<string | null>( null );
    const [ inviteSelections, setInviteSelections ] = useState<Record<string, InviteSelection>>( {} );
    const [ creatingInviteGroupId, setCreatingInviteGroupId ] = useState<string | null>( null );
    const [ revokingInviteKey, setRevokingInviteKey ] = useState<string | null>( null );

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
                description: "Use invite links to add teammates when you're ready.",
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
            toast( "Invite link required", {
                description: "Paste the invite link or code you received to join.",
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

    const copyText = useCallback( async ( value : string ) => {
        if ( typeof navigator === "undefined" || !navigator.clipboard?.writeText ) {
            return false;
        }

        try {
            await navigator.clipboard.writeText( value );
            return true;
        } catch {
            return false;
        }
    }, [] );

    const handleSelectionChange = useCallback( ( groupId : string, patch : Partial<InviteSelection> ) => {
        setInviteSelections( ( prev ) => ( {
            ...prev,
            [ groupId ]: {
                ...DEFAULT_INVITE_SELECTION,
                ...( prev[ groupId ] ?? {} ),
                ...patch,
            },
        } ) );
    }, [] );

    const handleCreateInviteLink = useCallback( async ( groupId : string ) => {
        const selection = inviteSelections[ groupId ] ?? DEFAULT_INVITE_SELECTION;

        try {
            setCreatingInviteGroupId( groupId );
            const invite = await createGroupInvite( groupId, selection );
            const copiedLink = await copyText( buildInviteLink( invite.code ) );
            toast( "Invite link ready", {
                description: copiedLink
                    ? "Link copied to your clipboard. Share it anywhere."
                    : `Share this code: ${ invite.code }`,
            } );
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Failed to create invite";
            toast( "Error", {
                description: message,
            } );
        } finally {
            setCreatingInviteGroupId( null );
        }
    }, [ createGroupInvite, inviteSelections, copyText ] );

    const handleRefreshInvites = useCallback( async ( groupId : string, silent = false ) => {
        try {
            await fetchGroupInvites( groupId );
            if ( !silent ) {
                toast( "Invite links updated", {
                    description: "Loaded the latest invite links for this group.",
                } );
            }
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Failed to refresh invites";
            if ( !silent ) {
                toast( "Error", {
                    description: message,
                } );
            }
        }
    }, [ fetchGroupInvites ] );

    const handleRevokeInvite = useCallback( async ( groupId : string, code : string ) => {
        const key = `${ groupId }-${ code }`;
        try {
            setRevokingInviteKey( key );
            await revokeGroupInvite( groupId, code );
            toast( "Invite revoked", {
                description: "That link can no longer be used.",
            } );
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Failed to revoke invite";
            toast( "Error", {
                description: message,
            } );
        } finally {
            setRevokingInviteKey( null );
        }
    }, [ revokeGroupInvite ] );

    const handleCopyInvite = useCallback( async ( code : string, mode : "link" | "code" ) => {
        const target = mode === "link" ? buildInviteLink( code ) : code;
        const copied = await copyText( target );

        toast( copied ? "Copied" : "Copy failed", {
            description: copied
                ? mode === "link"
                    ? "Invite link copied to clipboard."
                    : "Invite code copied to clipboard."
                : "Your browser blocked clipboard access.",
        } );
    }, [ copyText ] );

    useEffect( () => {
        groups
            .filter( ( group ) => group.ownerId === currentUserId )
            .forEach( ( group ) => {
                if ( invitesByGroupId[ group.id ] || inviteStateByGroupId[ group.id ]?.loading ) {
                    return;
                }

                void fetchGroupInvites( group.id ).catch( () => {
                    // Error state handled via store metadata
                } );
            } );
    }, [ groups, currentUserId, invitesByGroupId, inviteStateByGroupId, fetchGroupInvites ] );

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
                        Join With Invite Link
                    </Label>
                    <div className="flex items-center gap-2">
                        <input
                            id="invite-code"
                            type="text"
                            value={inviteCodeInput}
                            onChange={( event ) => setInviteCodeInput( event.target.value )}
                            placeholder="Paste invite link or code"
                            className="flex-1 rounded-md border border-border bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/70"
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
                        You are not part of any groups yet. Create one or ask a group owner to send you an invite link.
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
                                <div className="space-y-3 rounded-md border border-dashed border-border/60 bg-background/70 p-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div>
                                            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                                Invite links
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                Share anywhere—new members start with the lowest role automatically.
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="ml-auto"
                                            onClick={() => {
                                                void handleRefreshInvites( group.id );
                                            }}
                                            disabled={inviteStateByGroupId[ group.id ]?.loading === true}
                                        >
                                            Refresh
                                        </Button>
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <div className="flex flex-col gap-1">
                                            <Label className="text-xs font-medium text-muted-foreground">Expires</Label>
                                            <select
                                                className="rounded-md border border-border bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/70"
                                                value={( inviteSelections[ group.id ] ?? DEFAULT_INVITE_SELECTION ).expiresInMinutes ?? ""}
                                                onChange={( event ) => {
                                                    const value = event.target.value === "" ? null : Number( event.target.value );
                                                    handleSelectionChange( group.id, { expiresInMinutes: value } );
                                                }}
                                            >
                                                {INVITE_EXPIRATION_OPTIONS.map( ( option ) => (
                                                    <option key={`expires-${ option.label }`} value={option.value ?? ""}>
                                                        {option.label}
                                                    </option>
                                                ) )}
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <Label className="text-xs font-medium text-muted-foreground">Max uses</Label>
                                            <select
                                                className="rounded-md border border-border bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/70"
                                                value={( inviteSelections[ group.id ] ?? DEFAULT_INVITE_SELECTION ).maxUses ?? ""}
                                                onChange={( event ) => {
                                                    const value = event.target.value === "" ? null : Number( event.target.value );
                                                    handleSelectionChange( group.id, { maxUses: value } );
                                                }}
                                            >
                                                {INVITE_MAX_USE_OPTIONS.map( ( option ) => (
                                                    <option key={`uses-${ option.label }`} value={option.value ?? ""}>
                                                        {option.label}
                                                    </option>
                                                ) )}
                                            </select>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            void handleCreateInviteLink( group.id );
                                        }}
                                        disabled={creatingInviteGroupId === group.id}
                                    >
                                        {creatingInviteGroupId === group.id ? "Generating..." : "Generate invite link"}
                                    </Button>
                                    <div className="space-y-2">
                                        {inviteStateByGroupId[ group.id ]?.error ? (
                                            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                                                {inviteStateByGroupId[ group.id ]?.error}
                                            </div>
                                        ) : null}
                                        {inviteStateByGroupId[ group.id ]?.loading && ( invitesByGroupId[ group.id ]?.length ?? 0 ) === 0 ? (
                                            <p className="text-xs text-muted-foreground">Loading invite links…</p>
                                        ) : ( invitesByGroupId[ group.id ] ?? [] ).length === 0 ? (
                                            <p className="text-xs text-muted-foreground">No invite links yet. Generate one above.</p>
                                        ) : (
                                            ( invitesByGroupId[ group.id ] ?? [] ).map( ( invite ) => {
                                                const inviteKey = `${ group.id }-${ invite.code }`;
                                                const statusClass = invite.status === "active"
                                                    ? "text-emerald-500 border-emerald-500/40"
                                                    : invite.status === "revoked"
                                                        ? "text-destructive border-destructive/40"
                                                        : invite.status === "expired"
                                                            ? "text-amber-500 border-amber-500/40"
                                                            : "text-muted-foreground border-border";
                                                return (
                                                    <div
                                                        key={invite.id}
                                                        className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background/80 p-2 text-xs"
                                                    >
                                                        <span className="font-mono text-sm tracking-wide text-foreground">{invite.code}</span>
                                                        <Badge variant="outline" className={cn( "text-[11px]", statusClass )}>
                                                            {invite.status === "active"
                                                                ? "Active"
                                                                : invite.status === "maxed"
                                                                    ? "At capacity"
                                                                    : invite.status === "expired"
                                                                        ? "Expired"
                                                                        : "Revoked"}
                                                        </Badge>
                                                        <span>
                                                            {invite.maxUses
                                                                ? `${ invite.uses } / ${ invite.maxUses } uses`
                                                                : `${ invite.uses } use${ invite.uses === 1 ? "" : "s" }`}
                                                        </span>
                                                        <span>
                                                            {invite.expiresAt
                                                                ? `Expires ${ new Date( invite.expiresAt ).toLocaleString() }`
                                                                : "Never expires"}
                                                        </span>
                                                        <div className="ml-auto flex flex-wrap items-center gap-1">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-xs"
                                                                onClick={() => {
                                                                    void handleCopyInvite( invite.code, "link" );
                                                                }}
                                                            >
                                                                Copy link
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-xs"
                                                                onClick={() => {
                                                                    void handleCopyInvite( invite.code, "code" );
                                                                }}
                                                            >
                                                                Copy code
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-xs text-destructive hover:text-destructive"
                                                                disabled={invite.status !== "active" || revokingInviteKey === inviteKey}
                                                                onClick={() => {
                                                                    void handleRevokeInvite( group.id, invite.code );
                                                                }}
                                                            >
                                                                {revokingInviteKey === inviteKey ? "Revoking..." : "Revoke"}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            } )
                                        )}
                                    </div>
                                </div>
                            ) : null}
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                {group.ownerId !== currentUserId ? (
                                    <div className="flex flex-col gap-1">
                                        <span className="font-medium text-foreground">Need an invite?</span>
                                        <span>Ask a group owner to share an invite link with you.</span>
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
