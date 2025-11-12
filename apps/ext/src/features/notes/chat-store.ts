import { create } from "zustand";
import type { NoteChatMessageRecord } from "@eye-note/definitions";
import { fetchNoteChatMessages } from "./chat-api";

export type NoteChatMessage = NoteChatMessageRecord & {
    optimistic ?: boolean;
};

interface NoteChatState {
    messages : Record<string, NoteChatMessage[]>;
    isLoading : Record<string, boolean>;
    errors : Record<string, string | undefined>;
    hasMore : Record<string, boolean>;
    nextCursor : Record<string, string | undefined>;
}

interface NoteChatActions {
    fetchMessages : ( noteId : string ) => Promise<void>;
    fetchOlderMessages : ( noteId : string ) => Promise<void>;
    receiveMessage : ( noteId : string, message : NoteChatMessageRecord ) => void;
    addOptimisticMessage : ( noteId : string, message : NoteChatMessage ) => void;
    replaceOptimisticMessage : (
        noteId : string,
        clientMessageId : string,
        resolvedMessage : NoteChatMessageRecord
    ) => void;
    reset : ( noteId : string ) => void;
}

export type NoteChatStore = NoteChatState & NoteChatActions;

const initialState : NoteChatState = {
    messages: {},
    isLoading: {},
    errors: {},
    hasMore: {},
    nextCursor: {},
};

function upsertMessage ( existing : NoteChatMessage[], incoming : NoteChatMessageRecord ) : NoteChatMessage[] {
    const byId = new Map<string, NoteChatMessage>();
    existing.forEach( ( message ) => {
        byId.set( message.id, message );
        if ( message.clientMessageId ) {
            byId.set( `client:${ message.clientMessageId }`, message );
        }
    } );

    if ( byId.has( incoming.id ) ) {
        const next = existing.map( ( msg ) => ( msg.id === incoming.id ? { ...incoming } : msg ) );
        return sortMessages( next );
    }

    if ( incoming.clientMessageId && byId.has( `client:${ incoming.clientMessageId }` ) ) {
        const next = existing.map( ( msg ) =>
            msg.clientMessageId === incoming.clientMessageId ? { ...incoming } : msg
        );
        return sortMessages( next );
    }

    return sortMessages( [ ...existing, incoming ] );
}

function sortMessages ( messages : NoteChatMessage[] ) : NoteChatMessage[] {
    return [ ...messages ].sort( ( a, b ) => {
        return new Date( a.createdAt ).getTime() - new Date( b.createdAt ).getTime();
    } );
}

export const useNoteChatStore = create<NoteChatStore>( ( set, get ) => ( {
    ...initialState,
    async fetchMessages ( noteId ) {
        const state = get();
        if ( state.isLoading[ noteId ] ) {
            return;
        }

        set( ( prev ) => ( {
            ...prev,
            isLoading: { ...prev.isLoading, [ noteId ]: true },
            errors: { ...prev.errors, [ noteId ]: undefined },
        } ) );

        try {
            const response = await fetchNoteChatMessages( noteId );
            set( ( prev ) => ( {
                ...prev,
                messages: { ...prev.messages, [ noteId ]: response.messages },
                hasMore: { ...prev.hasMore, [ noteId ]: response.hasMore },
                nextCursor: { ...prev.nextCursor, [ noteId ]: response.nextCursor },
                isLoading: { ...prev.isLoading, [ noteId ]: false },
            } ) );
        } catch ( error ) {
            console.warn( "[EyeNote] Failed to load note chat messages", error );
            set( ( prev ) => ( {
                ...prev,
                isLoading: { ...prev.isLoading, [ noteId ]: false },
                errors: { ...prev.errors, [ noteId ]: error instanceof Error ? error.message : "Failed to load messages" },
            } ) );
        }
    },
    async fetchOlderMessages ( noteId ) {
        const state = get();
        if ( state.isLoading[ noteId ] || !state.hasMore[ noteId ] ) {
            return;
        }

        set( ( prev ) => ( {
            ...prev,
            isLoading: { ...prev.isLoading, [ noteId ]: true },
        } ) );

        try {
            const response = await fetchNoteChatMessages( noteId, state.nextCursor[ noteId ] );
            set( ( prev ) => {
                const current = prev.messages[ noteId ] ?? [];
                return {
                    ...prev,
                    messages: {
                        ...prev.messages,
                        [ noteId ]: sortMessages( [ ...response.messages, ...current ] ),
                    },
                    hasMore: { ...prev.hasMore, [ noteId ]: response.hasMore },
                    nextCursor: { ...prev.nextCursor, [ noteId ]: response.nextCursor },
                    isLoading: { ...prev.isLoading, [ noteId ]: false },
                };
            } );
        } catch ( error ) {
            console.warn( "[EyeNote] Failed to load older chat messages", error );
            set( ( prev ) => ( {
                ...prev,
                isLoading: { ...prev.isLoading, [ noteId ]: false },
                errors: { ...prev.errors, [ noteId ]: error instanceof Error ? error.message : "Failed to load messages" },
            } ) );
        }
    },
    receiveMessage ( noteId, message ) {
        set( ( prev ) => {
            const existing = prev.messages[ noteId ] ?? [];
            return {
                ...prev,
                messages: {
                    ...prev.messages,
                    [ noteId ]: upsertMessage( existing, message ),
                },
            };
        } );
    },
    addOptimisticMessage ( noteId, message ) {
        set( ( prev ) => {
            const existing = prev.messages[ noteId ] ?? [];
            return {
                ...prev,
                messages: {
                    ...prev.messages,
                    [ noteId ]: sortMessages( [ ...existing, { ...message, optimistic: true } ] ),
                },
            };
        } );
    },
    replaceOptimisticMessage ( noteId, clientMessageId, resolvedMessage ) {
        set( ( prev ) => {
            const existing = prev.messages[ noteId ] ?? [];
            const next = existing.map( ( msg ) =>
                msg.clientMessageId === clientMessageId ? { ...resolvedMessage } : msg
            );
            return {
                ...prev,
                messages: {
                    ...prev.messages,
                    [ noteId ]: upsertMessage( next, resolvedMessage ),
                },
            };
        } );
    },
    reset ( noteId ) {
        set( ( prev ) => {
            const nextMessages = { ...prev.messages };
            delete nextMessages[ noteId ];
            const nextLoading = { ...prev.isLoading };
            delete nextLoading[ noteId ];
            const nextErrors = { ...prev.errors };
            delete nextErrors[ noteId ];
            const nextCursor = { ...prev.nextCursor };
            delete nextCursor[ noteId ];
            const nextHasMore = { ...prev.hasMore };
            delete nextHasMore[ noteId ];

            return {
                ...prev,
                messages: nextMessages,
                isLoading: nextLoading,
                errors: nextErrors,
                nextCursor: nextCursor,
                hasMore: nextHasMore,
            };
        } );
    },
} ) );
