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
