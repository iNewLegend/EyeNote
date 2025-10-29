import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { config as loadEnv } from "dotenv";

loadEnv( { path: resolve( __dirname, "..", "..", ".env" ) } );

export default defineConfig( () => {
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

    const appPort = Number.parseInt( process.env.APP_PORT ?? "5173", 10 );

    return {
        plugins: [ react() ],
        define: {
            "process.env.NODE_ENV": JSON.stringify( process.env.NODE_ENV ?? "development" ),
            "import.meta.env.VITE_GOOGLE_CLIENT_ID": JSON.stringify( googleClientId ),
            "import.meta.env.VITE_GOOGLE_REDIRECT_URI": JSON.stringify( googleRedirectUri ),
        },
        server: {
            port: Number( appPort )
        },
    };
} );
