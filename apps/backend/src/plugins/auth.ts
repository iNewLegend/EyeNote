import fastifyPlugin from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { OAuth2Client } from "google-auth-library";
import { appConfig } from "../config";

export interface AuthenticatedUser {
    id : string;
    email ?: string;
    name ?: string;
    picture ?: string;
    tokenClaims ?: Record<string, unknown>;
}

declare module "fastify" {
    interface FastifyRequest {
        user ?: AuthenticatedUser;
    }

    interface FastifyInstance {
        authenticate : ( request : FastifyRequest, reply : FastifyReply ) => Promise<void>;
    }
}

async function authConnector ( fastify : FastifyInstance ) {
    const googleClient = appConfig.auth.disabled
        ? null
        : new OAuth2Client( appConfig.auth.googleClientId );

    if ( appConfig.auth.disabled ) {
        fastify.log.warn( "Authentication is disabled. DO NOT use this mode in production." );
    }

    fastify.decorateRequest( "user", null );

    fastify.decorate( "authenticate", async ( request : FastifyRequest, reply : FastifyReply ) => {
        if ( appConfig.auth.disabled ) {
            const mockUserId = ( request.headers[ "x-mock-user-id" ] as string ) ?? "dev-user";
            const mockEmail = request.headers[ "x-mock-user-email" ] as string | undefined;

            request.user = {
                id: mockUserId,
                email: mockEmail,
                name: mockUserId,
            };
            return;
        }

        const authorizationHeader = request.headers.authorization;

        if ( !authorizationHeader || !authorizationHeader.startsWith( "Bearer " ) ) {
            reply.code( 401 ).send( { error: "missing_authorization_header" } );
            return;
        }

        const idToken = authorizationHeader.slice( "Bearer ".length );

        try {
            const ticket = await googleClient!.verifyIdToken( {
                idToken,
                audience: appConfig.auth.googleClientId,
            } );

            const payload = ticket.getPayload();

            if ( !payload || !payload.sub ) {
                reply.code( 401 ).send( { error: "invalid_token_payload" } );
                return;
            }

            request.user = {
                id: payload.sub,
                email: payload.email ?? undefined,
                name: payload.name ?? undefined,
                picture: payload.picture ?? undefined,
                tokenClaims: { ...payload } as Record<string, unknown>,
            };
        } catch ( error ) {
            fastify.log.error( { err: error }, "Failed to verify Google ID token" );
            reply.code( 401 ).send( { error: "token_verification_failed" } );
        }
    } );
}

export const authPlugin = fastifyPlugin( authConnector );
