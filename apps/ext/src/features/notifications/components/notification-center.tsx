import { useEffect } from "react";
import type { NotificationRecord } from "@eye-note/definitions";
import {
    Badge,
    Button,
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    cn,
} from "@eye-note/ui";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useNotificationsStore } from "../notifications-store";
import { approveJoinRequest, rejectJoinRequest } from "../../../modules/groups/groups-api";

interface NotificationCenterProps {
    open : boolean;
    onOpenChange : ( open : boolean ) => void;
    container ?: HTMLElement | null;
}

export function NotificationCenter ( { open, onOpenChange, container } : NotificationCenterProps ) {
    const notifications = useNotificationsStore( ( state ) => state.items );
    const isLoading = useNotificationsStore( ( state ) => state.isLoading );
    const isLoadingMore = useNotificationsStore( ( state ) => state.isLoadingMore );
    const hasMore = useNotificationsStore( ( state ) => state.hasMore );
    const fetchMore = useNotificationsStore( ( state ) => state.fetchMore );
    const markAsRead = useNotificationsStore( ( state ) => state.markAsRead );
    const markAllAsRead = useNotificationsStore( ( state ) => state.markAllAsRead );
    const unreadCount = useNotificationsStore( ( state ) => state.unreadCount );
    const isMarkingAll = useNotificationsStore( ( state ) => state.isMarkingAll );
    const initialized = useNotificationsStore( ( state ) => state.initialized );
    const bootstrap = useNotificationsStore( ( state ) => state.bootstrap );
    const pending = useNotificationsStore( ( state ) => state.pending );
    const [ actioningId, setActioningId ] = useState<string | null>( null );

    const handleJoinRequestDecision = useCallback( async (
        notification : NotificationRecord,
        decision : "approve" | "reject"
    ) => {
        const groupId = notification.data?.groupId;
        const requestId = notification.data?.requestId;

        if ( !groupId || !requestId ) {
            return;
        }

        setActioningId( notification.id );
        const action = decision === "approve" ? approveJoinRequest : rejectJoinRequest;
        try {
            await action( groupId, requestId );
            await markAsRead( notification.id );
            toast( decision === "approve" ? "Request approved" : "Request declined", {
                description: decision === "approve"
                    ? "The requester will be notified immediately."
                    : "They'll be notified of your decision.",
            } );
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Failed to update request";
            toast( "Unable to update", { description: message } );
        } finally {
            setActioningId( null );
        }
    }, [ markAsRead ] );

    useEffect( () => {
        if ( open && !initialized ) {
            void bootstrap();
        }
    }, [ open, initialized, bootstrap ] );

    const isEmpty = !isLoading && notifications.length === 0;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                container={container ?? undefined}
                side="right"
                className="notifications-panel w-full sm:max-w-md flex flex-col gap-4"
            >
                <SheetHeader>
                    <SheetTitle>Notifications</SheetTitle>
                    <SheetDescription>
                        Stay on top of group activity without leaving your current page.
                    </SheetDescription>
                </SheetHeader>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                        {unreadCount > 0 ? `${ unreadCount } unread` : "You're all caught up"}
                    </span>
                    <Button
                        size="sm"
                        variant="ghost"
                        disabled={unreadCount === 0 || isMarkingAll}
                        onClick={() => {
                            void markAllAsRead();
                        }}
                    >
                        Mark all read
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                    {isLoading ? (
                        <NotificationSkeleton />
                    ) : isEmpty ? (
                        <EmptyState />
                    ) : (
                        notifications.map( ( notification ) => {
                            const isJoinRequest =
                                notification.type === "group_join_request" &&
                                notification.data?.groupId &&
                                notification.data?.requestId;

                            return (
                                <NotificationCard
                                    key={notification.id}
                                    notification={notification}
                                    isPending={Boolean( pending[ notification.id ] )}
                                    onMarkAsRead={markAsRead}
                                    onApproveJoinRequest={isJoinRequest
                                        ? () => handleJoinRequestDecision( notification, "approve" )
                                        : undefined}
                                    onRejectJoinRequest={isJoinRequest
                                        ? () => handleJoinRequestDecision( notification, "reject" )
                                        : undefined}
                                    isActionLoading={actioningId === notification.id}
                                />
                            );
                        } )
                    )}
                </div>
                {hasMore ? (
                    <Button
                        variant="outline"
                        disabled={isLoadingMore}
                        onClick={() => {
                            void fetchMore();
                        }}
                    >
                        {isLoadingMore ? "Loading…" : "Load older"}
                    </Button>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}

interface NotificationCardProps {
    notification : NotificationRecord;
    isPending : boolean;
    onMarkAsRead : ( id : string ) => Promise<void>;
    onApproveJoinRequest ?: () => Promise<void> | void;
    onRejectJoinRequest ?: () => Promise<void> | void;
    isActionLoading ?: boolean;
}

function NotificationCard ( {
    notification,
    isPending,
    onMarkAsRead,
    onApproveJoinRequest,
    onRejectJoinRequest,
    isActionLoading,
} : NotificationCardProps ) {
    const isUnread = !notification.isRead;
    const timestamp = formatTimestamp( notification.createdAt );
    const requesterName = notification.data?.requesterName;
    const isJoinRequest = notification.type === "group_join_request";
    const isDecision = notification.type === "group_join_decision";
    const joinDecisionLabel = isDecision && notification.data?.decision === "approved"
        ? "You have access"
        : isDecision && notification.data?.decision === "rejected"
            ? "Request declined"
            : null;

    return (
        <div
            className={cn(
                "rounded-lg border border-border/60 bg-background/60 p-4 text-sm shadow-sm transition-colors",
                isUnread && "border-primary/60 bg-primary/5"
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div>
                    <div className="font-medium text-foreground">{notification.title}</div>
                    {notification.body ? (
                        <p className="mt-1 text-muted-foreground whitespace-pre-line">
                            {notification.body}
                        </p>
                    ) : null}
                    {isJoinRequest && requesterName ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                            {requesterName} is waiting for approval.
                        </p>
                    ) : null}
                    {joinDecisionLabel ? (
                        <p className="mt-1 text-xs text-muted-foreground">{joinDecisionLabel}</p>
                    ) : null}
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                    <span>{timestamp}</span>
                    {isUnread ? <Badge variant="secondary">New</Badge> : null}
                </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                {isJoinRequest && onApproveJoinRequest ? (
                    <Button
                        size="sm"
                        variant="secondary"
                        disabled={isActionLoading}
                        onClick={() => {
                            void onApproveJoinRequest();
                        }}
                    >
                        {isActionLoading ? "Updating…" : "Approve"}
                    </Button>
                ) : null}
                {isJoinRequest && onRejectJoinRequest ? (
                    <Button
                        size="sm"
                        variant="ghost"
                        disabled={isActionLoading}
                        onClick={() => {
                            void onRejectJoinRequest();
                        }}
                    >
                        {isActionLoading ? "Updating…" : "Decline"}
                    </Button>
                ) : null}
                {isUnread ? (
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending || isActionLoading}
                        onClick={() => {
                            void onMarkAsRead( notification.id );
                        }}
                    >
                        {isPending ? "Updating…" : "Mark read"}
                    </Button>
                ) : null}
            </div>
        </div>
    );
}

const placeholderItems = Array.from( { length: 3 }, ( _, index ) => index );

function NotificationSkeleton () {
    return (
        <div className="space-y-2">
            {placeholderItems.map( ( key ) => (
                <div key={key} className="animate-pulse rounded-lg border border-border/60 bg-muted/30 p-4">
                    <div className="h-4 w-1/3 rounded bg-muted" />
                    <div className="mt-2 h-3 w-2/3 rounded bg-muted" />
                </div>
            ) )}
        </div>
    );
}

function EmptyState () {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            <div className="text-base font-medium text-foreground">No notifications yet</div>
            <p className="max-w-xs">
                Activity from your groups will appear here so you can review it whenever you have a moment.
            </p>
        </div>
    );
}

function formatTimestamp ( isoDate : string ) : string {
    const date = new Date( isoDate );
    if ( Number.isNaN( date.getTime() ) ) {
        return "Just now";
    }

    try {
        return new Intl.DateTimeFormat( undefined, {
            dateStyle: "short",
            timeStyle: "short",
        } ).format( date );
    } catch {
        return date.toLocaleString();
    }
}
