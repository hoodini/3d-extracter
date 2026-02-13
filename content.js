// Content script to search for GLB files in the page
(function() {
  'use strict';

  // Search for GLB/GLTF URLs in the page
  function searchForModels() {
    const models = new Set();

    // Search in all script tags
    document.querySelectorAll('script').forEach(script => {
      const content = script.textContent;
      const matches = content.match(/https?:\/\/[^\s"']+\.glb|https?:\/\/[^\s"']+\.gltf/gi);
      if (matches) {
        matches.forEach(url => models.add(url));
      }
    });

    // Search in data attributes
    document.querySelectorAll('[data-src], [data-url], [data-model]').forEach(el => {
      const attrs = ['data-src', 'data-url', 'data-model'];
      attrs.forEach(attr => {
        const value = el.getAttribute(attr);
        if (value && (value.includes('.glb') || value.includes('.gltf'))) {
          models.add(value);
        }
      });
    });

    // Search in all links and anchors
    document.querySelectorAll('a[href*=".glb"], a[href*=".gltf"]').forEach(a => {
      models.add(a.href);
    });

    // Search for blob URLs in canvas or model viewers
    document.querySelectorAll('canvas, model-viewer').forEach(el => {
      if (el.src && (el.src.includes('.glb') || el.src.includes('.gltf'))) {
        models.add(el.src);
      }
    });

    // Send found models to background script
    if (models.size > 0) {
      chrome.runtime.sendMessage({
        action: 'foundModels',
        models: Array.from(models)
      });
    }
  }

  // Run search when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', searchForModels);
  } else {
    searchForModels();
  }

  // Monitor for dynamically added content
  const observer = new MutationObserver(() => {
    searchForModels();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Stop observing after 30 seconds to avoid performance issues
  setTimeout(() => {
    observer.disconnect();
  }, 30000);

})();
