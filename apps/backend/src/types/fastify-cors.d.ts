declare module "@fastify/cors" {
    import type { FastifyPluginCallback } from "fastify";

    type FastifyCors = FastifyPluginCallback<{
        origin ?: boolean | string | RegExp | ( string | RegExp )[] | ( ( origin : string, cb : ( err : Error | null, allow : boolean ) => void ) => void );
        credentials ?: boolean;
        methods ?: string | string[];
        allowedHeaders ?: string | string[];
        exposedHeaders ?: string | string[];
        maxAge ?: number;
        preflightContinue ?: boolean;
        optionsSuccessStatus ?: number;
    }>;

    const fastifyCors : FastifyCors;
    export default fastifyCors;
}
