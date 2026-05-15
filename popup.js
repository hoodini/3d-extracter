// 3D Model Extractor popup — Models tab + Network Inspector tab.

let currentTabId = null;
let networkFilter = { text: '', type: '', minSize: 0, flaggedOnly: false };
let expandedRequestIds = new Set();

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    currentTabId = tabs[0].id;
    refresh();
  }
});

// --- tab switching -----------------------------------------------------------
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
  });
});

// --- filter wiring -----------------------------------------------------------
document.getElementById('filter-input').addEventListener('input', (e) => {
  networkFilter.text = e.target.value.toLowerCase();
  renderRequests();
});
document.getElementById('filter-type').addEventListener('change', (e) => {
  networkFilter.type = e.target.value;
  renderRequests();
});
document.getElementById('filter-min-size').addEventListener('change', (e) => {
  networkFilter.minSize = parseInt(e.target.value, 10) || 0;
  renderRequests();
});
document.getElementById('only-flagged').addEventListener('click', (e) => {
  networkFilter.flaggedOnly = !networkFilter.flaggedOnly;
  e.target.style.background = networkFilter.flaggedOnly ? '#667eea' : '#2d2d2d';
  e.target.style.color = networkFilter.flaggedOnly ? '#fff' : '#e0e0e0';
  renderRequests();
});
document.getElementById('clear-requests').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'clearRequests', tabId: currentTabId }, refresh);
});

// --- data loading ------------------------------------------------------------
let cachedModels = [];
let cachedRequests = [];

function refresh() {
  chrome.runtime.sendMessage({ action: 'getModels', tabId: currentTabId }, (resp) => {
    cachedModels = (resp && resp.models) || [];
    renderModels();
    document.getElementById('models-count').textContent = cachedModels.length;
  });
  chrome.runtime.sendMessage({ action: 'getRequests', tabId: currentTabId }, (resp) => {
    cachedRequests = (resp && resp.requests) || [];
    renderRequests();
    document.getElementById('network-count').textContent = cachedRequests.length;
  });
}

// --- models rendering --------------------------------------------------------
function renderModels() {
  const statusEl = document.getElementById('models-status');
  const containerEl = document.getElementById('models-container');
  containerEl.textContent = '';

  if (cachedModels.length === 0) {
    statusEl.className = 'status empty';
    statusEl.textContent = '';
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const icon = document.createElement('div');
    icon.className = 'empty-icon';
    icon.textContent = '🔍';
    const text = document.createElement('div');
    text.className = 'empty-text';
    text.textContent = 'No 3D models detected yet.';
    text.appendChild(document.createElement('br'));
    text.appendChild(document.createTextNode('Browse a page with 3D content, or open the Network tab to flag a request manually.'));
    empty.appendChild(icon);
    empty.appendChild(text);
    statusEl.appendChild(empty);
    return;
  }

  statusEl.className = 'status success';
  statusEl.textContent = `Found ${cachedModels.length} model${cachedModels.length > 1 ? 's' : ''}`;

  const list = document.createElement('div');
  list.className = 'models-list';

  cachedModels.forEach((model) => {
    const item = document.createElement('div');
    item.className = 'model-item';

    const header = document.createElement('div');
    header.className = 'model-header';

    const fname = document.createElement('div');
    fname.className = 'model-filename';

    const fmt = document.createElement('span');
    const formatKey = (model.format || 'unknown').toLowerCase();
    fmt.className = 'badge fmt fmt-' + formatKey;
    fmt.textContent = formatKey;
    fname.appendChild(fmt);

    if (model.confidence && model.confidence !== 'high') {
      const conf = document.createElement('span');
      conf.className = 'badge conf-' + model.confidence;
      conf.textContent = model.confidence;
      fname.appendChild(conf);
    }

    fname.appendChild(document.createTextNode(' ' + model.filename));

    const size = document.createElement('div');
    size.className = 'model-size';
    size.textContent = formatSize(model.size);

    header.appendChild(fname);
    header.appendChild(size);

    const urlDiv = document.createElement('div');
    urlDiv.className = 'model-url';
    urlDiv.textContent = truncate(model.url, 80);
    urlDiv.title = model.url;

    const actions = document.createElement('div');
    actions.className = 'model-actions';

    const dlBtn = document.createElement('button');
    dlBtn.className = 'btn btn-download';
    dlBtn.textContent = '⬇️ Download';
    dlBtn.addEventListener('click', () => downloadModel(dlBtn, model.url, model.filename));
    actions.appendChild(dlBtn);

    const idBtn = document.createElement('button');
    idBtn.className = 'btn btn-identify';
    idBtn.textContent = '🔍 Identify';
    idBtn.title = 'Fetch the first 8KB and identify the real file format from its magic bytes.';
    idBtn.addEventListener('click', () => identifyModel(idBtn, item, model));
    actions.appendChild(idBtn);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-copy';
    copyBtn.textContent = '📋 Copy URL';
    copyBtn.addEventListener('click', () => copyUrl(copyBtn, model.url));
    actions.appendChild(copyBtn);

    if ((model.format || '').toLowerCase() === 'glb') {
      const stlBtn = document.createElement('button');
      stlBtn.className = 'btn btn-convert';
      stlBtn.textContent = '→ STL';
      stlBtn.title = 'Convert GLB to binary STL for Bambu Studio / any slicer.';
      stlBtn.addEventListener('click', () => convertAndDownload(stlBtn, model, 'stl'));
      actions.appendChild(stlBtn);

      const mfBtn = document.createElement('button');
      mfBtn.className = 'btn btn-convert';
      mfBtn.textContent = '→ 3MF';
      mfBtn.title = 'Convert GLB to 3MF (Bambu Studio native format).';
      mfBtn.addEventListener('click', () => convertAndDownload(mfBtn, model, '3mf'));
      actions.appendChild(mfBtn);
    }

    item.appendChild(header);
    item.appendChild(urlDiv);
    item.appendChild(actions);

    if (model.detected) {
      item.appendChild(renderIdentifyResult(model.detected, null));
    }

    list.appendChild(item);
  });

  containerEl.appendChild(list);

  const clearBtn = document.createElement('button');
  clearBtn.className = 'btn-clear';
  clearBtn.textContent = '🗑️ Clear Models';
  clearBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'clearModels', tabId: currentTabId }, refresh);
  });
  containerEl.appendChild(clearBtn);
}

