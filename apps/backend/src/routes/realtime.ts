import type { FastifyInstance } from "fastify";
import { z } from "zod";
import jwt from "jsonwebtoken";
import type { RealtimeTokenResponse } from "@eye-note/definitions";
import { GroupModel } from "../models/group";
import { appConfig } from "../config";

const realtimeTokenSchema = z.object( {
    activeGroupIds: z.array( z.string().min( 1 ) ).max( 50 ).optional(),
} );

export async function realtimeRoutes ( fastify : FastifyInstance ) {
    fastify.route( {
        method: "POST",
        url: "/api/realtime/token",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            if ( !appConfig.realtime.jwtSecret ) {
                reply.status( 500 ).send( { error: "realtime_not_configured" } );
                return;
            }

            const bodyParse = realtimeTokenSchema.safeParse( request.body ?? {} );

            if ( !bodyParse.success ) {
                reply.status( 400 ).send( { error: "invalid_payload", details: bodyParse.error.flatten() } );
                return;
            }

            const userId = request.user!.id;

            const membership = await GroupModel.find( { memberIds: userId } )
                .select( [ "_id" ] )
                .lean()
                .exec();

            const memberGroupIds = membership.map( ( doc ) => {
                const rawId = doc._id as { toHexString ?: () => string };
                return typeof rawId?.toHexString === "function" ? rawId.toHexString() : String( doc._id );
            } );

            const requested = bodyParse.data.activeGroupIds;
            const filteredGroupIds = requested
                ? requested.filter( ( id ) => memberGroupIds.includes( id ) )
                : memberGroupIds;

            const payload = {
                userId,
                groupIds: filteredGroupIds,
            };

            const token = jwt.sign( payload, appConfig.realtime.jwtSecret, {
                expiresIn: appConfig.realtime.tokenTtlSeconds,
            } );

            const expiresAt = new Date( Date.now() + appConfig.realtime.tokenTtlSeconds * 1000 ).toISOString();

            const response : RealtimeTokenResponse = {
                token,
                expiresAt,
            };

            reply.send( response );
        },
    } );
}
