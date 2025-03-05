import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const extensionDir = path.join(rootDir, "extension");
const iconsDir = path.join(extensionDir, "icons");
const assetsDir = path.join(extensionDir, "assets");
const chunksDir = path.join(extensionDir, "chunks");

async function ensureDirectoryExists(dir) {
    try {
        await fs.access(dir);
        // Instead of removing the directory, just ensure it exists
        return;
    } catch (err) {
        // Directory doesn't exist, create it
        await fs.mkdir(dir, { recursive: true });
    }
}

// Function to safely clean a directory without removing it
async function cleanDirectory(dir) {
    try {
        await fs.access(dir);
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            try {
                if (entry.isDirectory()) {
                    await fs.rm(fullPath, { recursive: true, force: true });
                } else {
                    await fs.unlink(fullPath);
                }
            } catch (err) {
                console.warn(`Warning: Could not remove ${fullPath}:`, err.message);
            }
        }
    } catch (err) {
        // Directory doesn't exist, that's fine
        await fs.mkdir(dir, { recursive: true });
    }
}

async function copyFileWithRetry(src, dest, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await fs.mkdir(path.dirname(dest), { recursive: true });
            await fs.copyFile(src, dest);
            console.log(`Copied ${path.basename(src)} to ${path.relative(rootDir, dest)}`);
            return;
        } catch (err) {
            if (err.code === "ENOENT" && attempt < maxRetries) {
                console.log(`Retry ${attempt}/${maxRetries} for ${path.basename(src)}: waiting ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else if (attempt === maxRetries) {
                if (err.code === "ENOENT") {
                    console.log(`Skipping ${path.basename(src)}: File not found after ${maxRetries} attempts`);
                } else {
                    console.error(`Error copying ${src}: ${err.message}`);
                }
            }
        }
    }
}

async function copyDirectoryWithRetry(src, dest, maxRetries = 3) {
    try {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                await copyDirectoryWithRetry(srcPath, destPath, maxRetries);
            } else {
                await copyFileWithRetry(srcPath, destPath, maxRetries);
            }
        }
        console.log(`Copied directory ${path.basename(src)} to extension/`);
    } catch (err) {
        if (err.code === "ENOENT") {
            console.log(`Skipping directory ${path.basename(src)}: Directory not found`);
        } else {
            console.error(`Error copying directory ${src}: ${err.message}`);
        }
    }
}

async function getBuildHash() {
    try {
        // Get hash from key files that represent the build state
        const files = [
            path.join(distDir, "content.iife.js"),
            path.join(distDir, "background-script.js"),
            path.join(distDir, "popup.js")
        ];

        let contentHash = '';
        for (const file of files) {
            try {
                const content = await fs.readFile(file);
                contentHash += content.length.toString(); // Simple but effective for detecting changes
            } catch (err) {
                console.warn(`Warning: Could not read ${file} for build hash`);
            }
        }

        return contentHash || Date.now().toString();
    } catch (error) {
        return Date.now().toString();
    }
}

async function prepareExtension() {
    try {
        // First ensure all directories exist
        await ensureDirectoryExists(extensionDir);
        await ensureDirectoryExists(iconsDir);
        await ensureDirectoryExists(assetsDir);
        await ensureDirectoryExists(chunksDir);

        // Then clean them safely
        await cleanDirectory(iconsDir);
        await cleanDirectory(assetsDir);
        await cleanDirectory(chunksDir);

        // Convert and copy icons from icon.svg
        const sourceIcon = path.join(rootDir, "public", "icons", "icon.svg");
        const sizes = [16, 48, 128];

        try {
            const svgBuffer = await fs.readFile(sourceIcon);
            
            // Process icons sequentially instead of in parallel
            for (const size of sizes) {
                try {
                    await sharp(svgBuffer)
                        .resize(size, size)
                        .png()
                        .toFile(path.join(iconsDir, `icon${size}.png`));
                    console.log(`Created icon${size}.png from icon.svg`);
                } catch (iconError) {
                    console.error(`Error creating icon${size}.png:`, iconError);
                    // Continue with other sizes even if one fails
                }
            }

            // Add a small delay before generating cursor to ensure directory is ready
            await new Promise(resolve => setTimeout(resolve, 100));

            // Generate cursor image
            await sharp(
                Buffer.from(`<svg width="16" height="16" viewBox="0 0 16 16">
                    <defs>
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur"/>
                            <feColorMatrix in="blur" type="matrix" values="
                                1 0 0 0 0.282
                                0 1 0 0 0.016
                                0 0 1 0 0.678
                                0 0 0 1 0
                            " result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>
                    <circle cx="8" cy="8" r="4" fill="#4804ad" filter="url(#glow)"/>
                </svg>`)
            )
                .resize(10, 10, {
                    kernel: sharp.kernel.lanczos3,
                    fit: "contain",
                    position: "center",
                    background: { r: 0, g: 0, b: 0, alpha: 0 },
                })
                .extend({
                    top: 1,
                    bottom: 1,
                    left: 1,
                    right: 1,
                    background: { r: 0, g: 0, b: 0, alpha: 0 },
                })
                .png()
                .toFile(path.join(extensionDir, "cursor.png"));
            console.log("Created cursor.png");
        } catch (error) {
            console.error("Error processing icons:", error);
            // Continue with the rest of the process even if icon generation fails
        }

        // Copy manifest.json
        const manifestPath = path.join(extensionDir, "manifest.json");
        const manifest = JSON.parse(await fs.readFile(path.join(rootDir, "manifest.json"), 'utf-8'));
        
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 4));
        console.log("Updated manifest.json");

        // Copy content script and styles
        await copyFileWithRetry(
            path.join(distDir, "content.iife.js"),
            path.join(extensionDir, "content.iife.js")
        );

        // Copy background script
        const backgroundScriptPath = path.join(distDir, "background-script.js");
        let backgroundContent = await fs.readFile(backgroundScriptPath, 'utf-8');
        
        await fs.writeFile(path.join(extensionDir, "background-script.js"), backgroundContent);
        console.log("Modified and copied background-script.js");

        // Copy background script map if it exists
        try {
            await copyFileWithRetry(
                path.join(distDir, "background-script.js.map"),
                path.join(extensionDir, "background-script.js.map")
            );
        } catch (error) {
            console.log("No source map for background script");
        }

        // Copy dist directory contents using retry mechanism
        const distEntries = await fs.readdir(distDir, { withFileTypes: true });
        for (const entry of distEntries) {
            const srcPath = path.join(distDir, entry.name);
            const destPath = path.join(extensionDir, entry.name);

            if (entry.isDirectory()) {
                await copyDirectoryWithRetry(srcPath, destPath);
            } else {
                // For index.html, copy it as popup.html
                if (entry.name === "index.html") {
                    await copyFileWithRetry(srcPath, path.join(extensionDir, "popup.html"));
                }
                // Skip files we've already copied
                else if (
                    ![
                        "content.iife.js",
                        "content-script.css",
                        "background-script.js",
                        "background-script.js.map",
                    ].includes(entry.name)
                ) {
                    await copyFileWithRetry(srcPath, destPath);
                }
            }
        }

        // Copy popup.html from src to extension
        await copyFileWithRetry(
            path.join(rootDir, "src", "popup.html"),
            path.join(extensionDir, "popup.html")
        );

        console.log("Extension files prepared successfully!");

        // Create or update build info file
        const buildInfoPath = path.join(extensionDir, "build-info.json");
        const buildInfo = {
            timestamp: Date.now(),
            version: manifest.version,
            buildId: await getBuildHash()
        };

        // Only write if file doesn't exist or build has changed
        let shouldWrite = true;
        try {
            const existingContent = await fs.readFile(buildInfoPath, 'utf-8');
            const existing = JSON.parse(existingContent);
            shouldWrite = existing.buildId !== buildInfo.buildId;
        } catch (error) {
            // File doesn't exist, we should write
        }

        if (shouldWrite) {
            await fs.writeFile(buildInfoPath, JSON.stringify(buildInfo, null, 2));
            console.log("Updated build-info.json");
        }

    } catch (err) {
        console.error("Error preparing extension:", err);
        process.exit(1);
    }
}

prepareExtension();
