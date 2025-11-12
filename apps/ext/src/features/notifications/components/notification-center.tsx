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
import { useNotificationsStore } from "../notifications-store";

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
                        notifications.map( ( notification ) => (
                            <NotificationCard
                                key={notification.id}
                                notification={notification}
                                isPending={Boolean( pending[ notification.id ] )}
                                onMarkAsRead={markAsRead}
                            />
                        ) )
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
}

function NotificationCard ( { notification, isPending, onMarkAsRead } : NotificationCardProps ) {
    const isUnread = !notification.isRead;
    const timestamp = formatTimestamp( notification.createdAt );

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
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                    <span>{timestamp}</span>
                    {isUnread ? <Badge variant="secondary">New</Badge> : null}
                </div>
            </div>
            <div className="mt-3 flex gap-2">
                {isUnread ? (
                    <Button
                        size="sm"
                        variant="secondary"
                        disabled={isPending}
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
