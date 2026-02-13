# 🎨 3D Model Extractor

<div align="center">

**Extract and download 3D models from any website with one click**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/hoodini/3d-extracter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

A powerful Chrome extension that automatically detects, intercepts, and downloads GLB/GLTF 3D model files from any website. Perfect for designers, 3D artists, and developers working with web-based 3D content.

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [How It Works](#-how-it-works) • [Contributing](#-contributing)

</div>

---

## 🚀 What is This?

Ever visited a website with amazing 3D models but couldn't download them because the download button was broken or didn't exist? This extension solves that problem.

**3D Model Extractor** monitors all network traffic and page content to automatically detect GLB and GLTF files, then provides a clean interface to download them with a single click. No more digging through DevTools or manually copying URLs.

### Why Use This Extension?

- 🔍 **Automatic Detection** - Finds models without manual searching
- ⚡ **Real-time Monitoring** - Captures models as they load
- 💾 **One-Click Download** - Save files instantly with native browser dialog
- 🔒 **Privacy-First** - All processing happens locally in your browser
- 🎯 **Smart Filtering** - Only shows actual 3D model files
- 📋 **URL Copying** - Grab model URLs for external tools

---

## ✨ Features

### Core Functionality

| Feature | Description |
|---------|-------------|
| **Network Interception** | Monitors all HTTP requests to detect GLB/GLTF files by extension, content-type, and URL patterns |
| **DOM Scanning** | Searches page HTML for model URLs in links, data attributes, scripts, and canvas elements |
| **Badge Counter** | Shows number of detected models directly on the extension icon |
| **Auto-Refresh** | Updates detected models list every 2 seconds automatically |
| **Download Manager** | Uses Chrome's native download API with "Save As" dialog for full control |
| **URL Clipboard** | Copy model URLs to clipboard for use with external download managers or tools |
| **Tab Isolation** | Each browser tab maintains its own separate list of detected models |

### User Interface

- 🎨 **Modern Dark Theme** - Easy on the eyes with gradient accents
- 📱 **Responsive Design** - Clean, organized layout
- ⚡ **Instant Feedback** - Visual confirmation for all actions
- 🗑️ **List Management** - Clear detected models when needed
- 📊 **File Information** - Shows filename and file size for each model

---

## 📦 Installation

### Quick Start (5 minutes)

#### Step 1: Download the Extension

```bash
git clone https://github.com/hoodini/3d-extracter.git
cd 3d-extracter
```

Or download the ZIP file and extract it.

#### Step 2: Generate PNG Icons

The extension includes an SVG icon template. You need to convert it to PNG format:

**Option A: Use the Built-in Generator (Easiest)**

1. Open `generate-icons.html` in Chrome
2. Click "Download All" button
3. Save the three PNG files (`icon16.png`, `icon48.png`, `icon128.png`) in the `icons/` folder

**Option B: Use Command Line Tools**

```bash
# Using ImageMagick
convert -background none -resize 16x16 icons/icon.svg icons/icon16.png
convert -background none -resize 48x48 icons/icon.svg icons/icon48.png
convert -background none -resize 128x128 icons/icon.svg icons/icon128.png

# Using Inkscape
inkscape icons/icon.svg --export-filename=icons/icon16.png -w 16 -h 16
inkscape icons/icon.svg --export-filename=icons/icon48.png -w 48 -h 48
inkscape icons/icon.svg --export-filename=icons/icon128.png -w 128 -h 128
```

**Option C: Use Online Converters**

1. Visit [CloudConvert](https://cloudconvert.com/svg-to-png)
2. Upload `icons/icon.svg`
3. Convert to 16×16, 48×48, and 128×128 pixels
4. Save as `icon16.png`, `icon48.png`, and `icon128.png` in `icons/` folder

> **Note:** The extension will work without PNG icons, but Chrome will show a warning.

#### Step 3: Load into Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `3d-extracter` folder
5. The extension icon should appear in your toolbar 🎉

---

## 🎯 Usage

### Basic Workflow

1. **Visit any website with 3D models**
   - Examples: 3D model generators, portfolio sites, WebGL demos, product viewers

2. **Wait for models to load**
   - The extension monitors network traffic automatically
   - A badge appears on the extension icon showing the count

3. **Click the extension icon**
   - See all detected GLB/GLTF files
   - View filename and file size for each

4. **Download or copy**
   - Click **⬇️ Download** to save the file
   - Click **📋 Copy URL** to copy the model URL
   - Use **🗑️ Clear List** to reset the detected models

### Example Scenarios

#### Scenario 1: Broken Download Button
You generate a 3D model on a website, but the download button isn't working.
- ✅ Extension automatically captures the model URL
- ✅ Click download in the extension popup
- ✅ Save the file to your computer

#### Scenario 2: No Download Option
A website displays 3D models but doesn't provide any download functionality.
- ✅ Extension intercepts the GLB file as it loads
- ✅ Model appears in your detected list
- ✅ Download it with one click

#### Scenario 3: Multiple Models
A webpage loads several 3D models at once.
- ✅ Extension captures all of them
- ✅ Badge shows total count (e.g., "5")
- ✅ Download individually or copy all URLs

---

## 🔧 How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    User Opens Website                    │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │  Website Loads 3D Models   │
         └────────┬──────────┬────────┘
                  │          │
        ┌─────────┘          └─────────┐
        │                              │
        ▼                              ▼
┌──────────────┐              ┌──────────────┐
│  Network     │              │  Page DOM    │
│  Requests    │              │  Content     │
└──────┬───────┘              └──────┬───────┘
       │                             │
       ▼                             ▼
┌──────────────┐              ┌──────────────┐
│ background.js│              │ content.js   │
│ (Intercepts) │              │ (Scans)      │
└──────┬───────┘              └──────┬───────┘
       │                             │
       └─────────┬──────────────────┘
                 │
                 ▼
         ┌──────────────┐
         │ Model Storage│
         │  (Per Tab)   │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │  popup.js    │
         │ (Displays)   │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │     User     │
         │  Downloads   │
         └──────────────┘
```

### Component Breakdown

#### 1. **Service Worker (background.js)**

The service worker runs in the background and intercepts all network requests using Chrome's `webRequest` API.

**Detection Logic:**
```javascript
// Detects GLB/GLTF files by:
1. File extension matching: .glb or .gltf in URL
2. Content-Type headers: model/gltf-binary, model/gltf+json
3. URL pattern matching: Contains .glb or .gltf anywhere
```

**What it does:**
- Listens to `chrome.webRequest.onCompleted` event
- Checks each request against detection criteria
- Extracts filename from URL path
- Reads Content-Length header for file size
- Stores models in a Map indexed by tab ID
- Updates extension badge with model count
- Prevents duplicate entries for the same URL

**Why a service worker?**
- Always running in the background
- Can intercept requests before they complete
- Persists across page reloads
- Low memory footprint

#### 2. **Content Script (content.js)**

Injected into every webpage to scan the DOM for model URLs that might not trigger network requests.

**Scanning Strategy:**
```javascript
// Searches for models in:
1. <script> tags containing URLs
2. Data attributes (data-src, data-url, data-model)
3. <a> tags with .glb/.gltf hrefs
4. <canvas> and <model-viewer> src attributes
5. Dynamically loaded content
```

**Advanced Features:**
- Uses MutationObserver to detect dynamically added content
- Searches page HTML with regex patterns
- Auto-disconnects after 30 seconds to avoid performance impact
- Sends found models to background script

**Why scan the DOM?**
- Some models are embedded as data URIs
- Blob URLs might not trigger network events
- Pre-loaded model URLs in JavaScript
- Static links that haven't been clicked yet

#### 3. **Popup Interface (popup.html + popup.js)**

The user interface that displays when clicking the extension icon.

**Features:**
- Queries background script for models in current tab
- Displays each model with filename and size
- Provides download and copy buttons
- Auto-refreshes every 2 seconds
- Shows empty state when no models detected
- Formats file sizes (Bytes → KB → MB → GB)
- Truncates long URLs for readability
- Uses secure DOM methods (textContent) to prevent XSS

**Download Flow:**
```javascript
User clicks Download
    ↓
popup.js sends message to background.js
    ↓
background.js calls chrome.downloads.download()
    ↓
Chrome shows "Save As" dialog
    ↓
File saved to user's chosen location
```

### Security Measures

- ✅ **No innerHTML** - Uses textContent and createElement to prevent XSS attacks
- ✅ **Content Security Policy** - Manifest v3 default protections
- ✅ **Local Processing** - No external servers or tracking
- ✅ **User Control** - Native "Save As" dialog for downloads
- ✅ **Permission Scoping** - Only requests necessary permissions

---

## 📋 Technical Details

### Permissions Explained

| Permission | Purpose | Why It's Needed |
|------------|---------|-----------------|
| `webRequest` | Monitor network requests | To detect GLB/GLTF files as they're downloaded |
| `downloads` | Save files to disk | To download detected models to user's computer |
| `storage` | Remember detected models | To maintain model list per tab |
| `activeTab` | Access current page | To inject content script for DOM scanning |
| `<all_urls>` | Work on any website | To intercept requests across all domains |

### File Structure

```
3d-extracter/
├── manifest.json          # Extension configuration (Manifest V3)
├── background.js          # Service worker for network monitoring
├── content.js            # Content script for DOM scanning
├── popup.html            # Extension popup UI structure
├── popup.js              # Popup logic and interaction
├── generate-icons.html   # Tool to create PNG icons
├── icons/
│   ├── icon.svg         # Source vector icon
│   ├── icon16.png       # Toolbar icon (16×16)
│   ├── icon48.png       # Extension management (48×48)
│   └── icon128.png      # Chrome Web Store (128×128)
├── README.md            # This file
└── .gitignore           # Git ignore rules
```

### Browser Compatibility

- ✅ **Chrome** - Fully supported (Manifest V3)
- ✅ **Edge** - Fully supported (Chromium-based)
- ✅ **Brave** - Fully supported
- ✅ **Opera** - Fully supported
- ❌ **Firefox** - Not compatible (requires Manifest V2 port)
- ❌ **Safari** - Not compatible (different extension format)

---

## 🛠️ Troubleshooting

### No models detected?

**Possible causes:**
- Models haven't loaded yet - wait a few seconds
- Website uses encrypted or authenticated downloads
- Models are embedded as base64 data URIs (not detectable)
- Website uses WebAssembly to decode proprietary formats

**Solutions:**
1. Refresh the page with extension enabled
2. Check DevTools Network tab for GLB/GLTF requests
3. Try right-clicking on the 3D viewer and inspect element
4. Some sites encrypt their models - this extension can't bypass DRM

### Download button fails?

**Possible causes:**
- Model URL requires authentication cookies
- CORS restrictions prevent download
- URL has expired or is no longer valid
- File is too large (over 2GB)

**Solutions:**
1. Use "Copy URL" and download with `curl` or `wget`:
   ```bash
   curl -O "https://example.com/model.glb"
   ```
2. Try opening the URL in a new tab
3. Use a download manager with authentication support

### Badge not showing count?

**Possible causes:**
- Extension needs to be reloaded
- JavaScript error in background script
- Chrome extension API rate limiting

**Solutions:**
1. Go to `chrome://extensions/`
2. Find "3D Model Extractor"
3. Click the refresh icon 🔄
4. Open DevTools for the extension and check for errors

### Extension not loading?

**Possible causes:**
- Missing PNG icons
- Invalid manifest.json syntax
- Chrome version too old

**Solutions:**
1. Check Chrome version (needs 88+)
2. Generate PNG icons using `generate-icons.html`
3. Check for errors in `chrome://extensions/`

---

## 🎨 Development

### Making Changes

1. Edit the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon ♻️ on the extension card
4. Test your changes
5. Submit a pull request!

### Adding Features

Some ideas for contributions:
- Support for OBJ/FBX formats
- Model preview thumbnails
- Batch download all models
- Export model list as JSON
- Filter by file size
- Dark/light theme toggle
- Keyboard shortcuts
- Download history

### Testing

```bash
# Load extension in Chrome
1. chrome://extensions/
2. Load unpacked
3. Select folder

# Test on these sites:
- Sketchfab embeds
- Three.js examples
- Any WebGL demo site
- Product configurators
```

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'feat: Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Contribution Guidelines

- Follow existing code style
- Add comments for complex logic
- Test on multiple websites
- Update README if adding features
- Use conventional commit messages

---

## 📄 License

This project is licensed under the **MIT License** - see below for details.

```
MIT License

Copyright (c) 2026 3D Model Extractor

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🌟 Show Your Support

If this extension helped you, consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting features
- 🔀 Contributing code
- 📢 Sharing with others

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/hoodini/3d-extracter/issues)
- **Discussions**: [GitHub Discussions](https://github.com/hoodini/3d-extracter/discussions)

---

<div align="center">

**Made with ❤️ for the 3D community**

[⬆ Back to Top](#-3d-model-extractor)

</div>
