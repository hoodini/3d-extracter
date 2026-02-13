# 🎨 3D Model Extractor Chrome Extension

A Chrome extension that detects and downloads GLB/GLTF 3D model files from any website that serves 3D models.

## Features

- **Automatic Detection**: Monitors network requests for GLB/GLTF files
- **Page Scanning**: Searches page content for 3D model URLs
- **Easy Download**: One-click download with save dialog
- **URL Copying**: Copy model URLs to clipboard
- **Real-time Updates**: Auto-refreshes detected models
- **Badge Counter**: Shows number of detected models on extension icon

## Installation

### Method 1: Load Unpacked Extension (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right corner)
3. Click "Load unpacked"
4. Select this folder (`3d-extracter`)
5. The extension icon should appear in your toolbar

### Method 2: Create PNG Icons (Optional but Recommended)

The extension includes an SVG icon template. To create proper PNG icons:

**Using Online Tools:**
1. Go to [CloudConvert](https://cloudconvert.com/svg-to-png) or similar
2. Upload `icons/icon.svg`
3. Convert to PNG at these sizes:
   - 16x16 pixels → save as `icon16.png`
   - 48x48 pixels → save as `icon48.png`
   - 128x128 pixels → save as `icon128.png`
4. Save all three files in the `icons/` folder

**Using ImageMagick (Command Line):**
```bash
convert -background none -resize 16x16 icons/icon.svg icons/icon16.png
convert -background none -resize 48x48 icons/icon.svg icons/icon48.png
convert -background none -resize 128x128 icons/icon.svg icons/icon128.png
```

**Using Inkscape:**
```bash
inkscape icons/icon.svg --export-filename=icons/icon16.png -w 16 -h 16
inkscape icons/icon.svg --export-filename=icons/icon48.png -w 48 -h 48
inkscape icons/icon.svg --export-filename=icons/icon128.png -w 128 -h 128
```

If you don't create PNG icons, Chrome will show a warning but the extension will still work.

## Usage

1. **Visit a website with 3D models**
2. **Wait for models to load** - The extension automatically monitors network traffic
3. **Click the extension icon** - You'll see a badge with the number of detected models
4. **Download or copy**:
   - Click "⬇️ Download" to save the file
   - Click "📋 Copy URL" to copy the model URL
5. **Clear list** if needed with the "🗑️ Clear List" button

## How It Works

### Network Monitoring
The extension uses Chrome's `webRequest` API to intercept network requests and identify GLB/GLTF files by:
- File extension (`.glb`, `.gltf`)
- Content-Type headers (`model/gltf-binary`, `model/gltf+json`)

### Page Scanning
A content script searches the page DOM for:
- Direct links to GLB/GLTF files
- Data attributes containing model URLs
- Script tags with embedded model URLs
- Canvas and model-viewer elements

### Download Management
Uses Chrome's native download API with "Save As" dialog for user control over file location.

## Supported Sites

This extension works on any website that serves 3D models, including:
- Sketchfab
- Any site with GLB/GLTF models

## Permissions

The extension requires these permissions:
- **webRequest**: Monitor network requests for 3D models
- **downloads**: Save detected models to disk
- **storage**: Remember detected models per tab
- **activeTab**: Access the current page content
- **host_permissions (<all_urls>)**: Work on any website

## Privacy

- All processing happens locally in your browser
- No data is sent to external servers
- No tracking or analytics
- Open source - inspect the code yourself

## Troubleshooting

### No models detected?
- Refresh the page with the extension enabled
- Check if the site actually loads GLB/GLTF files (use DevTools Network tab)
- Some sites use blob URLs or encrypted downloads that can't be intercepted

### Download fails?
- The model URL might require authentication
- Try "Copy URL" and download with a different tool
- Check Chrome's download settings

### Badge not showing?
- Reload the extension from `chrome://extensions/`
- Check the browser console for errors

## Development

### File Structure
```
3d-extracter/
├── manifest.json       # Extension configuration
├── background.js       # Service worker (network monitoring)
├── content.js         # Page scanner
├── popup.html         # Extension UI
├── popup.js           # Popup logic
├── icons/
│   ├── icon.svg       # Source icon
│   ├── icon16.png     # 16x16 icon
│   ├── icon48.png     # 48x48 icon
│   └── icon128.png    # 128x128 icon
└── README.md          # This file
```

### Making Changes
1. Edit the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## License

MIT License - Feel free to modify and distribute

## Contributing

Found a bug or want to add a feature? Feel free to submit issues or pull requests!
