import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { NoteChatMessageRecord } from "@eye-note/definitions";
import { NoteChatMessageModel, type NoteChatMessageDocument } from "../models/note-chat-message";
import { ensureNoteGroupAccess, getAccessErrorStatus } from "../services/note-chat-access";
import { serializeNoteChatMessage } from "../services/note-chat-serialization";

const noteParamsSchema = z.object( {
    noteId: z.string().min( 1 ),
} );

const messagesQuerySchema = z.object( {
    limit: z
        .preprocess( ( value ) => ( value ? Number( value ) : undefined ), z.number().int().min( 1 ).max( 100 ) )
        .optional(),
    cursor: z.string().optional(),
} );

const createMessageSchema = z.object( {
    content: z.string().min( 1 ).max( 2000 ),
    clientMessageId: z.string().min( 1 ).max( 64 ).optional(),
} );

export async function noteChatRoutes ( fastify : FastifyInstance ) {
    fastify.route( {
        method: "GET",
        url: "/api/notes/:noteId/chat/messages",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const paramsParse = noteParamsSchema.safeParse( request.params );
            if ( !paramsParse.success ) {
                reply.status( 400 ).send( { error: "invalid_note_id" } );
                return;
            }

            const queryParse = messagesQuerySchema.safeParse( request.query );
            if ( !queryParse.success ) {
                reply.status( 400 ).send( { error: "invalid_query" } );
                return;
            }

            const { noteId } = paramsParse.data;
            const access = await ensureNoteGroupAccess( noteId, request.user!.id );

            if ( "error" in access ) {
                const errorKey = access.error ?? "unknown_error";
                reply.status( getAccessErrorStatus( errorKey ) ).send( { error: errorKey } );
                return;
            }

            const limit = queryParse.data.limit ?? 50;
            let cursorDate : Date | undefined;

            if ( queryParse.data.cursor ) {
                const parsed = Date.parse( queryParse.data.cursor );
                if ( Number.isNaN( parsed ) ) {
                    reply.status( 400 ).send( { error: "invalid_cursor" } );
                    return;
                }
                cursorDate = new Date( parsed );
            }

            const filter : Record<string, unknown> = {
                noteId: access.noteId,
            };

            if ( cursorDate ) {
                filter.createdAt = { $lt: cursorDate };
            }

            const docs = await NoteChatMessageModel.find( filter )
                .sort( { createdAt: -1 } )
                .limit( limit + 1 )
                .exec();

            const hasMore = docs.length > limit;
            const sliced = hasMore ? docs.slice( 0, limit ) : docs;
            const nextCursor = hasMore
                ? sliced[ sliced.length - 1 ]?.createdAt.toISOString()
                : undefined;

            reply.send( {
                messages: sliced.reverse().map( ( doc ) => serializeNoteChatMessage( doc as NoteChatMessageDocument ) ),
                nextCursor,
                hasMore,
            } );
        },
    } );

    fastify.route( {
        method: "POST",
        url: "/api/notes/:noteId/chat/messages",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const paramsParse = noteParamsSchema.safeParse( request.params );
            if ( !paramsParse.success ) {
                reply.status( 400 ).send( { error: "invalid_note_id" } );
                return;
            }

            const bodyParse = createMessageSchema.safeParse( request.body );

            if ( !bodyParse.success ) {
                reply.status( 400 ).send( { error: "invalid_payload", details: bodyParse.error.flatten() } );
                return;
            }

            const { noteId } = paramsParse.data;
            const access = await ensureNoteGroupAccess( noteId, request.user!.id );

            if ( "error" in access ) {
                const errorKey = access.error ?? "unknown_error";
                reply.status( getAccessErrorStatus( errorKey ) ).send( { error: errorKey } );
                return;
            }

            const payload = bodyParse.data;

            try {
                const doc = await NoteChatMessageModel.create( {
                    noteId: access.noteId,
                    groupId: access.groupId,
                    userId: request.user!.id,
                    content: payload.content.trim(),
                    clientMessageId: payload.clientMessageId ?? null,
                } );

                reply.code( 201 ).send( serializeNoteChatMessage( doc as NoteChatMessageDocument ) );
            } catch ( error ) {
                fastify.log.error( { err: error }, "Failed to create note chat message" );
                reply.status( 500 ).send( { error: "chat_message_create_failed" } );
            }
        },
    } );
}
