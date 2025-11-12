import { create } from "zustand";
import { io, type Socket } from "socket.io-client";
import type { NoteChatMessageRecord } from "@eye-note/definitions";
import { getRealtimeBaseUrl } from "../../lib/api-client";
import { postNoteChatMessage, requestRealtimeToken } from "../notes/chat-api";
import { useNoteChatStore } from "../notes/chat-store";
import type { Note } from "../../types";

type RealtimeStatus = "disconnected" | "connecting" | "connected" | "error";

interface SendMessageParams {
    note : Pick<Note, "id" | "groupId">;
    content : string;
    userId : string;
}

interface RealtimeState {
    status : RealtimeStatus;
    error ?: string;
    socket ?: Socket;
    joinedNotes : Record<string, boolean>;
    tokenExpiresAt ?: number;
}

interface RealtimeActions {
    ensureConnected : ( activeGroupIds ?: string[] ) => Promise<void>;
    disconnect : () => void;
    joinNoteRoom : ( noteId : string ) => Promise<void>;
    leaveNoteRoom : ( noteId : string ) => void;
    sendMessage : ( params : SendMessageParams ) => Promise<void>;
}

export type RealtimeStore = RealtimeState & RealtimeActions;

const FALLBACK_TOKEN_HEADROOM_MS = 10_000;
export const REALTIME_FAILURE_EVENT = "eye-note-realtime-failure";

function generateClientMessageId () : string {
    if ( typeof crypto !== "undefined" && crypto.randomUUID ) {
        return crypto.randomUUID();
    }
    return Math.random().toString( 36 ).slice( 2 );
}

export const useRealtimeStore = create<RealtimeStore>( ( set, get ) => ( {
    status: "disconnected",
    joinedNotes: {},
    async ensureConnected ( activeGroupIds ) {
        const state = get();
        if (
            state.status === "connected" &&
            state.tokenExpiresAt &&
            state.tokenExpiresAt - Date.now() > FALLBACK_TOKEN_HEADROOM_MS
        ) {
            return;
        }

        if ( state.status === "connecting" ) {
            return;
        }

        set( ( prev ) => ( {
            ...prev,
            status: "connecting",
            error: undefined,
        } ) );

        try {
            const tokenResponse = await requestRealtimeToken(
                activeGroupIds && activeGroupIds.length > 0 ? { activeGroupIds } : undefined
            );

            state.socket?.disconnect();

            const socket = io( getRealtimeBaseUrl(), {
                path: "/realtime/socket.io",
                transports: [ "websocket" ],
                auth: { token: tokenResponse.token },
            } );

            socket.on( "connect", () => {
                set( ( prev ) => ( {
                    ...prev,
                    status: "connected",
                    error: undefined,
                } ) );
            } );

            socket.on( "disconnect", ( reason ) => {
                console.warn( "[EyeNote] Realtime socket disconnected", reason );
                if ( reason !== "io client disconnect" && typeof window !== "undefined" ) {
                    window.dispatchEvent( new CustomEvent( REALTIME_FAILURE_EVENT, { detail: { error: reason } } ) );
                }
                set( ( prev ) => ( {
                    ...prev,
                    status: "disconnected",
                    socket: undefined,
                } ) );
            } );

            socket.on( "connect_error", ( err : Error ) => {
                console.warn( "[EyeNote] Realtime socket error", err );
                if ( typeof window !== "undefined" ) {
                    window.dispatchEvent( new CustomEvent( REALTIME_FAILURE_EVENT, { detail: { error: err.message } } ) );
                }
                set( ( prev ) => ( {
                    ...prev,
                    status: "error",
                    error: err.message,
                } ) );
            } );

            socket.on( "note:message", ( message : NoteChatMessageRecord ) => {
                useNoteChatStore
                    .getState()
                    .receiveMessage( message.noteId, message );
            } );

            socket.on( "notification:group", ( payload ) => {
                console.info( "[EyeNote] Group notification", payload );
            } );

            socket.on( "notification", ( payload ) => {
                console.info( "[EyeNote] Notification", payload );
            } );

            set( ( prev ) => ( {
                ...prev,
                socket,
                tokenExpiresAt: Date.parse( tokenResponse.expiresAt ),
                joinedNotes: {},
            } ) );
        } catch ( error ) {
            console.error( "[EyeNote] Failed to connect realtime gateway", error );
            if ( typeof window !== "undefined" ) {
                window.dispatchEvent( new CustomEvent( REALTIME_FAILURE_EVENT, { detail: { error: error instanceof Error ? error.message : String( error ) } } ) );
            }
            set( ( prev ) => ( {
                ...prev,
                status: "error",
                error: error instanceof Error ? error.message : "Failed to connect",
            } ) );
        }
    },
    disconnect () {
        const { socket } = get();
        socket?.disconnect();
        set( {
            status: "disconnected",
            socket: undefined,
            joinedNotes: {},
            tokenExpiresAt: undefined,
        } );
    },
    async joinNoteRoom ( noteId ) {
        const { socket, joinedNotes } = get();
        if ( joinedNotes[ noteId ] ) {
            return;
        }

        if ( !socket ) {
            await get().ensureConnected();
        }

        const liveSocket = get().socket;
        if ( !liveSocket ) {
            return;
        }

        await new Promise<void>( ( resolve ) => {
            liveSocket.emit( "note:join", { noteId }, () => {
                resolve();
            } );
        } );

        set( ( prev ) => ( {
            ...prev,
            joinedNotes: { ...prev.joinedNotes, [ noteId ]: true },
        } ) );
    },
    leaveNoteRoom ( noteId ) {
        const { socket } = get();
        socket?.emit( "note:leave", { noteId } );
        set( ( prev ) => {
            if ( !prev.joinedNotes[ noteId ] ) {
                return prev;
            }
            const nextJoined = { ...prev.joinedNotes };
            delete nextJoined[ noteId ];
            return {
                ...prev,
                joinedNotes: nextJoined,
            };
        } );
    },
    async sendMessage ( { note, content, userId } ) {
        if ( content.trim().length === 0 ) {
            return;
        }

        await get().ensureConnected();
        await get().joinNoteRoom( note.id );

        const clientMessageId = generateClientMessageId();
        const optimisticMessage : NoteChatMessageRecord = {
            id: `optimistic-${ clientMessageId }`,
            noteId: note.id,
            groupId: note.groupId ?? null,
            userId,
            content,
            clientMessageId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        useNoteChatStore.getState().addOptimisticMessage( note.id, {
            ...optimisticMessage,
            optimistic: true,
        } );

        const { socket } = get();

        const finalizeWithServer = ( message ?: NoteChatMessageRecord ) => {
            if ( message ) {
                useNoteChatStore.getState().replaceOptimisticMessage( note.id, clientMessageId, message );
            }
        };

        if ( socket?.connected ) {
            socket.emit(
                "note:message",
                {
                    noteId: note.id,
                    content,
                    clientMessageId,
                },
                async ( response : { ok : boolean; error ?: string } ) => {
                    if ( response?.ok ) {
                        return;
                    }
                    console.warn( "[EyeNote] Realtime message emit failed, falling back to REST", response?.error );
                    const fallbackMessage = await postNoteChatMessage( note.id, {
                        content,
                        clientMessageId,
                    } );
                    finalizeWithServer( fallbackMessage );
                }
            );
            return;
        }

        const fallbackMessage = await postNoteChatMessage( note.id, {
            content,
            clientMessageId,
        } );
        finalizeWithServer( fallbackMessage );
    },
} ) );