// --- network rendering -------------------------------------------------------
function renderRequests() {
  const tableEl = document.getElementById('req-table');
  const counterEl = document.getElementById('req-count-text');
  tableEl.textContent = '';

  const filtered = cachedRequests.filter((r) => {
    if (networkFilter.flaggedOnly && !r.flagged) return false;
    if (networkFilter.type && r.type !== networkFilter.type) return false;
    if (networkFilter.minSize && (!r.size || r.size < networkFilter.minSize)) return false;
    if (networkFilter.text) {
      const hay = (r.url + ' ' + (r.contentType || '')).toLowerCase();
      if (!hay.includes(networkFilter.text)) return false;
    }
    return true;
  });

  counterEl.textContent = `${filtered.length} of ${cachedRequests.length} requests`;

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.style.padding = '40px 20px';
    empty.style.textAlign = 'center';
    empty.style.color = '#666';
    empty.style.fontSize = '12px';
    empty.textContent = cachedRequests.length === 0
      ? 'No traffic captured yet. Reload the page with the popup open.'
      : 'No requests match the current filters.';
    tableEl.appendChild(empty);
    return;
  }

  // Most recent first.
  const sorted = filtered.slice().reverse();

  sorted.forEach((req) => {
    const row = document.createElement('div');
    row.className = 'req-row' + (req.flagged ? ' flagged' : '') + (expandedRequestIds.has(req.requestId) ? ' expanded' : '');

    const grid = document.createElement('div');
    grid.className = 'req-grid';

    const type = document.createElement('div');
    type.className = 'req-type';
    type.textContent = shortType(req.type);

    const url = document.createElement('div');
    url.className = 'req-url';
    url.textContent = shortUrl(req.url);
    url.title = req.url;

    const size = document.createElement('div');
    size.className = 'req-size';
    size.textContent = formatSize(req.size);

    const status = document.createElement('div');
    const statusClass = req.status === null ? '' :
      req.status >= 500 ? 's-5' :
      req.status >= 400 ? 's-4' :
      req.status >= 300 ? 's-3' :
      req.status >= 200 ? 's-200' : '';
    status.className = 'req-status ' + statusClass;
    status.textContent = req.status === null ? '…' : req.status < 0 ? 'err' : req.status;

    grid.appendChild(type);
    grid.appendChild(url);
    grid.appendChild(size);
    grid.appendChild(status);
    row.appendChild(grid);

    // Detail panel
    const detail = document.createElement('div');
    detail.className = 'req-detail';

    const kvs = [
      ['URL', req.url],
      ['Method', req.method],
      ['Type', req.type],
      ['Content-Type', req.contentType || '—'],
      ['Size', formatSize(req.size)],
      ['Status', req.status === null ? 'pending' : req.status]
    ];
    kvs.forEach(([k, v]) => {
      const kv = document.createElement('div');
      kv.className = 'kv';
      const ke = document.createElement('div');
      ke.className = 'k';
      ke.textContent = k;
      const ve = document.createElement('div');
      ve.className = 'v';
      ve.textContent = v;
      kv.appendChild(ke);
      kv.appendChild(ve);
      detail.appendChild(kv);
    });

    const detailActions = document.createElement('div');
    detailActions.className = 'req-actions';

    const flagBtn = document.createElement('button');
    flagBtn.className = 'btn btn-flag';
    flagBtn.textContent = req.flagged ? '✓ Flagged as model' : '🏷️ Flag as model';
    flagBtn.disabled = req.flagged;
    flagBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      chrome.runtime.sendMessage(
        { action: 'flagAsModel', tabId: currentTabId, url: req.url },
        () => refresh()
      );
    });
    detailActions.appendChild(flagBtn);

    const dlBtn = document.createElement('button');
    dlBtn.className = 'btn btn-download';
    dlBtn.textContent = '⬇️ Download';
    dlBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      downloadModel(dlBtn, req.url, guessFilename(req.url));
    });
    detailActions.appendChild(dlBtn);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-copy';
    copyBtn.textContent = '📋 Copy';
    copyBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      copyUrl(copyBtn, req.url);
    });
    detailActions.appendChild(copyBtn);

    detail.appendChild(detailActions);
    row.appendChild(detail);

    row.addEventListener('click', () => {
      if (expandedRequestIds.has(req.requestId)) {
        expandedRequestIds.delete(req.requestId);
        row.classList.remove('expanded');
      } else {
        expandedRequestIds.add(req.requestId);
        row.classList.add('expanded');
      }
    });

    tableEl.appendChild(row);
  });
}

