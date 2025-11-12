import Fastify from "fastify";
import cors from "@fastify/cors";
import { liveConfig } from "./config";
import { mongoPlugin } from "./plugins/mongo";
import { healthRoutes } from "./routes/health";
import { registerRealtimeGateway } from "./realtime/gateway";

export async function buildLiveServer () {
    const fastify = Fastify( {
        logger: {
            transport: liveConfig.env === "development"
                ? {
                    target: "pino-pretty",
                    options: {
                        translateTime: "SYS:standard",
                        ignore: "pid,hostname",
                    },
                }
                : undefined,
        },
    } );

    await fastify.register( cors, {
        origin: true,
        credentials: true,
    } );

    await fastify.register( mongoPlugin );
    await fastify.register( healthRoutes );
    await registerRealtimeGateway( fastify );

    return fastify;
}

async function start () {
    const server = await buildLiveServer();

    try {
        await server.listen( {
            port: liveConfig.port,
            host: liveConfig.host,
        } );
        server.log.info( `EyeNote live service listening on ${ liveConfig.host }:${ liveConfig.port }` );
    } catch ( error ) {
        server.log.error( error, "Failed to start live service" );
        process.exit( 1 );
    }
}

const executedViaCli = process.argv[1]
    ? new URL( process.argv[1], `file://${ process.cwd() }/` ).href === import.meta.url
    : false;

if ( executedViaCli ) {
    void start();
}
