import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";

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

// Build content script separately
const contentScriptBuild = defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/content-script.tsx"),
      name: "content",
      fileName: () => "content.iife.js",
      formats: ["iife"],
    },
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      external: [],
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": JSON.stringify({}),
  },
  plugins: [react()],
});

// Main extension build
const mainBuild = defineConfig({
  plugins: [react(), ideIntegrationPlugin()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "index.html"),
        background: resolve(__dirname, "src/background-script.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name].[hash].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    assetsDir: "assets",
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": JSON.stringify({}),
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
});

export default process.env.CONTENT_SCRIPT ? contentScriptBuild : mainBuild;
