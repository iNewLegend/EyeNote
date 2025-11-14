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
    REALTIME_JWT_SECRET: z.string().min( 16 ).default( "dev-realtime-secret-change-me" ),
    REALTIME_JWT_TTL_SECONDS: z
        .preprocess( ( value ) => ( value ? Number( value ) : undefined ), z.number().int().min( 60 ).max( 86400 ) )
        .default( 600 ),
    REALTIME_BASE_URL: z.string().default( "http://localhost:3010" ),
} );

const env = envSchema.parse( {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.BACKEND_PORT,
    HOST: process.env.BACKEND_HOST,
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    AUTH_DISABLED: process.env.AUTH_DISABLED,
    REALTIME_JWT_SECRET: process.env.REALTIME_JWT_SECRET,
    REALTIME_JWT_TTL_SECONDS: process.env.REALTIME_JWT_TTL_SECONDS,
    REALTIME_BASE_URL: process.env.REALTIME_BASE_URL,
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
    realtime: {
        jwtSecret: env.REALTIME_JWT_SECRET,
        tokenTtlSeconds: env.REALTIME_JWT_TTL_SECONDS,
        baseUrl: env.REALTIME_BASE_URL.replace(/\/$/, ""),
    },
};

export type AppConfig = typeof appConfig;
