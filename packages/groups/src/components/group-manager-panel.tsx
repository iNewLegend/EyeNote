import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Switch,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    cn,
} from "@eye-note/ui";
import type { LucideIcon } from "lucide-react";
import {
    Users,
    Plus,
    Link2,
    Copy,
    Trash2,
    RefreshCw,
    Settings,
    LogOut,
    Crown,
    Circle,
    CheckCircle2,
    XCircle,
    Clock,
    LayoutGrid,
    Shield,
} from "lucide-react";
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

const INVITE_SELECT_EMPTY_VALUE = "__empty__";

const encodeInviteSelectValue = ( value : number | null ) =>
    value === null ? INVITE_SELECT_EMPTY_VALUE : value.toString();

const decodeInviteSelectValue = ( value : string ) =>
    value === INVITE_SELECT_EMPTY_VALUE ? null : Number( value );

const INVITE_LINK_BASE_URL = "https://eyenote.io/invite";

const buildInviteLink = ( code : string ) => `${ INVITE_LINK_BASE_URL.replace( /\/$/, "" ) }/${ code }`;

const INVITE_STATUS_LABEL : Record<string, string> = {
    active: "Active",
    revoked: "Revoked",
    expired: "Expired",
    maxed: "At capacity",
};

const INVITE_STATUS_TONE : Record<string, string> = {
    active: "text-emerald-500 border-emerald-500/40",
    revoked: "text-destructive border-destructive/40",
    expired: "text-amber-500 border-amber-500/40",
    maxed: "text-blue-500 border-blue-500/40",
};

type DetailTabValue = "overview" | "invites" | "access";

type DetailTabOption = {
    value : DetailTabValue;
    label : string;
    description : string;
    icon : LucideIcon;
};

const DETAIL_TAB_OPTIONS : DetailTabOption[] = [
    {
        value: "overview",
        label: "Overview",
        description: "Presence & theme",
        icon: LayoutGrid,
    },
    {
        value: "invites",
        label: "Invites",
        description: "Links & quotas",
        icon: Link2,
    },
    {
        value: "access",
        label: "Access",
        description: "Roles & membership",
        icon: Shield,
    },
];

type GroupManagerPanelProps = {
    className ?: string;
    onClose ?: () => void;
    currentUserId ?: string | null;
    onManageRoles ?: ( groupId : string ) => void;
};

