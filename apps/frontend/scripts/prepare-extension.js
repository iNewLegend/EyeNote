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

async function copyFile(src, dest) {
  try {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
    console.log(`Copied ${path.basename(src)} to ${path.relative(rootDir, dest)}`);
  } catch (err) {
    console.error(`Error copying ${src}: ${err.message}`);
  }
}

async function prepareExtension() {
  try {
    // Ensure extension directory exists and is clean
    await fs.rm(extensionDir, { recursive: true, force: true });
    await fs.mkdir(extensionDir, { recursive: true });
    await fs.mkdir(assetsDir, { recursive: true });

    // Create icons directory if it doesn't exist
    await fs.mkdir(iconsDir, { recursive: true });

    // Convert and copy icons
    const sizes = [16, 48, 128];
    await Promise.all(
      sizes.map(async (size) => {
        const svgPath = path.join(rootDir, 'public', 'icons', `icon${size}.svg`);
        const svgBuffer = await fs.readFile(svgPath);
        await sharp(svgBuffer)
          .png()
          .toFile(path.join(iconsDir, `icon${size}.png`));
      })
    );

    // Copy manifest
    await copyFile(
      path.join(rootDir, 'manifest.json'),
      path.join(extensionDir, 'manifest.json')
    );

    // Copy assets from dist
    const distFiles = await fs.readdir(distDir);
    for (const file of distFiles) {
      const srcPath = path.join(distDir, file);
      const destPath = path.join(extensionDir, file);
      
      const stat = await fs.stat(srcPath);
      if (stat.isDirectory()) {
        // Copy directory recursively
        await fs.cp(srcPath, destPath, { recursive: true });
        console.log(`Copied directory ${file} to extension/`);
      } else {
        await copyFile(srcPath, destPath);
      }
    }

    console.log('Extension files prepared successfully!');
  } catch (err) {
    console.error('Error preparing extension:', err);
    process.exit(1);
  }
}

prepareExtension(); 