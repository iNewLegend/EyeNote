import type { FastifyInstance } from "fastify";

export async function healthRoutes ( fastify : FastifyInstance ) {
    fastify.get( "/healthz", async () => ( {
        status: "ok",
        timestamp: new Date().toISOString(),
    } ) );
}