export function GroupManagerPanel ( { className, onClose, currentUserId, onManageRoles } : GroupManagerPanelProps ) {
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
    const [ selectedGroupId, setSelectedGroupId ] = useState<string | null>( null );
    const [ detailTab, setDetailTab ] = useState<DetailTabValue>( "overview" );

    const sortedGroups = useMemo(
        () => groups.slice().sort( ( a, b ) => a.name.localeCompare( b.name ) ),
        [ groups ]
    );
    const activeGroupSet = useMemo( () => new Set( activeGroupIds ), [ activeGroupIds ] );

    const selectedGroup = useMemo( () => {
        if ( !selectedGroupId ) {
            return null;
        }
        return sortedGroups.find( ( group ) => group.id === selectedGroupId ) ?? null;
    }, [ sortedGroups, selectedGroupId ] );

    const handleManageRoles = useCallback( ( groupId : string ) => {
        if ( onManageRoles ) {
            onManageRoles( groupId );
            return;
        }
        setManagingRolesForGroupId( groupId );
    }, [ onManageRoles, setManagingRolesForGroupId ] );

    useEffect( () => {
        if ( sortedGroups.length === 0 ) {
            if ( selectedGroupId !== null ) {
                setSelectedGroupId( null );
            }
            return;
        }

        if ( !selectedGroupId || !sortedGroups.some( ( group ) => group.id === selectedGroupId ) ) {
            setSelectedGroupId( sortedGroups[ 0 ].id );
        }
    }, [ sortedGroups, selectedGroupId ] );

    useEffect( () => {
        setDetailTab( "overview" );
    }, [ selectedGroupId ] );

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

    const renderInviteSection = () => {
        if ( !selectedGroup ) {
            return null;
        }

        const isOwner = selectedGroup.ownerId === currentUserId;
        const selection = inviteSelections[ selectedGroup.id ] ?? DEFAULT_INVITE_SELECTION;
        const inviteState = inviteStateByGroupId[ selectedGroup.id ];
        const invites = invitesByGroupId[ selectedGroup.id ] ?? [];

        if ( !isOwner ) {
            return (
                <Card className="border border-border/60 bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                        <Users className="h-10 w-10 text-muted-foreground/40" />
                        <CardTitle className="text-sm font-semibold">Owner only</CardTitle>
                        <CardDescription className="text-xs">
                            Ask the owner for a fresh invite, just like Discord’s server flow.
                        </CardDescription>
                    </CardContent>
                </Card>
            );
        }

        return (
            <div className="space-y-3">
                <div className="rounded-md border border-border/60 bg-secondary/20 p-3">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <Label className="text-xs font-medium">Invite links</Label>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs"
                            onClick={() => {
                                void handleRefreshInvites( selectedGroup.id );
                            }}
                            disabled={inviteState?.loading === true}
                        >
                            <RefreshCw className={cn( "mr-1 h-3 w-3", inviteState?.loading && "animate-spin" )} />
                            Refresh
                        </Button>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Select
                                value={encodeInviteSelectValue( selection.expiresInMinutes ?? null )}
                                onValueChange={( value ) => {
                                    const numValue = decodeInviteSelectValue( value );
                                    handleSelectionChange( selectedGroup.id, { expiresInMinutes: numValue } );
                                }}
                            >
                                <SelectTrigger className="h-8 flex-1 text-xs">
                                    <SelectValue placeholder="Never expires" />
                                </SelectTrigger>
                                <SelectContent>
                                    {INVITE_EXPIRATION_OPTIONS.map( ( option ) => (
                                        <SelectItem
                                            key={`expires-${ option.label }`}
                                            value={encodeInviteSelectValue( option.value ?? null )}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ) )}
                                </SelectContent>
                            </Select>
                            <Select
                                value={encodeInviteSelectValue( selection.maxUses ?? null )}
                                onValueChange={( value ) => {
                                    const numValue = decodeInviteSelectValue( value );
                                    handleSelectionChange( selectedGroup.id, { maxUses: numValue } );
                                }}
                            >
                                <SelectTrigger className="h-8 flex-1 text-xs">
                                    <SelectValue placeholder="No limit" />
                                </SelectTrigger>
                                <SelectContent>
                                    {INVITE_MAX_USE_OPTIONS.map( ( option ) => (
                                        <SelectItem
                                            key={`uses-${ option.label }`}
                                            value={encodeInviteSelectValue( option.value ?? null )}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ) )}
                                </SelectContent>
                            </Select>
                            <Button
                                type="button"
                                size="sm"
                                className="h-8"
                                onClick={() => {
                                    void handleCreateInviteLink( selectedGroup.id );
                                }}
                                disabled={creatingInviteGroupId === selectedGroup.id}
                            >
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                {creatingInviteGroupId === selectedGroup.id ? "..." : "Generate"}
                            </Button>
                        </div>
                        {inviteState?.error ? (
                            <p className="text-[10px] text-destructive">{inviteState.error}</p>
                        ) : null}
                    </div>
                </div>

                {inviteState?.loading && invites.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 rounded-md border border-border/60 bg-secondary/20 py-6">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Loading…</p>
                    </div>
                ) : invites.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/60 bg-secondary/20 py-6 text-center">
                        <Link2 className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-xs font-medium text-muted-foreground">No invites yet</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {invites.map( ( invite ) => {
                            const inviteKey = `${ selectedGroup.id }-${ invite.code }`;
                            const statusLabel = INVITE_STATUS_LABEL[ invite.status ] ?? invite.status;
                            const statusTone = INVITE_STATUS_TONE[ invite.status ] ?? "text-muted-foreground border-border/60";
                            const isActive = invite.status === "active";
                            return (
                                <div key={invite.id} className="rounded-md border border-border/60 bg-secondary/20 p-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="truncate font-mono text-xs font-semibold">{invite.code}</span>
                                                <Badge variant="outline" className={cn( "text-[9px] font-medium", statusTone )}>
                                                    {statusLabel}
                                                </Badge>
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Users className="h-2.5 w-2.5" />
                                                    {invite.maxUses
                                                        ? `${ invite.uses }/${ invite.maxUses }`
                                                        : `${ invite.uses } use${ invite.uses === 1 ? "" : "s" }`}
                                                </span>
                                                {invite.expiresAt ? (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-2.5 w-2.5" />
                                                        {new Date( invite.expiresAt ).toLocaleDateString()}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1">
                                                        <CheckCircle2 className="h-2.5 w-2.5" />
                                                        No expiry
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => {
                                                    void handleCopyInvite( invite.code, "link" );
                                                }}
                                            >
                                                <Copy className="mr-1 h-3 w-3" />
                                                Link
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                disabled={!isActive || revokingInviteKey === inviteKey}
                                                onClick={() => {
                                                    void handleRevokeInvite( selectedGroup.id, invite.code );
                                                }}
                                            >
                                                {revokingInviteKey === inviteKey ? (
                                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-3 w-3" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        } )}
                    </div>
                )}
            </div>
        );
    };

    const renderGroupDetails = () => {
        if ( sortedGroups.length === 0 ) {
            return null;
        }

        if ( !selectedGroup ) {
            return (
                <Card className="border-dashed border-border/60 bg-muted/20">
                    <CardContent className="flex min-h-[360px] flex-col items-center justify-center py-12 text-center">
                        <Users className="mb-4 h-12 w-12 text-muted-foreground/40" />
                        <CardTitle className="text-base font-semibold">Pick a group</CardTitle>
                        <CardDescription className="mt-1 text-sm">
                            Choose a group from the Discord-style sidebar to start managing it.
                        </CardDescription>
                    </CardContent>
                </Card>
            );
        }

        const isOwner = selectedGroup.ownerId === currentUserId;
        const isActive = activeGroupSet.has( selectedGroup.id );
        // compact header replaces previous stats grid

        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/30 px-3 py-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className="h-10 w-10 shrink-0 rounded-full"
                            style={{ backgroundColor: selectedGroup.color }}
                        />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{selectedGroup.name}</p>
                            {selectedGroup.description ? (
                                <p className="truncate text-xs text-muted-foreground">{selectedGroup.description}</p>
                            ) : null}
                        </div>
                        {isOwner && <Crown className="h-4 w-4 text-amber-500" />}
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={isActive}
                            onCheckedChange={( checked ) => {
                                void handleToggleGroup( selectedGroup.id, checked === true );
                            }}
                        />
                        {isOwner && (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => handleManageRoles( selectedGroup.id )}
                            >
                                <Settings className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                <Tabs
                    value={detailTab}
                    onValueChange={( value ) => setDetailTab( value as DetailTabValue )}
                    className="flex flex-col gap-3"
                >
                    <TabsList className="flex h-9 flex-row overflow-x-auto rounded-md border border-border/60 bg-secondary/20 p-0.5">
                        {DETAIL_TAB_OPTIONS.map( ( option ) => {
                            const Icon = option.icon;
                            return (
                                <TabsTrigger
                                    key={option.value}
                                    value={option.value}
                                    className="group flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition data-[state=active]:bg-background data-[state=active]:text-foreground"
                                >
                                    <Icon className="h-3.5 w-3.5 text-muted-foreground group-data-[state=active]:text-primary" />
                                    {option.label}
                                </TabsTrigger>
                            );
                        } )}
                    </TabsList>
                    <div className="flex-1 space-y-3">
                        <TabsContent value="overview" className="space-y-3 focus-visible:outline-none">
                            {isOwner && (
                                <div className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/20 px-3 py-2">
                                    <div className="space-y-0.5">
                                        <Label className="text-xs font-medium">Marker color</Label>
                                        <p className="text-[10px] text-muted-foreground">
                                            Customize the group icon color
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={selectedGroup.color}
                                            onChange={( event ) => {
                                                void handleUpdateGroup( selectedGroup.id, {
                                                    color: event.target.value,
                                                } );
                                            }}
                                            className="h-8 w-12 cursor-pointer rounded border border-border"
                                            disabled={updatingGroupId === selectedGroup.id}
                                        />
                                        {updatingGroupId === selectedGroup.id && (
                                            <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/20 px-3 py-2">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-medium">Members</Label>
                                    <p className="text-[10px] text-muted-foreground">
                                        {selectedGroup.memberCount} member{selectedGroup.memberCount === 1 ? "" : "s"} in this group
                                    </p>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="invites" className="space-y-3 focus-visible:outline-none">
                            {renderInviteSection()}
                        </TabsContent>
                        <TabsContent value="access" className="space-y-3 focus-visible:outline-none">
                            {isOwner ? (
                                <div className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/20 px-3 py-2">
                                    <div className="space-y-0.5">
                                        <Label className="text-xs font-medium">Roles</Label>
                                        <p className="text-[10px] text-muted-foreground">
                                            Manage permissions and member roles
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs"
                                        onClick={() => handleManageRoles( selectedGroup.id )}
                                    >
                                        <Settings className="mr-1.5 h-3.5 w-3.5" />
                                        Manage
                                    </Button>
                                </div>
                            ) : (
                                <div className="rounded-md border border-border/60 bg-secondary/20 px-3 py-3 text-center">
                                    <Crown className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground/50" />
                                    <p className="text-xs font-medium text-muted-foreground">Owner only feature</p>
                                </div>
                            )}
                            {selectedGroup.ownerId !== currentUserId && (
                                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-xs font-medium text-destructive">Leave group</Label>
                                            <p className="text-[10px] text-muted-foreground">
                                                Remove yourself from this group
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            disabled={leavingGroupId === selectedGroup.id}
                                            onClick={() => {
                                                void handleLeaveGroup( selectedGroup.id, selectedGroup.name, selectedGroup.ownerId );
                                            }}
                                        >
                                            {leavingGroupId === selectedGroup.id ? (
                                                <>
                                                    <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                    Leaving...
                                                </>
                                            ) : (
                                                <>
                                                    <LogOut className="mr-1.5 h-3.5 w-3.5" />
                                                    Leave
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        );
    };

    /* removed quick actions */

    const renderGroupStackCard = () => {
        if ( groupsLoading && sortedGroups.length === 0 ) {
            return (
                <Card className="border border-border/60 bg-muted/20">
                    <CardContent className="flex items-center justify-center gap-2 py-10">
                        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Loading your groups…</p>
                    </CardContent>
                </Card>
            );
        }

        if ( sortedGroups.length === 0 ) {
            return (
                <Card className="border-dashed border-border/60 bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                        <Users className="h-10 w-10 text-muted-foreground/40" />
                        <CardTitle className="text-sm font-semibold">No groups yet</CardTitle>
                        <CardDescription className="text-xs">
                            Use the quick actions above to spin up your first space.
                        </CardDescription>
                    </CardContent>
                </Card>
            );
        }

        return (
            <Card className="border border-border/60 bg-background/70 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground">Groups</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1">
                        {sortedGroups.map( ( group ) => {
                            const isSelected = group.id === selectedGroupId;
                            const isActive = activeGroupSet.has( group.id );
                            const isOwner = group.ownerId === currentUserId;
                            return (
                                <button
                                    type="button"
                                    key={group.id}
                                    onClick={() => setSelectedGroupId( group.id )}
                                    className={cn(
                                        "group relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                                        isSelected
                                            ? "bg-accent text-foreground"
                                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "h-6 w-0.5 rounded-full",
                                            isSelected ? "bg-primary" : "bg-transparent group-hover:bg-muted-foreground/30"
                                        )}
                                    />
                                    <div
                                        className="h-8 w-8 shrink-0 rounded-full"
                                        style={{ backgroundColor: group.color }}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="truncate text-sm font-medium">
                                                {group.name}
                                            </span>
                                            {isOwner && <Crown className="h-3 w-3 text-amber-500" />}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                            <span>{group.memberCount} member{group.memberCount === 1 ? "" : "s"}</span>
                                            {isActive && (
                                                <span className="flex items-center gap-0.5 text-emerald-500">
                                                    <Circle className="h-1.5 w-1.5 fill-current" />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        } )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderGroupsArea = () => {
        const detailPanel = renderGroupDetails();

        return (
            <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                <div className="space-y-4">
                    {renderGroupStackCard()}
                </div>
                <div className="space-y-4">
                    {groupsLoading && sortedGroups.length === 0 ? (
                        <Card className="border border-border/60 bg-muted/20">
                            <CardContent className="flex items-center justify-center gap-2 py-12">
                                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Loading your groups…</p>
                            </CardContent>
                        </Card>
                    ) : (
                        detailPanel ?? (
                            <Card className="border border-dashed border-border/60 bg-muted/20">
                                <CardContent className="py-12 text-center">
                                    <CardTitle className="text-base font-semibold">Start managing spaces</CardTitle>
                                    <CardDescription className="mt-1 text-sm">
                                        Create or join a group to get started.
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        )
                    )}
                </div>
            </div>
        );
    };

    useEffect( () => {
        if ( !selectedGroup || selectedGroup.ownerId !== currentUserId ) {
            return;
        }

        const hasInvitesLoaded = invitesByGroupId[ selectedGroup.id ];
        const isLoading = inviteStateByGroupId[ selectedGroup.id ]?.loading;

        if ( hasInvitesLoaded || isLoading ) {
            return;
        }

        void fetchGroupInvites( selectedGroup.id ).catch( () => {
            // Error state handled via store metadata
        } );
    }, [ selectedGroup, currentUserId, invitesByGroupId, inviteStateByGroupId, fetchGroupInvites ] );

    if ( managingRolesForGroupId ) {
        return (
            <RoleManagementPanel
                groupId={managingRolesForGroupId}
                onClose={() => setManagingRolesForGroupId( null )}
            />
        );
    }

    return (
        <div className={cn( "w-full space-y-4", className )}>
            <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-secondary/20 p-3 md:flex-row md:items-center md:justify-between">
                <form onSubmit={handleCreateGroup} className="flex flex-1 items-center gap-2">
                    <Input
                        id="group-name"
                        type="text"
                        value={newGroupName}
                        onChange={( event ) => setNewGroupName( event.target.value )}
                        placeholder="Create group..."
                        disabled={isCreatingGroup}
                        className="h-8 flex-1 text-xs"
                    />
                    <input
                        aria-label="Group color"
                        type="color"
                        value={newGroupColor}
                        onChange={( event ) => setNewGroupColor( event.target.value )}
                        className="h-8 w-10 cursor-pointer rounded border border-border"
                        disabled={isCreatingGroup}
                    />
                    <Button type="submit" size="sm" disabled={isCreatingGroup} className="h-8 px-3 text-xs">
                        {isCreatingGroup ? "..." : "Create"}
                    </Button>
                </form>

                <div className="hidden h-6 w-px bg-border md:block" />

                <form onSubmit={handleJoinGroup} className="flex flex-1 items-center gap-2">
                    <Input
                        id="invite-code"
                        type="text"
                        value={inviteCodeInput}
                        onChange={( event ) => setInviteCodeInput( event.target.value )}
                        placeholder="Join with invite..."
                        disabled={isJoiningGroup}
                        className="h-8 flex-1 text-xs"
                    />
                    <Button type="submit" variant="outline" size="sm" className="h-8 px-3 text-xs" disabled={isJoiningGroup}>
                        {isJoiningGroup ? "..." : "Join"}
                    </Button>
                </form>
            </div>

            {groupsError && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    <XCircle className="h-3.5 w-3.5" />
                    {groupsError}
                </div>
            )}

            {renderGroupsArea()}
        </div>
    );
}
