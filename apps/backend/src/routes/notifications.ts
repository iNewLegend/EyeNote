import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { NotificationModel, type NotificationDocument } from "../models/notification";
import { serializeNotification } from "@eye-note/backend-models";

const listQuerySchema = z.object( {
    limit: z
        .preprocess( ( value ) => ( value ? Number( value ) : undefined ), z.number().int().min( 1 ).max( 100 ) )
        .optional(),
    cursor: z.string().optional(),
} );

const notificationParamsSchema = z.object( {
    notificationId: z.string().min( 1 ),
} );

export async function notificationsRoutes ( fastify : FastifyInstance ) {
    fastify.route( {
        method: "GET",
        url: "/api/notifications",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const queryParse = listQuerySchema.safeParse( request.query );
            if ( !queryParse.success ) {
                reply.status( 400 ).send( { error: "invalid_query" } );
                return;
            }

            const limit = queryParse.data.limit ?? 20;
            const userId = request.user!.id;
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
                userId,
            };

            if ( cursorDate ) {
                filter.createdAt = { $lt: cursorDate };
            }

            const docs = await NotificationModel.find( filter )
                .sort( { createdAt: -1 } )
                .limit( limit + 1 )
                .exec();

            const hasMore = docs.length > limit;
            const sliced = hasMore ? docs.slice( 0, limit ) : docs;
            const nextCursor = hasMore
                ? sliced[ sliced.length - 1 ]?.createdAt.toISOString()
                : undefined;

            const unreadCount = await NotificationModel.countDocuments( {
                userId,
                readAt: null,
            } ).exec();

            reply.send( {
                notifications: sliced.map( ( doc : NotificationDocument ) => serializeNotification( doc ) ),
                nextCursor,
                hasMore,
                unreadCount,
            } );
        },
    } );

    fastify.route( {
        method: "POST",
        url: "/api/notifications/:notificationId/read",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const paramsParse = notificationParamsSchema.safeParse( request.params );
            if ( !paramsParse.success ) {
                reply.status( 400 ).send( { error: "invalid_notification_id" } );
                return;
            }

            const { notificationId } = paramsParse.data;
            const userId = request.user!.id;

            const doc = await NotificationModel.findOneAndUpdate(
                {
                    _id: notificationId,
                    userId,
                },
                {
                    $set: { readAt: new Date() },
                },
                {
                    new: true,
                    timestamps: true,
                }
            ).exec();

            if ( !doc ) {
                reply.status( 404 ).send( { error: "notification_not_found" } );
                return;
            }

            reply.send( serializeNotification( doc as NotificationDocument ) );
        },
    } );

    fastify.route( {
        method: "POST",
        url: "/api/notifications/read-all",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const userId = request.user!.id;
            const result = await NotificationModel.updateMany( { userId, readAt: null }, { $set: { readAt: new Date() } } ).exec();
            reply.send( { updated: result.modifiedCount ?? 0 } );
        },
    } );
}
