import { useEffect, useMemo, useRef, useState } from "react";
import type { GroupInviteRecord } from "@eye-note/definitions";
import {
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@eye-note/ui";
import { useGroupsStore } from "@eye-note/groups";
import { toast } from "sonner";
import { Calendar, Copy, Link2, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";

const EXPIRATION_OPTIONS = [
    { label: "Never", value: "never" },
    { label: "30 minutes", value: "30" },
    { label: "4 hours", value: "240" },
    { label: "1 day", value: "1440" },
    { label: "7 days", value: "10080" },
];

const MAX_USE_OPTIONS = [
    { label: "Unlimited", value: "unlimited" },
    { label: "1 use", value: "1" },
    { label: "5 uses", value: "5" },
    { label: "25 uses", value: "25" },
];

function resolveExpirationMinutes ( value : string ) : number | null {
    if ( value === "never" ) {
        return null;
    }
    const parsed = Number( value );
    return Number.isFinite( parsed ) ? parsed : null;
}

function resolveMaxUses ( value : string ) : number | null {
    if ( value === "unlimited" ) {
        return null;
    }
    const parsed = Number( value );
    return Number.isFinite( parsed ) ? parsed : null;
}

function formatExpiry ( invite : GroupInviteRecord ) : string {
    if ( invite.status === "revoked" ) {
        return "Revoked";
    }
    if ( invite.expiresAt ) {
        const date = new Date( invite.expiresAt );
        return date.toLocaleString();
    }
    return "Never";
}

function inviteShareUrl ( code : string ) : string {
    if ( typeof window === "undefined" ) {
        return code;
    }
    const base = window.location.origin;
    return `${ base }/?invite=${ code }`;
}

interface InviteManagerProps {
    canManageGroups : boolean;
}

export function InviteManager ( { canManageGroups } : InviteManagerProps ) {
    const groups = useGroupsStore( ( state ) => state.groups );
    const isLoadingGroups = useGroupsStore( ( state ) => state.isLoading );
    const fetchGroups = useGroupsStore( ( state ) => state.fetchGroups );
    const invitesByGroupId = useGroupsStore( ( state ) => state.invitesByGroupId );
    const inviteStateByGroupId = useGroupsStore( ( state ) => state.inviteStateByGroupId );
    const fetchGroupInvites = useGroupsStore( ( state ) => state.fetchGroupInvites );
    const createGroupInvite = useGroupsStore( ( state ) => state.createGroupInvite );
    const revokeGroupInvite = useGroupsStore( ( state ) => state.revokeGroupInvite );

    const [ selectedGroupId, setSelectedGroupId ] = useState<string | null>( null );
    const [ expiresOption, setExpiresOption ] = useState<string>( "never" );
    const [ maxUsesOption, setMaxUsesOption ] = useState<string>( "unlimited" );
    const [ isCreatingInvite, setIsCreatingInvite ] = useState( false );
    const loadedGroupIdsRef = useRef<Set<string>>( new Set() );

    useEffect( () => {
        if ( groups.length > 0 && !selectedGroupId ) {
            setSelectedGroupId( groups[ 0 ].id );
        }
    }, [ groups, selectedGroupId ] );

    useEffect( () => {
        if ( !selectedGroupId ) {
            return;
        }
        if ( loadedGroupIdsRef.current.has( selectedGroupId ) ) {
            return;
        }
        loadedGroupIdsRef.current.add( selectedGroupId );
        void fetchGroupInvites( selectedGroupId ).catch( ( error ) => {
            console.warn( "[EyeNote] Failed to load invites", error );
        } );
    }, [ selectedGroupId, fetchGroupInvites ] );

    const invites = selectedGroupId ? invitesByGroupId[ selectedGroupId ] ?? [] : [];
    const inviteState = selectedGroupId ? inviteStateByGroupId[ selectedGroupId ] : undefined;

    const handleCreateInvite = async () => {
        if ( !selectedGroupId ) {
            return;
        }
        setIsCreatingInvite( true );
        try {
            const payload = {
                expiresInMinutes: resolveExpirationMinutes( expiresOption ),
                maxUses: resolveMaxUses( maxUsesOption ),
            };
            const invite = await createGroupInvite( selectedGroupId, payload );
            toast( "Invite created", { description: `Share ${ invite.code } with your teammates.` } );
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Failed to create invite";
            toast( "Unable to create invite", { description: message } );
        } finally {
            setIsCreatingInvite( false );
        }
    };

    const handleCopy = async ( invite : GroupInviteRecord ) => {
        const shareUrl = inviteShareUrl( invite.code );
        try {
            await navigator.clipboard.writeText( shareUrl );
            toast( "Invite copied", { description: shareUrl } );
        } catch {
            toast( "Copy failed", { description: "Select and copy the link manually." } );
        }
    };

    const handleRevoke = async ( invite : GroupInviteRecord ) => {
        if ( !selectedGroupId ) {
            return;
        }
        try {
            await revokeGroupInvite( selectedGroupId, invite.code );
            toast( "Invite revoked" );
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Failed to revoke invite";
            toast( "Unable to revoke", { description: message } );
        }
    };

    const emptyState = useMemo( () => {
        if ( !canManageGroups ) {
            return "You need group management permissions to create invites.";
        }
        if ( groups.length === 0 && !isLoadingGroups ) {
            return "Create a group first, then you'll be able to generate invites.";
        }
        return null;
    }, [ canManageGroups, groups.length, isLoadingGroups ] );

    return (
        <Card className="border border-border/60 bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle className="text-lg">Invitation links</CardTitle>
                    <CardDescription>
                        Generate shareable links, monitor usage, and revoke compromised codes.
                    </CardDescription>
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    className="gap-2"
                    onClick={() => {
                        void fetchGroups();
                        if ( selectedGroupId ) {
                            loadedGroupIdsRef.current.delete( selectedGroupId );
                            void fetchGroupInvites( selectedGroupId );
                        }
                    }}
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </CardHeader>
            <CardContent className="space-y-6">
                {!canManageGroups ? (
                    <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                        Sign in as a group manager to create invites.
                    </div>
                ) : groups.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                        {emptyState}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid gap-4 lg:grid-cols-3">
                            <div className="space-y-2">
                                <Label>Group</Label>
                                <Select value={selectedGroupId ?? undefined} onValueChange={setSelectedGroupId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a group" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {groups.map( ( group ) => (
                                            <SelectItem key={group.id} value={group.id}>
                                                <span className="flex items-center gap-2">
                                                    <span
                                                        className="h-2.5 w-2.5 rounded-full border border-border"
                                                        style={{ backgroundColor: group.color }}
                                                    />
                                                    {group.name}
                                                </span>
                                            </SelectItem>
                                        ) )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Max uses</Label>
                                <Select value={maxUsesOption} onValueChange={setMaxUsesOption}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MAX_USE_OPTIONS.map( ( option ) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ) )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Expires after</Label>
                                <Select value={expiresOption} onValueChange={setExpiresOption}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EXPIRATION_OPTIONS.map( ( option ) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ) )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button
                            onClick={handleCreateInvite}
                            disabled={!selectedGroupId || isCreatingInvite}
                            className="w-full gap-2"
                        >
                            <ShieldCheck className="h-4 w-4" />
                            {isCreatingInvite ? "Creating…" : "Create invite"}
                        </Button>
                    </div>
                )}

                {selectedGroupId && invites.length > 0 ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Active invites ({invites.length})</span>
                            {inviteState?.loading ? (
                                <span className="flex items-center gap-2">
                                    <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
                                </span>
                            ) : null}
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {invites.map( ( invite ) => (
                                <InviteCard
                                    key={invite.id}
                                    invite={invite}
                                    onCopy={handleCopy}
                                    onRevoke={handleRevoke}
                                />
                            ) )}
                        </div>
                    </div>
                ) : selectedGroupId && inviteState?.loading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin" /> Fetching invites…
                    </div>
                ) : selectedGroupId ? (
                    <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                        No invites yet. Generate one above.
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}

