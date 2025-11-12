import { create } from "zustand";
import type { NotificationRecord } from "@eye-note/definitions";
import {
    fetchNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from "./notifications-api";

interface NotificationsState {
    items : NotificationRecord[];
    unreadCount : number;
    hasMore : boolean;
    nextCursor ?: string;
    isLoading : boolean;
    isLoadingMore : boolean;
    isMarkingAll : boolean;
    error ?: string;
    initialized : boolean;
    pending : Record<string, boolean>;
}

interface NotificationsActions {
    bootstrap : () => Promise<void>;
    fetchMore : () => Promise<void>;
    receiveNotification : ( notification : NotificationRecord ) => void;
    markAsRead : ( notificationId : string ) => Promise<void>;
    markAllAsRead : () => Promise<void>;
    reset : () => void;
}

const MAX_NOTIFICATIONS = 200;

const initialState : NotificationsState = {
    items: [],
    unreadCount: 0,
    hasMore: true,
    nextCursor: undefined,
    isLoading: false,
    isLoadingMore: false,
    isMarkingAll: false,
    error: undefined,
    initialized: false,
    pending: {},
};

function sortNotifications ( list : NotificationRecord[] ) : NotificationRecord[] {
    return [ ...list ].sort( ( a, b ) => new Date( b.createdAt ).getTime() - new Date( a.createdAt ).getTime() );
}

function upsertNotification ( list : NotificationRecord[], incoming : NotificationRecord ) : NotificationRecord[] {
    const existingIndex = list.findIndex( ( item ) => item.id === incoming.id );
    if ( existingIndex === -1 ) {
        return sortNotifications( [ incoming, ...list ].slice( 0, MAX_NOTIFICATIONS ) );
    }

    const next = list.slice();
    next[ existingIndex ] = incoming;
    return sortNotifications( next );
}

function calculateUnreadCount ( list : NotificationRecord[] ) : number {
    return list.reduce( ( total, notification ) => ( notification.isRead ? total : total + 1 ), 0 );
}

export const useNotificationsStore = create<NotificationsState & NotificationsActions>( ( set, get ) => ( {
    ...initialState,
    async bootstrap () {
        const state = get();
        if ( state.initialized || state.isLoading ) {
            return;
        }

        set( ( prev ) => ( {
            ...prev,
            isLoading: true,
            error: undefined,
        } ) );

        try {
            const response = await fetchNotifications();
            set( ( prev ) => {
                const merged = sortNotifications( [ ...response.notifications, ...prev.items ] ).slice( 0, MAX_NOTIFICATIONS );
                return {
                    ...prev,
                    items: merged,
                    unreadCount: calculateUnreadCount( merged ),
                    hasMore: response.hasMore,
                    nextCursor: response.nextCursor,
                    isLoading: false,
                    initialized: true,
                };
            } );
        } catch ( error ) {
            set( ( prev ) => ( {
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : "Failed to load notifications",
            } ) );
        }
    },
    async fetchMore () {
        const state = get();
        if ( !state.hasMore || state.isLoadingMore || state.isLoading ) {
            return;
        }

        set( ( prev ) => ( {
            ...prev,
            isLoadingMore: true,
            error: undefined,
        } ) );

        try {
            const response = await fetchNotifications( state.nextCursor );
            set( ( prev ) => {
                const merged = sortNotifications( [ ...prev.items, ...response.notifications ] ).slice( 0, MAX_NOTIFICATIONS );
                return {
                    ...prev,
                    items: merged,
                    hasMore: response.hasMore,
                    nextCursor: response.nextCursor,
                    isLoadingMore: false,
                    unreadCount: calculateUnreadCount( merged ),
                };
            } );
        } catch ( error ) {
            set( ( prev ) => ( {
                ...prev,
                isLoadingMore: false,
                error: error instanceof Error ? error.message : "Failed to load older notifications",
            } ) );
        }
    },
    receiveNotification ( notification ) {
        set( ( prev ) => {
            const nextItems = upsertNotification( prev.items, notification );
            return {
                ...prev,
                items: nextItems,
                unreadCount: calculateUnreadCount( nextItems ),
            };
        } );
    },
    async markAsRead ( notificationId ) {
        if ( get().pending[ notificationId ] ) {
            return;
        }

        set( ( prev ) => ( {
            ...prev,
            pending: { ...prev.pending, [ notificationId ]: true },
        } ) );

        try {
            const updated = await markNotificationRead( notificationId );
            set( ( prev ) => {
                const nextItems = upsertNotification( prev.items, updated );
                const nextPending = { ...prev.pending };
                delete nextPending[ notificationId ];
                return {
                    ...prev,
                    items: nextItems,
                    unreadCount: calculateUnreadCount( nextItems ),
                    pending: nextPending,
                };
            } );
        } catch ( error ) {
            set( ( prev ) => {
                const nextPending = { ...prev.pending };
                delete nextPending[ notificationId ];
                return {
                    ...prev,
                    pending: nextPending,
                    error: error instanceof Error ? error.message : "Failed to update notification",
                };
            } );
        }
    },
    async markAllAsRead () {
        const state = get();
        if ( state.isMarkingAll || state.unreadCount === 0 ) {
            return;
        }

        set( ( prev ) => ( {
            ...prev,
            isMarkingAll: true,
        } ) );

        try {
            await markAllNotificationsRead();
            set( ( prev ) => {
                const nextItems = prev.items.map( ( item ) => ( item.isRead ? item : { ...item, isRead: true, readAt: new Date().toISOString() } ) );
                return {
                    ...prev,
                    items: nextItems,
                    unreadCount: 0,
                    isMarkingAll: false,
                };
            } );
        } catch ( error ) {
            set( ( prev ) => ( {
                ...prev,
                isMarkingAll: false,
                error: error instanceof Error ? error.message : "Failed to mark notifications",
            } ) );
        }
    },
    reset () {
        set( () => ( { ...initialState } ) );
    },
} ) );
