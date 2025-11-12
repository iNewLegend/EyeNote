import type { LiveConfig } from "./config";

declare module "fastify" {
    interface FastifyInstance {
        liveConfig : LiveConfig;
    }
}