interface InviteCardProps {
    invite : GroupInviteRecord;
    onCopy : ( invite : GroupInviteRecord ) => void;
    onRevoke : ( invite : GroupInviteRecord ) => void;
}

function InviteCard ( { invite, onCopy, onRevoke } : InviteCardProps ) {
    const isRevoked = invite.status === "revoked";
    const isExpired = invite.status === "expired";
    const isMaxed = invite.status === "maxed";

    let badgeVariant : "default" | "secondary" | "destructive" = "default";
    if ( isRevoked || isExpired ) {
        badgeVariant = "destructive";
    } else if ( isMaxed ) {
        badgeVariant = "secondary";
    }

    const statusLabel = invite.status.charAt( 0 ).toUpperCase() + invite.status.slice( 1 );

    return (
        <div className="rounded-xl border border-border/60 bg-card/60 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Invite code</p>
                    <p className="text-2xl font-semibold text-foreground">{invite.code}</p>
                </div>
                <Badge variant={badgeVariant}>{statusLabel}</Badge>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Uses: {invite.uses}
                    {invite.maxUses ? ` / ${ invite.maxUses }` : " (unlimited)"}
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Expires: {formatExpiry( invite )}
                </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => onCopy( invite )}>
                    <Copy className="h-4 w-4" /> Copy link
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    disabled={isRevoked}
                    onClick={() => onRevoke( invite )}
                >
                    <Trash2 className="h-4 w-4" />
                    Revoke
                </Button>
            </div>
        </div>
    );
}
