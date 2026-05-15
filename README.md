# 🎨 3D Model Extractor

<div align="center">

**Extract and download 3D models from any website with one click**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/hoodini/3d-extracter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

A powerful Chrome extension that automatically detects, intercepts, and downloads 3D model files in **11 formats** (GLB, GLTF, M3F, 3MF, FBX, OBJ, USDZ, STL, PLY, DAE, and more) from any website. Ships with a built-in **Network Inspector** so you can browse every request the page makes and flag anything as a model — perfect for designers, 3D artists, and developers working with web-based 3D content.

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [How It Works](#-how-it-works) • [Contributing](#-contributing)

</div>

---

## 🚀 What is This?

Ever visited a website with amazing 3D models but couldn't download them because the download button was broken or didn't exist? This extension solves that problem.

**3D Model Extractor** monitors all network traffic and page content to automatically detect 3D model files across every common format, then provides a clean interface to download them with a single click. When auto-detection misses something, the Network Inspector lets you flag any request — even ones served with non-standard URLs or content types — as a model and download it directly. No more digging through DevTools or manually copying URLs.

### Why Use This Extension?

- 🔍 **Automatic Detection** - Finds models without manual searching
- 🧬 **Multi-Format Support** - GLB, GLTF, M3F, 3MF, FBX, OBJ, USDZ/USDC, STL, PLY, DAE, 3DS, X3D, VRML
- 🕵️ **Network Inspector** - Browse, filter, and flag every network request the page makes
- ⚡ **Real-time Monitoring** - Captures models as they load
- 💾 **One-Click Download** - Save files instantly with native browser dialog
- 🔒 **Privacy-First** - All processing happens locally in your browser
- 🎯 **Smart Filtering** - Format badges, confidence levels, size/type filters
- 📋 **URL Copying** - Grab model URLs for external tools

---

## ✨ Features

### Core Functionality

| Feature | Description |
|---------|-------------|
| **Multi-Format Detection** | Detects 11+ formats by extension (`.glb .gltf .m3f .3mf .fbx .obj .usdz .stl .ply .dae` and more) and by content-type sniffing |
| **Network Interception** | Monitors every HTTP request, logs URL, method, type, status, content-type, and size per tab |
| **Network Inspector Tab** | Built-in panel to browse all requests, filter by URL/type/size, and manually flag anything as a model |
| **Heuristic Scoring** | Flags suspicious binary payloads with model-ish URLs (`/model/`, `/mesh/`, `/asset/`) even without a known extension |
| **DOM Scanning** | Searches page HTML for model URLs in links, data attributes, scripts, `<model-viewer>`, A-Frame, stylesheets |
| **Format Badges** | Each detected model is tagged with its format and confidence level (high / low / manual / dom) |
| **Badge Counter** | Shows number of detected models directly on the extension icon |
| **Auto-Refresh** | Live updates every 1.5 seconds while the popup is open |
| **Download Manager** | Uses Chrome's native download API with "Save As" dialog for full control |
| **URL Clipboard** | Copy model URLs to clipboard for use with external download managers or tools |
| **Tab Isolation** | Each browser tab maintains its own separate list of detected models and request log |

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

3. **Click the extension icon → Models tab**
   - See every detected model with format badge and size
   - Each entry shows confidence: `high` (URL or content-type match), `low` (heuristic), `dom` (found in HTML), `manual` (you flagged it)

4. **Download or copy**
   - Click **⬇️ Download** to save the file
   - Click **📋 Copy URL** to copy the model URL
   - Use **🗑️ Clear Models** to reset the detected models

### Got a `.bin` file? Use 🔍 Identify

If a model is downloaded as `.bin` (or any unhelpful extension), click **🔍 Identify** on the model card. The extension fetches the first 8 KB of the file and inspects its **magic bytes** to determine the real format. If recognized, the model is renamed in place — the next download will save it with the correct extension (`.glb`, `.gltf`, `.fbx`, `.stl`, etc.).

Recognized signatures:

| Format | How we detect it |
|--------|------------------|
| **GLB** | First 4 bytes = `glTF` |
| **glTF JSON** | Starts with `{` and contains `"asset"` + `"buffers"`/`"meshes"`/`"version"` |
| **FBX Binary** | Starts with `Kaydara FBX Binary` |
| **3MF / USDZ / ZAE / `.blend`** | ZIP header (`PK\x03\x04`) + archive-content inspection |
| **STL ASCII** | Starts with `solid ` |
| **STL Binary** | 80-byte header + plausible triangle count |
| **PLY** | Starts with `ply\n` |
| **OBJ** | Multiple lines starting with `v `/`vn `/`vt `/`f `/`mtllib ` |
| **Collada (DAE)** | XML containing `COLLADA` |
| **X3D / VRML** | `<X3D` tag or `#VRML` header |
| **3DS** | Primary chunk magic `MM` (0x4D4D) |
| **Blender** | Starts with `BLENDER` |

#### Special case: glTF buffer files

When a website serves a `.gltf` (JSON) file, it usually references one or more `.bin` files for vertex/index/animation data. **Those `.bin` files are NOT standalone models** — they're useless without the parent `.gltf`. When Identify detects a raw binary buffer, the extension will:

1. Show a warning that the file is likely a glTF buffer
2. Search this tab's request log for a sibling `.gltf` in the same URL path
3. If found, offer a one-click "flag + download it" link to grab the parent

If no sibling is found, reload the page with the extension popup open so the request log captures both files.

### Network Inspector (advanced)

When auto-detection misses a model — because it's served from a CDN with a generic URL, comes through as `application/octet-stream`, or is loaded via a custom protocol — switch to the **Network** tab.

- See every request the page made (capped at the last 600 per tab)
- Filter by URL/content-type text, resource type (XHR, Fetch, Image, Media, …), or minimum size
- Toggle **Flagged only** to see what the extension already detected
- Click any row to expand: shows full URL, method, content-type, size, status
- **🏷️ Flag as model** — promotes the request into the Models tab so you can download it
- **⬇️ Download** directly from the inspector even without flagging

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
// Each request is scored as model / not-model by:
1. URL extension whitelist
   .glb .gltf .m3f .3mf .fbx .obj .mtl .usdz .usdc .usd
   .stl .ply .dae .3ds .blend .x3d .vrml          → high confidence
2. Content-Type sniffing
   model/gltf-binary, model/gltf+json, model/3mf,
   model/vnd.collada+xml, model/vnd.usdz+zip,
   application/sla, application/vnd.autodesk.fbx   → high confidence
3. Heuristic — large binary (octet-stream, ≥ 50 KB) with a
   model-ish URL (/model/, /mesh/, /asset/, /3d/, /scene/,
   /avatar/)                                        → low confidence
4. Manual flag from the Network Inspector           → manual confidence
5. DOM scan in the content script                   → dom confidence
```

**What it does:**
- Listens to `onBeforeRequest`, `onHeadersReceived`, `onCompleted`, and `onErrorOccurred`
- Builds a per-tab request log (capped at 600 entries) for the Network Inspector
- Classifies each response using extension + content-type + size + URL keywords
- Extracts filename from URL path and appends the correct extension if missing
- Stores confirmed models in a Map indexed by tab ID
- Updates extension badge with model count
- Prevents duplicate entries for the same URL
- Resets per-tab state on top-level navigation only (subframe navigations preserved)

**Why a service worker?**
- Always running in the background
- Can intercept requests before they complete
- Persists across page reloads
- Low memory footprint

#### 2. **Content Script (content.js)**

Injected into every webpage to scan the DOM for model URLs that might not trigger network requests.

**Scanning Strategy:**
```javascript
// Searches every supported format in:
1. <script> tags containing absolute URLs
2. Data attributes (data-src, data-url, data-model, data-glb,
   data-gltf, data-asset, data-file, data-href, data-model-src)
3. <a href> and <iframe src> / <source src>
4. <model-viewer src>, <a-asset-item>, ios-src (USDZ AR)
5. Stylesheets — url() references in same-origin CSS rules
6. Dynamically loaded content (throttled MutationObserver, 60s)
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
- Two tabs: **Models** (auto-detected) and **Network** (every request)
- Network tab supports text search, resource-type filter, minimum size filter, and a "flagged only" toggle
- Click any network row to expand full details and flag/download
- Format badges color-coded per format (GLB blue, FBX amber, USDZ red, …)
- Confidence badges (low / dom / manual) make it obvious why something was flagged
- Auto-refreshes every 1.5 seconds while open
- Shows empty state when no models detected
- Formats file sizes (B → KB → MB → GB)
- Truncates long URLs for readability
- Uses secure DOM methods (textContent + createElement) to prevent XSS

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
| `webRequest` | Monitor network requests | To detect 3D model files and feed the Network Inspector |
| `downloads` | Save files to disk | To download detected models to user's computer |
| `storage` | Remember detected models | To maintain model list per tab |
| `activeTab` | Access current page | To inject content script for DOM scanning |
| `tabs` | Track per-tab state | To clear request log/models on navigation and update badges |
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
- Model preview thumbnails (Three.js render)
- Batch download all models as zip
- Export model list / network log as JSON or HAR
- Persistent download history across sessions
- Dark/light theme toggle
- Keyboard shortcuts
- Custom format whitelist via options page
- Blob URL detection via content-script fetch interception

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
