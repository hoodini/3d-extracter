// Store detected GLB files per tab
const tabModels = new Map();

// Listen for network requests
chrome.webRequest.onCompleted.addListener(
  (details) => {
    const url = details.url;

    // Check if URL contains GLB or GLTF
    if (url.match(/\.(glb|gltf)(\?.*)?$/i) ||
        url.includes('.glb') ||
        url.includes('.gltf') ||
        details.responseHeaders?.some(h =>
          h.name.toLowerCase() === 'content-type' &&
          (h.value.includes('model/gltf-binary') || h.value.includes('model/gltf+json'))
        )) {

      const tabId = details.tabId;

      if (!tabModels.has(tabId)) {
        tabModels.set(tabId, []);
      }

      const models = tabModels.get(tabId);

      // Avoid duplicates
      if (!models.some(m => m.url === url)) {
        models.push({
          url: url,
          timestamp: Date.now(),
          filename: extractFilename(url),
          size: details.responseHeaders?.find(h => h.name.toLowerCase() === 'content-length')?.value || 'Unknown'
        });

        // Update badge to show number of models found
        chrome.action.setBadgeText({
          tabId: tabId,
          text: models.length.toString()
        });
        chrome.action.setBadgeBackgroundColor({
          tabId: tabId,
          color: '#4CAF50'
        });
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// Extract filename from URL
function extractFilename(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.substring(pathname.lastIndexOf('/') + 1);

    // If no extension or doesn't end with .glb/.gltf, add .glb
    if (!filename.match(/\.(glb|gltf)$/i)) {
      return (filename || 'model') + '.glb';
    }

    return filename || 'model.glb';
  } catch (e) {
    return 'model.glb';
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getModels') {
    const models = tabModels.get(request.tabId) || [];
    sendResponse({ models });
  } else if (request.action === 'clearModels') {
    tabModels.delete(request.tabId);
    chrome.action.setBadgeText({
      tabId: request.tabId,
      text: ''
    });
    sendResponse({ success: true });
  } else if (request.action === 'downloadModel') {
    chrome.downloads.download({
      url: request.url,
      filename: request.filename,
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId });
      }
    });
    return true; // Keep channel open for async response
  }

  return true;
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabModels.delete(tabId);
});

// Clean up old entries when tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    tabModels.delete(tabId);
    chrome.action.setBadgeText({ tabId, text: '' });
  }
});