// --- shared helpers ----------------------------------------------------------
function downloadModel(btn, url, filename) {
  const original = btn.textContent;
  btn.textContent = '⏳ Downloading...';
  btn.disabled = true;
  chrome.runtime.sendMessage(
    { action: 'downloadModel', url, filename },
    (resp) => {
      if (resp && resp.success) {
        btn.textContent = '✅ Downloaded';
      } else {
        btn.textContent = '❌ Failed';
        if (resp && resp.error) console.error('Download failed:', resp.error);
      }
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 1800);
    }
  );
}

async function convertAndDownload(btn, model, format) {
  if (typeof GLBConverter === 'undefined') {
    alert('Converter script not loaded. Reload the extension.');
    return;
  }

  const original = btn.textContent;
  btn.textContent = '⏳ ' + format.toUpperCase() + '…';
  btn.disabled = true;

  const opts = {
    rotateYupToZup: document.getElementById('opt-rotate').checked,
    scale: document.getElementById('opt-scale').checked ? 1000 : 1
  };

  try {
    const { bytes, triangleCount } = await GLBConverter.convertGlb(model.url, format, opts);

    const mime = format === 'stl'
      ? 'application/vnd.ms-pki.stl'
      : 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml';
    const blob = new Blob([bytes], { type: mime });
    const blobUrl = URL.createObjectURL(blob);
    const filename = (model.filename || 'model.glb').replace(/\.[a-z0-9]+$/i, '') + '.' + format;

    chrome.downloads.download({ url: blobUrl, filename, saveAs: true }, () => {
      // Hold the blob URL alive long enough for the download to complete.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      if (chrome.runtime.lastError) {
        btn.textContent = '❌ ' + chrome.runtime.lastError.message.substring(0, 18);
      } else {
        btn.textContent = '✅ ' + triangleCount.toLocaleString() + '△';
      }
      setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 3000);
    });
  } catch (e) {
    console.error('Conversion failed:', e);
    btn.textContent = '❌ Failed';
    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 3000);
    alert('Conversion failed:\n\n' + e.message);
  }
}

