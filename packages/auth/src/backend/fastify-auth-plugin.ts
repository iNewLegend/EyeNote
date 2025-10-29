import fastifyPlugin from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { OAuth2Client } from "google-auth-library";

export interface AuthenticatedUser {
    id : string;
    email ?: string;
    name ?: string;
    picture ?: string;
    tokenClaims ?: Record<string, unknown>;
}

export interface FastifyAuthPluginOptions {
    googleClientId : string;
    disabled ?: boolean;
}

declare module "fastify" {
    interface FastifyRequest {
        user ?: AuthenticatedUser;
    }

    interface FastifyInstance {
        authenticate : ( request : FastifyRequest, reply : FastifyReply ) => Promise<void>;
    }
}

export function createFastifyAuthPlugin ( {
    googleClientId,
    disabled = false,
} : FastifyAuthPluginOptions ) {
    async function authConnector ( fastify : FastifyInstance ) {
        const googleClient = disabled
            ? null
            : new OAuth2Client( googleClientId );

        if ( disabled ) {
            fastify.log.warn(
                "Authentication is disabled. Configure GOOGLE_CLIENT_ID to enable real authentication."
            );
        }

        fastify.decorateRequest( "user", null );

        fastify.decorate( "authenticate", async ( request : FastifyRequest, reply : FastifyReply ) => {
            if ( disabled ) {
                fastify.log.error( "authenticate() invoked while auth is disabled." );
                reply.code( 503 ).send( { error: "authentication_disabled" } );
                return;
            }

            if ( !googleClientId ) {
                fastify.log.error( "Google client ID is not configured." );
                reply.code( 500 ).send( { error: "auth_configuration_error" } );
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
                    audience: googleClientId,
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

    return fastifyPlugin( authConnector );
}
