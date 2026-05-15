// 3D Model Extractor — background service worker
// Detects 3D models across formats and exposes a full network inspector per tab.

const MODEL_EXTENSIONS = [
  'glb', 'gltf',
  'm3f', '3mf',
  'fbx', 'obj', 'mtl',
  'usdz', 'usdc', 'usd',
  'stl', 'ply', 'dae',
  '3ds', 'blend', 'x3d', 'vrml'
];

// Content-type substrings that signal a 3D model response.
const MODEL_CONTENT_TYPE_HINTS = [
  'gltf-binary',
  'gltf+json',
  'gltf',
  '3mf',
  'vnd.ms-3mfdocument',
  'collada',
  'usdz',
  'usd',
  'stl',
  'application/sla',
  'obj',
  'vnd.autodesk.fbx',
  'fbx'
];

// Per-tab confirmed/likely models.
const tabModels = new Map();
// Per-tab full request log (capped).
const tabRequests = new Map();
// Map requestId -> tabId so onHeadersReceived/onCompleted can find their entry quickly.
const requestIndex = new Map();

const REQUEST_LOG_LIMIT = 600;

function getTabRequests(tabId) {
  if (!tabRequests.has(tabId)) tabRequests.set(tabId, []);
  return tabRequests.get(tabId);
}

function getTabModels(tabId) {
  if (!tabModels.has(tabId)) tabModels.set(tabId, []);
  return tabModels.get(tabId);
}

