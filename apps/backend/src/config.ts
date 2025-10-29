import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const rootEnvPath = path.resolve( __dirname, "../../..", ".env" );

if ( existsSync( rootEnvPath ) ) {
    loadEnv( { path: rootEnvPath } );
} else {
    loadEnv();
}

const envSchema = z.object( {
    NODE_ENV: z.string().optional(),
    PORT: z.coerce.number().default( 3001 ),
    HOST: z.string().default( "0.0.0.0" ),
    MONGODB_URI: z
        .string()
        .default( "mongodb://localhost:27017" ),
    MONGODB_DB_NAME: z.string().default( "eye-note" ),
    GOOGLE_CLIENT_ID: z.string().optional(),
    AUTH_DISABLED: z
        .enum( [ "true", "false" ] )
        .optional(),
} );

const env = envSchema.parse( {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.BACKEND_PORT,
    HOST: process.env.BACKEND_HOST,
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    AUTH_DISABLED: process.env.AUTH_DISABLED,
} );

const isAuthDisabled = env.AUTH_DISABLED === "true" || !env.GOOGLE_CLIENT_ID;

export const appConfig = {
    env: env.NODE_ENV ?? "development",
    host: env.HOST,
    port: env.PORT,
    mongo: {
        uri: env.MONGODB_URI,
        dbName: env.MONGODB_DB_NAME,
    },
    auth: {
        disabled: isAuthDisabled,
        googleClientId: env.GOOGLE_CLIENT_ID ?? "",
    },
};

export type AppConfig = typeof appConfig;