function identifyModel(btn, item, model) {
  const original = btn.textContent;
  btn.textContent = '⏳ Identifying...';
  btn.disabled = true;
  chrome.runtime.sendMessage(
    { action: 'identifyModel', tabId: currentTabId, url: model.url },
    (resp) => {
      btn.disabled = false;
      btn.textContent = original;
      if (!resp || !resp.success) {
        const err = renderIdentifyResult({
          format: 'unknown',
          confidence: 'none',
          hint: (resp && resp.error) || 'Identify failed.'
        }, null);
        replaceOrAppendResult(item, err);
        return;
      }
      const block = renderIdentifyResult(resp.result, resp.siblingGltf);
      replaceOrAppendResult(item, block);
      // Refresh so renamed filename/format show up in the header.
      refresh();
    }
  );
}

function replaceOrAppendResult(item, newBlock) {
  const existing = item.querySelector('.identify-result');
  if (existing) existing.replaceWith(newBlock);
  else item.appendChild(newBlock);
}

function renderIdentifyResult(result, siblingGltf) {
  const block = document.createElement('div');
  const conf = result.confidence || 'low';
  block.className = 'identify-result ' + (conf === 'high' ? 'high' : conf === 'medium' ? 'medium' : 'low');

  const verdict = document.createElement('div');
  verdict.className = 'verdict';
  if (result.format && result.format !== 'unknown' && result.format !== 'bin') {
    verdict.textContent = `Detected: .${result.format}  (${conf} confidence)`;
  } else if (result.format === 'bin') {
    verdict.textContent = `Detected: raw binary buffer  (low confidence)`;
  } else {
    verdict.textContent = 'Could not identify format';
  }
  block.appendChild(verdict);

  if (result.hint) {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = result.hint;
    block.appendChild(hint);
  }

  if (siblingGltf) {
    const sib = document.createElement('div');
    sib.className = 'sibling';
    sib.appendChild(document.createTextNode('Found a sibling .gltf in this tab: '));
    const link = document.createElement('a');
    link.textContent = 'flag + download it';
    link.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'flagAsModel', tabId: currentTabId, url: siblingGltf }, () => refresh());
    });
    sib.appendChild(link);
    block.appendChild(sib);
  } else if (result.format === 'bin') {
    const sib = document.createElement('div');
    sib.className = 'sibling';
    sib.textContent = 'No sibling .gltf found in this tab\'s request log. Try reloading the page with the extension popup open so we can capture it.';
    block.appendChild(sib);
  }

  return block;
}

function copyUrl(btn, url) {
  const original = btn.textContent;
  navigator.clipboard.writeText(url).then(() => {
    btn.textContent = '✅ Copied';
    setTimeout(() => { btn.textContent = original; }, 1500);
  }).catch((err) => {
    console.error('Copy failed:', err);
    btn.textContent = '❌ Copy failed';
    setTimeout(() => { btn.textContent = original; }, 1500);
  });
}

function guessFilename(url) {
  try {
    const u = new URL(url);
    const path = u.pathname;
    let last = path.substring(path.lastIndexOf('/') + 1) || 'model.bin';
    last = last.split('?')[0].split('#')[0];
    if (!/\.[a-z0-9]{2,6}$/i.test(last)) last += '.bin';
    return last;
  } catch (e) {
    return 'model.bin';
  }
}

function formatSize(bytes) {
  if (bytes === null || bytes === undefined || bytes === 'Unknown') return '—';
  const n = typeof bytes === 'number' ? bytes : parseInt(bytes, 10);
  if (!Number.isFinite(n) || n <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return (n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

function truncate(s, max) {
  if (!s || s.length <= max) return s;
  return s.substring(0, Math.floor(max * 0.6)) + '…' + s.substring(s.length - Math.floor(max * 0.3));
}

function shortUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 50 ? '…' + u.pathname.slice(-47) : u.pathname;
    return u.hostname + path;
  } catch (e) {
    return truncate(url, 70);
  }
}

function shortType(type) {
  const map = {
    xmlhttprequest: 'XHR',
    stylesheet: 'CSS',
    main_frame: 'DOC',
    sub_frame: 'FRM'
  };
  return map[type] || type;
}

// Live refresh while popup is open.
setInterval(refresh, 1500);