function extractExtension(url) {
  try {
    const u = new URL(url);
    const path = u.pathname;
    const m = path.match(/\.([a-z0-9]{2,6})$/i);
    return m ? m[1].toLowerCase() : null;
  } catch (e) {
    const m = url.match(/\.([a-z0-9]{2,6})(?:\?|#|$)/i);
    return m ? m[1].toLowerCase() : null;
  }
}

function detectFormat(url, contentType) {
  const ext = extractExtension(url);
  if (ext && MODEL_EXTENSIONS.includes(ext)) return ext;

  // Loose URL match (handles ?query suffixes and inline references).
  for (const candidate of MODEL_EXTENSIONS) {
    const re = new RegExp(`\\.${candidate}(?:[?#]|$)`, 'i');
    if (re.test(url)) return candidate;
  }

  if (contentType) {
    const ct = contentType.toLowerCase();
    if (ct.includes('gltf-binary')) return 'glb';
    if (ct.includes('gltf+json') || ct.includes('gltf')) return 'gltf';
    if (ct.includes('3mf')) return '3mf';
    if (ct.includes('collada')) return 'dae';
    if (ct.includes('usdz')) return 'usdz';
    if (ct.includes('application/sla') || ct.includes('stl')) return 'stl';
    if (ct.includes('fbx')) return 'fbx';
    if (ct.includes('obj')) return 'obj';
  }
  return null;
}

function classifyRequest(url, contentType, size) {
  const format = detectFormat(url, contentType);
  if (format) {
    return { isModel: true, format, confidence: 'high' };
  }

  // Soft heuristic — large binary payloads with model-ish URLs.
  const ct = (contentType || '').toLowerCase();
  const looksBinary = ct.includes('octet-stream') || ct.includes('binary') || ct === '';
  const big = typeof size === 'number' && size > 50_000;
  if (looksBinary && big) {
    const u = url.toLowerCase();
    if (u.includes('model') || u.includes('mesh') || u.includes('asset') ||
        u.includes('3d') || u.includes('scene') || u.includes('avatar')) {
      return { isModel: true, format: 'unknown', confidence: 'low' };
    }
  }
  return { isModel: false };
}

function extractFilename(url, format) {
  let base = 'model';
  try {
    const u = new URL(url);
    const path = u.pathname;
    let last = path.substring(path.lastIndexOf('/') + 1);
    last = last.split('?')[0].split('#')[0];
    if (last) base = last;
  } catch (e) {
    // ignore
  }

  const hasKnownExt = MODEL_EXTENSIONS.some(ext => base.toLowerCase().endsWith('.' + ext));
  if (!hasKnownExt) {
    const ext = format && format !== 'unknown' ? format : 'bin';
    base = base.replace(/\.[a-z0-9]{1,6}$/i, '') + '.' + ext;
  }
  return base;
}

function renameWithExtension(filename, newExt) {
  const cleaned = filename.replace(/\.[a-z0-9]{1,6}$/i, '');
  return (cleaned || 'model') + '.' + newExt;
}

// --- magic-byte format detection --------------------------------------------
// Inspects the first ~8KB of a file and returns { format, confidence, hint }.
// confidence: 'high' | 'medium' | 'low' | 'none'
function detectFromBytes(bytes) {
  if (!bytes || bytes.length < 4) {
    return { format: 'unknown', confidence: 'none', hint: 'File too small to identify.' };
  }

  // GLB — "glTF"
  if (bytes[0] === 0x67 && bytes[1] === 0x6C && bytes[2] === 0x54 && bytes[3] === 0x46) {
    return { format: 'glb', confidence: 'high', hint: 'GLB (binary glTF)' };
  }

  // FBX Binary — "Kaydara FBX Binary  \x00"
  const fbxMagic = 'Kaydara FBX Binary';
  if (bytes.length >= fbxMagic.length) {
    let ok = true;
    for (let i = 0; i < fbxMagic.length; i++) {
      if (bytes[i] !== fbxMagic.charCodeAt(i)) { ok = false; break; }
    }
    if (ok) return { format: 'fbx', confidence: 'high', hint: 'FBX Binary' };
  }

  // 3DS — primary chunk 0x4D4D
  if (bytes[0] === 0x4D && bytes[1] === 0x4D) {
    return { format: '3ds', confidence: 'medium', hint: '3DS Studio (chunk magic match)' };
  }

  // ZIP-based formats — PK\x03\x04
  if (bytes[0] === 0x50 && bytes[1] === 0x4B && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)) {
    const text = safeDecode(bytes, 4096);
    if (text.includes('3D/3dmodel.model') || text.includes('3dmodel.model')) {
      return { format: '3mf', confidence: 'high', hint: '3MF archive' };
    }
    if (/\.usd[czaA]?\b/.test(text) || text.includes('Pixar')) {
      return { format: 'usdz', confidence: 'high', hint: 'USDZ archive' };
    }
    if (text.includes('mimetypeapplication/vnd.collada') || text.includes('.dae')) {
      return { format: 'dae', confidence: 'medium', hint: 'Collada ZAE archive' };
    }
    if (text.includes('BLENDER')) {
      return { format: 'blend', confidence: 'medium', hint: 'Blender file (compressed)' };
    }
    return { format: 'zip', confidence: 'low', hint: 'ZIP archive — could be 3MF / USDZ / ZAE / KMZ / .blend. Try opening as ZIP.' };
  }

  // Blender — "BLENDER"
  if (bytes.length >= 7 && bytes[0] === 0x42 && bytes[1] === 0x4C && bytes[2] === 0x45 &&
      bytes[3] === 0x4E && bytes[4] === 0x44 && bytes[5] === 0x45 && bytes[6] === 0x52) {
    return { format: 'blend', confidence: 'high', hint: 'Blender file' };
  }

  // Text-based formats
  let text = safeDecode(bytes, 4096);
  if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1); // strip BOM
  const trimmed = text.trimStart();

  // glTF JSON
  if (trimmed.startsWith('{')) {
    if (/"asset"\s*:/.test(trimmed) && (/"version"/.test(trimmed) || /"buffers"/.test(trimmed) || /"meshes"/.test(trimmed))) {
      return { format: 'gltf', confidence: 'high', hint: 'glTF JSON' };
    }
    return { format: 'json', confidence: 'low', hint: 'JSON — possibly a glTF or scene description.' };
  }

  // STL ASCII
  if (/^solid\s+/i.test(trimmed)) {
    return { format: 'stl', confidence: 'high', hint: 'STL ASCII' };
  }

  // PLY
  if (/^ply[\r\n]/i.test(trimmed)) {
    return { format: 'ply', confidence: 'high', hint: 'PLY (Polygon File Format)' };
  }

  // OBJ — count typical line prefixes
  const lines = trimmed.split('\n').slice(0, 30);
  let objHits = 0;
  for (const line of lines) {
    if (/^(v\s|vn\s|vt\s|f\s|#\s|o\s|g\s|s\s|mtllib\s|usemtl\s)/.test(line)) objHits++;
  }
  if (objHits >= 3) {
    return { format: 'obj', confidence: 'high', hint: 'Wavefront OBJ' };
  }

  // XML — Collada / X3D
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<COLLADA') || trimmed.startsWith('<X3D')) {
    if (/COLLADA/i.test(trimmed)) return { format: 'dae', confidence: 'high', hint: 'Collada XML' };
    if (/<X3D/i.test(trimmed)) return { format: 'x3d', confidence: 'high', hint: 'X3D XML' };
    return { format: 'xml', confidence: 'low', hint: 'XML — unknown 3D dialect.' };
  }

  // VRML / X3D text
  if (/^#VRML/i.test(trimmed) || /^#X3D/i.test(trimmed)) {
    return { format: 'vrml', confidence: 'high', hint: 'VRML' };
  }

  // STL Binary heuristic — 80-byte header + UInt32 triangle count
  if (bytes.length >= 84) {
    const triCount = bytes[80] | (bytes[81] << 8) | (bytes[82] << 16) | (bytes[83] << 24);
    if (triCount > 0 && triCount < 10_000_000) {
      return { format: 'stl', confidence: 'low', hint: `Possibly STL Binary (${triCount} triangles header).` };
    }
  }

  // Otherwise: raw binary with no header. Most commonly a glTF buffer.
  return {
    format: 'bin',
    confidence: 'low',
    hint: 'Raw binary, no recognizable header. Likely a glTF buffer (.bin) referenced by a .gltf JSON. Look for a sibling .gltf at the same URL path.'
  };
}

function safeDecode(bytes, max) {
  try {
    const slice = bytes.subarray(0, Math.min(bytes.length, max));
    return new TextDecoder('utf-8', { fatal: false }).decode(slice);
  } catch (e) {
    return '';
  }
}

// Find a .gltf request in the same tab that lives in the same URL directory
// as the given .bin URL. Helps the user grab the parent of a glTF buffer.
function findSiblingGltf(tabId, binUrl) {
  const reqs = tabRequests.get(tabId) || [];
  let binDir;
  let binHost;
  try {
    const u = new URL(binUrl);
    binHost = u.hostname;
    binDir = u.pathname.substring(0, u.pathname.lastIndexOf('/') + 1);
  } catch (e) {
    return null;
  }
  for (const req of reqs) {
    try {
      const ru = new URL(req.url);
      if (ru.hostname !== binHost) continue;
      if (!ru.pathname.startsWith(binDir)) continue;
      if (/\.gltf(?:[?#]|$)/i.test(ru.pathname)) return req.url;
    } catch (e) { /* skip */ }
  }
  return null;
}

async function identifyModelFormat(url) {
  let bytes;
  try {
    let resp = await fetch(url, {
      headers: { Range: 'bytes=0-8191' },
      credentials: 'include',
      cache: 'force-cache'
    });
    // 206 = partial OK; 200 = server ignored Range header (still fine, we'll just slice)
    if (!resp.ok && resp.status !== 206) {
      throw new Error('HTTP ' + resp.status);
    }
    const buf = await resp.arrayBuffer();
    bytes = new Uint8Array(buf).subarray(0, 8192);
  } catch (e) {
    return { format: 'unknown', confidence: 'none', hint: 'Fetch failed: ' + e.message };
  }
  return detectFromBytes(bytes);
}

function updateBadge(tabId) {
  const count = (tabModels.get(tabId) || []).length;
  chrome.action.setBadgeText({ tabId, text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#4CAF50' });
}

function addModel(tabId, model) {
  const models = getTabModels(tabId);
  if (models.some(m => m.url === model.url)) return;
  models.push(model);
  updateBadge(tabId);
}

// --- webRequest plumbing -----------------------------------------------------

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0) return;
    const reqs = getTabRequests(details.tabId);
    reqs.push({
      requestId: details.requestId,
      url: details.url,
      method: details.method,
      type: details.type,
      timestamp: details.timeStamp || Date.now(),
      status: null,
      contentType: null,
      size: null,
      flagged: false
    });
    if (reqs.length > REQUEST_LOG_LIMIT) reqs.shift();
    requestIndex.set(details.requestId, details.tabId);
  },
  { urls: ['<all_urls>'] }
);

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.tabId < 0) return;
    const reqs = getTabRequests(details.tabId);
    const entry = reqs.find(r => r.requestId === details.requestId);

    const headers = details.responseHeaders || [];
    const contentType = headers.find(h => h.name.toLowerCase() === 'content-type')?.value || '';
    const contentLength = headers.find(h => h.name.toLowerCase() === 'content-length')?.value;
    const size = contentLength ? parseInt(contentLength, 10) : null;

    if (entry) {
      entry.contentType = contentType;
      entry.size = Number.isFinite(size) ? size : null;
      entry.status = details.statusCode;
    }

    const verdict = classifyRequest(details.url, contentType, size);
    if (verdict.isModel) {
      if (entry) entry.flagged = true;
      addModel(details.tabId, {
        url: details.url,
        filename: extractFilename(details.url, verdict.format),
        format: verdict.format,
        size: entry?.size ?? size ?? 'Unknown',
        contentType,
        confidence: verdict.confidence,
        source: 'network',
        timestamp: Date.now()
      });
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.tabId < 0) return;
    const reqs = tabRequests.get(details.tabId);
    if (!reqs) return;
    const entry = reqs.find(r => r.requestId === details.requestId);
    if (entry) entry.status = details.statusCode;
    requestIndex.delete(details.requestId);
  },
  { urls: ['<all_urls>'] }
);

chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (details.tabId < 0) return;
    const reqs = tabRequests.get(details.tabId);
    if (!reqs) return;
    const entry = reqs.find(r => r.requestId === details.requestId);
    if (entry) entry.status = -1;
    requestIndex.delete(details.requestId);
  },
  { urls: ['<all_urls>'] }
);

// --- message handlers --------------------------------------------------------

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = request.tabId ?? sender.tab?.id;

  if (request.action === 'getModels') {
    sendResponse({ models: tabModels.get(tabId) || [] });
    return true;
  }

  if (request.action === 'getRequests') {
    sendResponse({ requests: tabRequests.get(tabId) || [] });
    return true;
  }

  if (request.action === 'clearModels') {
    tabModels.delete(tabId);
    updateBadge(tabId);
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'clearRequests') {
    tabRequests.delete(tabId);
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'downloadModel') {
    chrome.downloads.download(
      {
        url: request.url,
        filename: request.filename,
        saveAs: true
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId });
        }
      }
    );
    return true;
  }

  if (request.action === 'flagAsModel') {
    const reqs = tabRequests.get(tabId) || [];
    const req = reqs.find(r => r.url === request.url);
    const format = detectFormat(request.url, req?.contentType) || 'unknown';
    addModel(tabId, {
      url: request.url,
      filename: extractFilename(request.url, format),
      format,
      size: req?.size ?? 'Unknown',
      contentType: req?.contentType ?? '',
      confidence: 'manual',
      source: 'manual',
      timestamp: Date.now()
    });
    if (req) req.flagged = true;
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'identifyModel') {
    (async () => {
      const result = await identifyModelFormat(request.url);

      // Update the matching model entry — if we got a confident hit, rename it.
      const models = tabModels.get(tabId) || [];
      const model = models.find(m => m.url === request.url);
      if (model) {
        model.detected = result;
        const goodFormat = result.format &&
          result.format !== 'unknown' &&
          result.format !== 'bin' &&
          result.format !== 'json' &&
          result.format !== 'xml' &&
          result.format !== 'zip';
        if (goodFormat && (result.confidence === 'high' || result.confidence === 'medium')) {
          model.format = result.format;
          model.filename = renameWithExtension(model.filename, result.format);
          model.confidence = 'verified';
        }
      }

      // If it's a raw .bin buffer, look for a sibling .gltf in this tab's log.
      let siblingGltf = null;
      if (result.format === 'bin') {
        siblingGltf = findSiblingGltf(tabId, request.url);
      }

      sendResponse({ success: true, result, siblingGltf });
    })();
    return true; // async response
  }

  if (request.action === 'foundModels') {
    const targetTab = sender.tab?.id;
    if (targetTab === undefined) {
      sendResponse({ success: false });
      return true;
    }
    (request.models || []).forEach((url) => {
      const format = detectFormat(url, null) || 'unknown';
      addModel(targetTab, {
        url,
        filename: extractFilename(url, format),
        format,
        size: 'Unknown',
        contentType: '',
        confidence: 'dom',
        source: 'dom',
        timestamp: Date.now()
      });
    });
    sendResponse({ success: true });
    return true;
  }

  return true;
});

// --- tab lifecycle -----------------------------------------------------------

chrome.tabs.onRemoved.addListener((tabId) => {
  tabModels.delete(tabId);
  tabRequests.delete(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // Reset per-tab state on top-level navigation only.
  if (changeInfo.status === 'loading' && changeInfo.url) {
    tabModels.delete(tabId);
    tabRequests.delete(tabId);
    chrome.action.setBadgeText({ tabId, text: '' });
  }
});
