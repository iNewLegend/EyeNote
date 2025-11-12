import { getBaseConfig } from "@eye-note/workspace/vite/config";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { config as loadEnv } from "dotenv";

loadEnv( { path: resolve( __dirname, "..", "..", ".env" ) } );

export default defineConfig( ( { mode } ) => {
    const isDev = mode === "development";
    const isContentScript = process.env.CONTENT_SCRIPT === "1";

    const commonConfig = {
        ... getBaseConfig( {} ),
        plugins: [ react() ],
        define: {
            // Force React to use its development build in dev mode to show full error messages instead of minified errors
            "process.env.NODE_ENV": JSON.stringify( isDev ? "development" : "production" ),
        },
        build: {
            minify: !isDev,
            sourcemap: true,
            outDir: "dist",
            emptyOutDir: false,
            copyPublicDir: true,
            assetsDir: "assets",
        },
    };

    if ( isContentScript ) {
        return {
            ...commonConfig,
            plugins: [
                ...commonConfig.plugins,
            ],
            build: {
                ...commonConfig.build,
                rollupOptions: {
                    input: resolve( __dirname, "src/core/content-script/content-script.tsx" ),
                    output: {
                        entryFileNames: "content.iife.js",
                        format: "iife",
                        extend: true,
                    },
                },
                target: "chrome102",
                modulePreload: false,
            },
            optimizeDeps: {
                include: [ "react", "react-dom" ],
                esbuildOptions: {
                    target: "chrome102",
                },
            },
        };
    }

    return {
        ...commonConfig,
        build: {
            ...commonConfig.build,
            rollupOptions: {
                input: {
                    popup: resolve( __dirname, "src/core/extension-popup/extension-popup-mount.tsx" ),
                    "background-script": resolve(
                        __dirname,
                        "src/core/background-script/background-script.ts"
                    ),
                },
                output: {
                    entryFileNames: "[name].js",
                    chunkFileNames: "chunks/[name].[hash].js",
                    assetFileNames: "assets/[name][extname]",
                },
            },
        },
        css: {
            modules: {
                localsConvention: "camelCase",
            },
        },
        optimizeDeps: {
            include: [ "react", "react-dom" ],
        },
        publicDir: "public",
        resolve: {
            alias: {
                "@": resolve( __dirname, "src" ),
            },
        },
        server: {
            watch: {
                ignored: [ "**/node_modules/**", "**/dist/**", "**/extension/**" ],
                usePolling: true,
                interval: 100,
            },
        },
    };
} );
