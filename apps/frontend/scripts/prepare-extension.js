import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const extensionDir = path.join(rootDir, 'extension');
const iconsDir = path.join(extensionDir, 'icons');
const assetsDir = path.join(extensionDir, 'assets');
const chunksDir = path.join(extensionDir, 'chunks');

async function ensureDirectoryExists(dir) {
  try {
    await fs.access(dir);
    // If directory exists, remove it and its contents
    await fs.rm(dir, { recursive: true, force: true });
  } catch (err) {
    // Directory doesn't exist, that's fine
  }
  await fs.mkdir(dir, { recursive: true });
}

async function copyFile(src, dest) {
  try {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
    console.log(`Copied ${path.basename(src)} to ${path.relative(rootDir, dest)}`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`Skipping ${path.basename(src)}: File not found`);
    } else {
      console.error(`Error copying ${src}: ${err.message}`);
    }
  }
}

async function copyDirectory(src, dest) {
  try {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await copyDirectory(srcPath, destPath);
      } else {
        await copyFile(srcPath, destPath);
      }
    }
    console.log(`Copied directory ${path.basename(src)} to extension/`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`Skipping directory ${path.basename(src)}: Directory not found`);
    } else {
      console.error(`Error copying directory ${src}: ${err.message}`);
    }
  }
}

async function prepareExtension() {
  try {
    // Ensure extension directory exists and is clean
    await ensureDirectoryExists(extensionDir);
    await ensureDirectoryExists(iconsDir);
    await ensureDirectoryExists(assetsDir);
    await ensureDirectoryExists(chunksDir);

    // Convert and copy icons from icon.svg
    const sourceIcon = path.join(rootDir, 'public', 'icons', 'icon.svg');
    const sizes = [16, 48, 128];
    
    try {
      const svgBuffer = await fs.readFile(sourceIcon);
      await Promise.all(
        sizes.map(async (size) => {
          await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(path.join(iconsDir, `icon${size}.png`));
          console.log(`Created icon${size}.png from icon.svg`);
        })
      );

      // Generate cursor image
      await sharp(svgBuffer)
        .resize(12, 12, {
          kernel: sharp.kernel.lanczos3,
          fit: 'contain',
          position: 'center',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(path.join(extensionDir, 'cursor.png'));
      console.log('Created cursor.png');

    } catch (error) {
      console.error('Error processing icons:', error);
    }

    // Copy manifest.json
    await copyFile(
      path.join(rootDir, 'manifest.json'),
      path.join(extensionDir, 'manifest.json')
    );

    // Copy content script and styles
    await copyFile(
      path.join(distDir, 'content.iife.js'),
      path.join(extensionDir, 'content.iife.js')
    );

    await copyFile(
      path.join(distDir, 'style.css'),
      path.join(extensionDir, 'style.css')
    );

    // Copy background script
    await copyFile(
      path.join(distDir, 'background.js'),
      path.join(extensionDir, 'background.js')
    );

    // Copy background script map if it exists
    try {
      await copyFile(
        path.join(distDir, 'background.js.map'),
        path.join(extensionDir, 'background.js.map')
      );
    } catch (error) {
      console.log('No source map for background script');
    }

    // Copy dist directory contents
    const distEntries = await fs.readdir(distDir, { withFileTypes: true });
    for (const entry of distEntries) {
      const srcPath = path.join(distDir, entry.name);
      const destPath = path.join(extensionDir, entry.name);
      
      if (entry.isDirectory()) {
        await copyDirectory(srcPath, destPath);
      } else {
        // For index.html, copy it as popup.html
        if (entry.name === 'index.html') {
          await copyFile(srcPath, path.join(extensionDir, 'popup.html'));
        } 
        // Skip files we've already copied
        else if (!['content.iife.js', 'style.css', 'background.js', 'background.js.map'].includes(entry.name)) {
          await copyFile(srcPath, destPath);
        }
      }
    }

    console.log('Extension files prepared successfully!');
  } catch (err) {
    console.error('Error preparing extension:', err);
    process.exit(1);
  }
}

prepareExtension(); 