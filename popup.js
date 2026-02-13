// Popup script
let currentTabId = null;

// Get current tab and load models
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    currentTabId = tabs[0].id;
    loadModels();
  }
});

function loadModels() {
  chrome.runtime.sendMessage(
    { action: 'getModels', tabId: currentTabId },
    (response) => {
      displayModels(response.models || []);
    }
  );
}

function displayModels(models) {
  const statusEl = document.getElementById('status');
  const containerEl = document.getElementById('models-container');

  containerEl.textContent = '';

  if (models.length === 0) {
    statusEl.className = 'status empty';
    statusEl.textContent = '';

    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';

    const icon = document.createElement('div');
    icon.className = 'empty-icon';
    icon.textContent = '🔍';

    const text = document.createElement('div');
    text.className = 'empty-text';
    text.textContent = 'No 3D models detected yet.';
    const br = document.createElement('br');
    text.appendChild(br);
    text.appendChild(document.createTextNode('Browse a page with GLB/GLTF files or refresh the page.'));

    emptyState.appendChild(icon);
    emptyState.appendChild(text);
    statusEl.appendChild(emptyState);
    return;
  }

  statusEl.className = 'status success';
  statusEl.textContent = `Found ${models.length} 3D model${models.length > 1 ? 's' : ''}`;

  const listEl = document.createElement('div');
  listEl.className = 'models-list';

  models.forEach((model) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'model-item';

    // Format file size
    let sizeText = 'Unknown size';
    if (model.size && model.size !== 'Unknown') {
      const bytes = parseInt(model.size);
      if (!isNaN(bytes)) {
        sizeText = formatBytes(bytes);
      }
    }

    // Create header
    const header = document.createElement('div');
    header.className = 'model-header';

    const filename = document.createElement('div');
    filename.className = 'model-filename';
    filename.textContent = model.filename;

    const size = document.createElement('div');
    size.className = 'model-size';
    size.textContent = sizeText;

    header.appendChild(filename);
    header.appendChild(size);

    // Create URL display
    const urlDiv = document.createElement('div');
    urlDiv.className = 'model-url';
    urlDiv.textContent = truncateUrl(model.url);

    // Create actions
    const actions = document.createElement('div');
    actions.className = 'model-actions';

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-download';
    downloadBtn.textContent = '⬇️ Download';
    downloadBtn.dataset.url = model.url;
    downloadBtn.dataset.filename = model.filename;
    downloadBtn.addEventListener('click', handleDownload);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-copy';
    copyBtn.textContent = '📋 Copy URL';
    copyBtn.dataset.url = model.url;
    copyBtn.addEventListener('click', handleCopy);

    actions.appendChild(downloadBtn);
    actions.appendChild(copyBtn);

    itemEl.appendChild(header);
    itemEl.appendChild(urlDiv);
    itemEl.appendChild(actions);

    listEl.appendChild(itemEl);
  });

  containerEl.appendChild(listEl);

  // Add clear button
  const clearBtn = document.createElement('button');
  clearBtn.className = 'btn-clear';
  clearBtn.textContent = '🗑️ Clear List';
  clearBtn.addEventListener('click', clearModels);
  containerEl.appendChild(clearBtn);
}

function handleDownload(e) {
  const url = e.target.dataset.url;
  const filename = e.target.dataset.filename;

  e.target.textContent = '⏳ Downloading...';
  e.target.disabled = true;

  chrome.runtime.sendMessage(
    { action: 'downloadModel', url, filename },
    (response) => {
      if (response.success) {
        e.target.textContent = '✅ Downloaded';
        setTimeout(() => {
          e.target.textContent = '⬇️ Download';
          e.target.disabled = false;
        }, 2000);
      } else {
        e.target.textContent = '❌ Failed';
        console.error('Download failed:', response.error);
        setTimeout(() => {
          e.target.textContent = '⬇️ Download';
          e.target.disabled = false;
        }, 2000);
      }
    }
  );
}

function handleCopy(e) {
  const url = e.target.dataset.url;

  navigator.clipboard.writeText(url).then(() => {
    const originalText = e.target.textContent;
    e.target.textContent = '✅ Copied!';
    setTimeout(() => {
      e.target.textContent = originalText;
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

function clearModels() {
  chrome.runtime.sendMessage(
    { action: 'clearModels', tabId: currentTabId },
    () => {
      loadModels();
    }
  );
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function truncateUrl(url) {
  if (url.length <= 60) return url;
  return url.substring(0, 40) + '...' + url.substring(url.length - 17);
}

// Auto-refresh every 2 seconds
setInterval(loadModels, 2000);
