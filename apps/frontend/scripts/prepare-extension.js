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
const cursorsDir = path.join(extensionDir, 'cursors');

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
    await fs.mkdir(cursorsDir, { recursive: true });

    // Create icons directory if it doesn't exist
    await fs.mkdir(iconsDir, { recursive: true });

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
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(path.join(extensionDir, 'cursor.png'));
      console.log('Created cursor.png');

    } catch (error) {
      console.error('Error processing icons:', error);
      throw error;
    }

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
        // For index.html, copy it directly as popup.html
        if (file === 'index.html') {
          await copyFile(srcPath, path.join(extensionDir, 'popup.html'));
        } else {
          await copyFile(srcPath, destPath);
        }
      }
    }

    // Extract CSS from content.iife.js and save as style.css
    const contentScriptPath = path.join(extensionDir, 'content.iife.js');
    const contentScript = await fs.readFile(contentScriptPath, 'utf-8');
    const cssMatch = contentScript.match(/var style = document\.createElement\('style'\);[\s\S]*?style\.textContent = `([\s\S]*?)`;/);
    if (cssMatch && cssMatch[1]) {
      let cssContent = cssMatch[1];
      // Replace the cursor placeholder with the base64 data
      cssContent = cssContent.replace(
        /url\("CURSOR_PLACEHOLDER"\)/g,
        `url("data:image/png;base64,${base64Cursor}")`
      );
      await fs.writeFile(path.join(extensionDir, 'style.css'), cssContent);
      console.log('Created style.css with base64 cursor');
    }

    console.log('Extension files prepared successfully!');
  } catch (err) {
    console.error('Error preparing extension:', err);
    process.exit(1);
  }
}

prepareExtension(); 