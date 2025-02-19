import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Custom plugin for IDE integration
const ideIntegrationPlugin = () => ({
    name: "ide-integration",
    configureServer(server) {
        server.watcher.on("change", (path) => {
            console.log(`[IDE] File changed: ${path}`);
        });

        server.watcher.on("add", (path) => {
            console.log(`[IDE] File added: ${path}`);
        });

        server.watcher.on("unlink", (path) => {
            console.log(`[IDE] File deleted: ${path}`);
        });
    },
});

export default defineConfig(({ mode }) => {
    const isDev = mode === "development";
    const isContentScript = process.env.CONTENT_SCRIPT === "1";

    const commonConfig = {
        plugins: [react(), ideIntegrationPlugin()],
        build: {
            minify: !isDev,
            sourcemap: true,
            outDir: "dist",
            emptyOutDir: !isContentScript,
            watch: null, // Remove watch config to prevent hanging
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
