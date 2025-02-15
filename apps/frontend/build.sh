#!/bin/bash

# Create necessary directories
mkdir -p dist extension/icons

# Build the project
npm run build

# Copy files to extension directory
cp -r dist/* extension/
cp manifest.json extension/

# Create temporary icon (we'll replace this with proper icons later)
convert -size 16x16 xc:white -fill "#646cff" -draw "circle 8,8 8,2" extension/icons/icon16.png
convert -size 48x48 xc:white -fill "#646cff" -draw "circle 24,24 24,6" extension/icons/icon48.png
convert -size 128x128 xc:white -fill "#646cff" -draw "circle 64,64 64,16" extension/icons/icon128.png

echo "Extension built in 'extension' directory"
echo "Now you can load it in Chrome by:"
echo "1. Go to chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked'"
echo "4. Select the 'extension' directory" 