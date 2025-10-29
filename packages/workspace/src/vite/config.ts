import { fileURLToPath } from "node:url";
import { resolve } from "path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vite";

type TReturn = ReturnType<typeof defineConfig>;

const currentPath = fileURLToPath( import.meta.url )

loadEnv( { path: resolve( currentPath, "..", "..", ".env" ) } );

export function getBaseConfig ( { hostEnvPrefix } : { hostEnvPrefix ?: string } ) : TReturn {
    const googleClientId =
        process.env.GOOGLE_CLIENT_ID ?? process.env.VITE_GOOGLE_CLIENT_ID ?? "";
    const googleRedirectUri =
        process.env.GOOGLE_REDIRECT_URI ?? process.env.VITE_GOOGLE_REDIRECT_URI ?? "";

    if ( !googleClientId ) {
        console.warn(
            "[EyeNote] GOOGLE_CLIENT_ID is not set. OAuth flows in the dashboard will fail until configured."
        );
    }

    if ( !googleRedirectUri ) {
        console.warn(
            "[EyeNote] GOOGLE_REDIRECT_URI is not set. Falling back to window.origin during OAuth, which must match an allowed redirect URI."
        );
    }

    const reuslt = {
        define: {
            "process.env.NODE_ENV": JSON.stringify( process.env.NODE_ENV ?? "development" ),
            "import.meta.env.VITE_GOOGLE_CLIENT_ID": JSON.stringify( googleClientId ),
            "import.meta.env.VITE_GOOGLE_REDIRECT_URI": JSON.stringify( googleRedirectUri ),
        },
    };

    if ( hostEnvPrefix ) {
        const host = process.env[ `${ hostEnvPrefix }_HOST` ] ?? "localhost",
            port = Number.parseInt( process.env[ `${ hostEnvPrefix }_PORT` ] ?? "5173", 10 );

        return {
            ... reuslt,
            server: {
                host,
                port,
            },
        };
    }

    return reuslt;
}
