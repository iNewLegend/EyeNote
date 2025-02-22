import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
    const isDev = mode === "development";
    const isContentScript = process.env.CONTENT_SCRIPT === "1";

    const commonConfig = {
        plugins: [react()],
        build: {
            minify: !isDev,
            sourcemap: true,
            outDir: "dist",
            emptyOutDir: false,
            copyPublicDir: true,
            assetsDir: "assets",
        },
        define: {
            "process.env.NODE_ENV": JSON.stringify(mode),
        },
    };

    if (isContentScript) {
        return {
            ...commonConfig,
            build: {
                ...commonConfig.build,
                cssCodeSplit: false,
                write: true,
                rollupOptions: {
                    input: {
                        content: resolve(__dirname, "src/core/content-script/content-script.tsx"),
                    },
                    output: {
                        entryFileNames: "[name].iife.js",
                        assetFileNames: (assetInfo) => {
                            if (assetInfo.name === "style.css") return "style.css";
                            return "assets/[name][extname]";
                        },
                        format: "iife",
                        extend: true,
                        inlineDynamicImports: true,
                    },
                },
                target: "chrome102",
                modulePreload: false,
            },
            optimizeDeps: {
                include: ["react", "react-dom"],
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
                    popup: resolve(__dirname, "src/core/extension-popup/extension-popup.tsx"),
                    background: resolve(__dirname, "src/core/background-script/background.ts"),
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
            include: ["react", "react-dom"],
        },
        publicDir: "public",
        resolve: {
            alias: {
                "@": resolve(__dirname, "src"),
            },
        },
        server: {
            watch: {
                ignored: ["**/node_modules/**", "**/dist/**", "**/extension/**"],
                usePolling: true,
                interval: 100,
            },
        },
    };
});
