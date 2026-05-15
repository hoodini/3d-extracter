// Content script — scrape DOM, inline scripts, and attributes for 3D model URLs.
(function () {
  'use strict';

  const EXTENSIONS = [
    'glb', 'gltf', 'm3f', '3mf', 'fbx', 'obj', 'usdz', 'usdc', 'usd',
    'stl', 'ply', 'dae', '3ds', 'blend', 'x3d', 'vrml'
  ];

  // Build a single regex for fast scanning of inline content.
  const urlPattern = new RegExp(
    `https?:\\/\\/[^\\s"'<>\\)\\]]+?\\.(?:${EXTENSIONS.join('|')})(?:\\?[^\\s"'<>\\)\\]]*)?`,
    'gi'
  );

  // Resolve relative URLs against the current document.
  function absolutize(value) {
    try {
      return new URL(value, document.baseURI).href;
    } catch (e) {
      return null;
    }
  }

  function looksLikeModel(value) {
    if (!value) return false;
    const v = String(value).toLowerCase();
    return EXTENSIONS.some(ext => v.includes('.' + ext));
  }

  function searchForModels() {
    const found = new Set();

    // 1. Inline <script> blocks.
    document.querySelectorAll('script').forEach((script) => {
      if (!script.textContent) return;
      const matches = script.textContent.match(urlPattern);
      if (matches) matches.forEach((u) => found.add(u));
    });

    // 2. Data-* attributes commonly used by 3D viewers.
    const dataAttrs = ['data-src', 'data-url', 'data-model', 'data-glb', 'data-gltf', 'data-asset', 'data-file', 'data-href'];
    document.querySelectorAll('*').forEach((el) => {
      for (const attr of dataAttrs) {
        const value = el.getAttribute(attr);
        if (looksLikeModel(value)) {
          const abs = absolutize(value);
          if (abs) found.add(abs);
        }
      }
    });

    // 3. Anchor links + iframe sources.
    document.querySelectorAll('a[href], iframe[src], source[src]').forEach((el) => {
      const value = el.getAttribute('href') || el.getAttribute('src');
      if (looksLikeModel(value)) {
        const abs = absolutize(value);
        if (abs) found.add(abs);
      }
    });

    // 4. <model-viewer>, <a-asset-item>, <model-entity>, custom viewers.
    document.querySelectorAll('model-viewer, a-asset-item, [src], [data-model-src]').forEach((el) => {
      const candidates = [
        el.getAttribute && el.getAttribute('src'),
        el.getAttribute && el.getAttribute('data-model-src'),
        el.getAttribute && el.getAttribute('ios-src')
      ];
      candidates.forEach((value) => {
        if (looksLikeModel(value)) {
          const abs = absolutize(value);
          if (abs) found.add(abs);
        }
      });
    });

    // 5. Stylesheets — some sites reference assets in CSS variables / url().
    try {
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch (e) { continue; } // cross-origin
        if (!rules) continue;
        for (const rule of rules) {
          const text = rule.cssText || '';
          const matches = text.match(urlPattern);
          if (matches) matches.forEach((u) => found.add(u));
        }
      }
    } catch (e) {
      // ignore — best effort
    }

    if (found.size > 0) {
      chrome.runtime.sendMessage({
        action: 'foundModels',
        models: Array.from(found)
      });
    }
  }

  // Initial sweep + watch for late-loaded content.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', searchForModels);
  } else {
    searchForModels();
  }

  let lastRun = 0;
  const observer = new MutationObserver(() => {
    const now = Date.now();
    if (now - lastRun < 500) return; // throttle
    lastRun = now;
    searchForModels();
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Disconnect after a generous window — we still have the network layer running.
  setTimeout(() => observer.disconnect(), 60_000);
})();
