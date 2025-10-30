import type { FastifyInstance } from "fastify";

export async function healthRoutes ( fastify : FastifyInstance ) {
    // Quieter health endpoint: lower log level to avoid request noise in dev
    fastify.get( "/healthz", { logLevel: "warn" }, async () => ( {
        status: "ok",
        timestamp: new Date().toISOString(),
    } ) );
}
