import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const dirname = typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname( fileURLToPath( import.meta.url ) );

const rootEnvPath = path.resolve( dirname, "../../..", ".env" );

if ( existsSync( rootEnvPath ) ) {
    loadEnv( { path: rootEnvPath } );
} else {
    loadEnv();
}

const envSchema = z.object( {
    NODE_ENV: z.string().optional(),
    PORT: z.coerce.number().default( 3010 ),
    HOST: z.string().default( "0.0.0.0" ),
    MONGODB_URI: z.string().default( "mongodb://localhost:27017" ),
    MONGODB_DB_NAME: z.string().default( "eye-note" ),
    REALTIME_JWT_SECRET: z.string().min( 16 ),
} );

const env = envSchema.parse( {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.LIVE_PORT,
    HOST: process.env.LIVE_HOST,
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
    REALTIME_JWT_SECRET: process.env.REALTIME_JWT_SECRET,
} );

export const liveConfig = {
    env: env.NODE_ENV ?? "development",
    host: env.HOST,
    port: env.PORT,
    mongo: {
        uri: env.MONGODB_URI,
        dbName: env.MONGODB_DB_NAME,
    },
    realtime: {
        jwtSecret: env.REALTIME_JWT_SECRET,
    },
};

export type LiveConfig = typeof liveConfig;
