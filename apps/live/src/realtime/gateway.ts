import type { FastifyInstance } from "fastify";
import fastifySocketIo from "fastify-socket.io";
import jwt from "jsonwebtoken";
import type { Socket, Server as SocketIOServer, DisconnectReason } from "socket.io";
import type { RealtimeAuthClaims } from "@eye-note/definitions";
import { liveConfig } from "../config";
import {
    ensureNoteGroupAccess,
    getAccessErrorStatus,
    getNoteChatMessageModel,
    serializeNoteChatMessage,
    createNoteChatMessageNotifications,
    serializeNotification,
} from "@eye-note/backend-models";

const NoteChatMessageModel = getNoteChatMessageModel();

type AckFn = ( response : { ok : boolean; error ?: string } ) => void;

function extractToken ( socket : Socket ) : string | null {
    const fromAuth = socket.handshake.auth?.token;
    if ( typeof fromAuth === "string" && fromAuth.trim().length > 0 ) {
        return fromAuth;
    }

    const fromQuery = socket.handshake.query?.token;
    if ( typeof fromQuery === "string" && fromQuery.trim().length > 0 ) {
        return fromQuery;
    }

    return null;
}

export async function registerRealtimeGateway ( fastify : FastifyInstance ) {
    await fastify.register( fastifySocketIo, {
        cors: {
            origin: true,
            credentials: true,
        },
        path: "/realtime/socket.io",
    } );

    const io = ( fastify as FastifyInstance & { io : SocketIOServer } ).io;

    io.use( ( socket : Socket, next : ( err ?: Error ) => void ) => {
        const token = extractToken( socket );
        if ( !token ) {
            next( new Error( "missing_token" ) );
            return;
        }

        try {
            const payload = jwt.verify( token, liveConfig.realtime.jwtSecret ) as RealtimeAuthClaims;
            const groupIds = Array.isArray( payload.groupIds ) ? payload.groupIds : [];
            socket.data.userId = payload.userId;
            socket.data.groupIds = groupIds;

            groupIds.forEach( ( groupId : string ) => {
                socket.join( `group:${ groupId }` );
            } );

            next();
        } catch ( error ) {
            fastify.log.warn( { err: error }, "Realtime auth failed" );
            next( new Error( "invalid_token" ) );
        }
    } );

    io.on( "connection", ( socket : Socket ) => {
        fastify.log.info( {
            event: "realtime.connection",
            socketId: socket.id,
            userId: socket.data.userId,
        }, "Realtime client connected" );

        if ( typeof socket.data.userId === "string" ) {
            socket.join( `user:${ socket.data.userId }` );
        }

        socket.on( "note:join", async ( payload : { noteId ?: string }, ack ?: AckFn ) => {
            const noteId = payload?.noteId;
            if ( typeof noteId !== "string" || noteId.length === 0 ) {
                ack?.( { ok: false, error: "invalid_note_id" } );
                return;
            }

            if ( typeof socket.data.userId !== "string" ) {
                ack?.( { ok: false, error: "unauthorized" } );
                return;
            }

            const access = await ensureNoteGroupAccess( noteId, socket.data.userId );
            if ( "error" in access ) {
                ack?.( { ok: false, error: access.error } );
                return;
            }

            socket.join( `note:${ access.noteId }` );
            ack?.( { ok: true } );
        } );

        socket.on( "note:leave", ( payload : { noteId ?: string }, ack ?: AckFn ) => {
            const noteId = payload?.noteId;
            if ( typeof noteId !== "string" || noteId.length === 0 ) {
                ack?.( { ok: false, error: "invalid_note_id" } );
                return;
            }
            socket.leave( `note:${ noteId }` );
            ack?.( { ok: true } );
        } );

        socket.on(
            "note:message",
            async (
                payload : { noteId ?: string; content ?: string; clientMessageId ?: string },
                ack ?: AckFn
            ) => {
                const noteId = payload?.noteId;
                const content = payload?.content;

                if ( typeof noteId !== "string" || noteId.length === 0 ) {
                    ack?.( { ok: false, error: "invalid_note_id" } );
                    return;
                }

                if ( typeof content !== "string" || content.trim().length === 0 ) {
                    ack?.( { ok: false, error: "invalid_content" } );
                    return;
                }

                if ( typeof socket.data.userId !== "string" ) {
                    ack?.( { ok: false, error: "unauthorized" } );
                    return;
                }

                const access = await ensureNoteGroupAccess( noteId, socket.data.userId );
                if ( "error" in access ) {
                    ack?.( { ok: false, error: access.error } );
                    return;
                }

                const doc = await NoteChatMessageModel.create( {
                    noteId: access.noteId,
                    groupId: access.groupId,
                    userId: socket.data.userId,
                    content: content.trim(),
                    clientMessageId: payload?.clientMessageId ?? null,
                } );

                const record = serializeNoteChatMessage( doc );
                io.to( `note:${ access.noteId }` ).emit( "note:message", record );
                io.to( `group:${ access.groupId }` ).emit( "note:message", record );

                try {
                    const notifications = await createNoteChatMessageNotifications( {
                        messageId: record.id,
                        groupId: record.groupId ?? access.groupId,
                        noteId: record.noteId,
                        actorId: socket.data.userId,
                        noteOwnerId: access.ownerId,
                        content: record.content,
                    } );

                    notifications.forEach( ( notification ) => {
                        io.to( `user:${ notification.userId }` ).emit( "notification", serializeNotification( notification ) );
                    } );
                } catch ( error ) {
                    fastify.log.error( { err: error }, "Failed to create realtime chat notifications" );
                }

                ack?.( { ok: true } );
            }
        );

        socket.on( "disconnect", ( reason : DisconnectReason ) => {
            fastify.log.info( {
                event: "realtime.disconnect",
                socketId: socket.id,
                userId: socket.data.userId,
                reason,
            }, "Realtime client disconnected" );
        } );
    } );
}
