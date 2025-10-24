import Fastify from "fastify";
import cors from "@fastify/cors";
import { appConfig } from "./config";
import { mongoPlugin } from "./plugins/mongo";
import { authPlugin } from "./plugins/auth";
import { notesRoutes } from "./routes/notes";
import { healthRoutes } from "./routes/health";

export async function buildServer () {
    const fastify = Fastify( {
        logger: {
            transport: appConfig.env === "development"
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
    await fastify.register( authPlugin );
    await fastify.register( healthRoutes );
    await fastify.register( notesRoutes );

    return fastify;
}

async function start () {
    const server = await buildServer();

    try {
        await server.listen( {
            port: appConfig.port,
            host: appConfig.host,
        } );
        server.log.info( `EyeNote backend listening on ${ appConfig.host }:${ appConfig.port }` );
    } catch ( error ) {
        server.log.error( error, "Failed to start backend" );
        process.exit( 1 );
    }
}

if ( require.main === module ) {
    void start();
}
