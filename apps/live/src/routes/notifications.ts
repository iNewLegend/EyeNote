import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { NotificationRecord } from "@eye-note/definitions";

const broadcastSchema = z.object( {
    notifications: z.array( z.object( {
        id: z.string(),
        userId: z.string(),
        type: z.string(),
    } ).passthrough() ).min( 1 ),
} );

export async function notificationRoutes ( fastify : FastifyInstance ) {
    fastify.route( {
        method: "POST",
        url: "/internal/notifications/broadcast",
        handler: async ( request, reply ) => {
            if ( request.headers["x-realtime-secret"] !== fastify.liveConfig.realtime.jwtSecret ) {
                reply.status( 401 ).send( { error: "unauthorized" } );
                return;
            }

            const parse = broadcastSchema.safeParse( request.body );
            if ( !parse.success ) {
                reply.status( 400 ).send( { error: "invalid_payload" } );
                return;
            }

            const payload = parse.data;
            const io = ( fastify as FastifyInstance & { io : import("socket.io").Server } ).io;

            const notifications = payload.notifications as unknown as NotificationRecord[];

            notifications.forEach( ( notification ) => {
                io.to( `user:${ notification.userId }` ).emit( "notification", notification );
            } );

            reply.status( 204 ).send();
        },
    } );
}
