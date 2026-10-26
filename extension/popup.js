// State
let scannedBookmarks = [];
let scannedFolders = [];
let scannedFoldersCount = 0;
let detectedBrowser = 'Chrome';

// DOM Elements
const serverUrlInput = document.getElementById('serverUrl');
const browserSelect = document.getElementById('browserSelect');
const browserLabel = document.getElementById('browserLabel');
const testConnectionBtn = document.getElementById('testConnectionBtn');
const connectionDot = document.getElementById('connectionDot');
const statBookmarkCount = document.getElementById('statBookmarkCount');
const statFolderCount = document.getElementById('statFolderCount');
const scanStatusBadge = document.getElementById('scanStatusBadge');
const scanBtn = document.getElementById('scanBtn');
const importBtn = document.getElementById('importBtn');
const openWebAppBtn = document.getElementById('openWebAppBtn');
const statusMessage = document.getElementById('statusMessage');
const statusText = document.getElementById('statusText');

// Browser Detection
async function detectBrowser() {
  if (typeof navigator !== 'undefined') {
    if (navigator.brave && (await navigator.brave.isBrave())) {
      return 'Brave';
    }
    const ua = navigator.userAgent;
    if (ua.includes('Firefox/')) return 'Firefox';
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
    if (ua.includes('Vivaldi/')) return 'Vivaldi';
    if (ua.includes('Chrome/')) return 'Chrome';
    if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
  }
  return 'Chrome';
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Detect browser
  detectedBrowser = await detectBrowser();
  if (browserSelect) {
    browserSelect.value = detectedBrowser;
  }
  if (browserLabel) {
    browserLabel.textContent = `${detectedBrowser} Extension`;
  }

  // Presets & Server URL Elements
  const presetProd = document.getElementById('presetProd');
  const presetLocal = document.getElementById('presetLocal');

  function updatePresetChips(url) {
    const clean = (url || '').trim().toLowerCase().replace(/\/+$/, '');
    if (clean.includes('swipemark.himanshutamoli.site')) {
      presetProd?.classList.add('active');
      presetLocal?.classList.remove('active');
    } else if (clean.includes('localhost') || clean.includes('127.0.0.1')) {
      presetLocal?.classList.add('active');
      presetProd?.classList.remove('active');
    } else {
      presetProd?.classList.remove('active');
      presetLocal?.classList.remove('active');
    }
  }

  // Load saved server URL (default to production)
  const savedUrl = await getStoredSetting('serverUrl');
  if (savedUrl) {
    serverUrlInput.value = savedUrl;
  } else {
    serverUrlInput.value = 'https://swipemark.himanshutamoli.site';
    saveStoredSetting('serverUrl', 'https://swipemark.himanshutamoli.site');
  }
  updatePresetChips(serverUrlInput.value);

  // Check server connection
  checkServerConnection();

  // Initial scan automatically
  scanBrowserBookmarks();

  // Event Listeners for Presets
  presetProd?.addEventListener('click', () => {
    serverUrlInput.value = 'https://swipemark.himanshutamoli.site';
    updatePresetChips(serverUrlInput.value);
    saveStoredSetting('serverUrl', serverUrlInput.value);
    checkServerConnection();
  });

  presetLocal?.addEventListener('click', () => {
    serverUrlInput.value = 'http://localhost:3000';
    updatePresetChips(serverUrlInput.value);
    saveStoredSetting('serverUrl', serverUrlInput.value);
    checkServerConnection();
  });

  // Event Listeners
  serverUrlInput.addEventListener('input', () => {
    updatePresetChips(serverUrlInput.value);
  });

  serverUrlInput.addEventListener('change', () => {
    const trimmed = serverUrlInput.value.trim().replace(/\/+$/, '');
    serverUrlInput.value = trimmed;
    updatePresetChips(trimmed);
    saveStoredSetting('serverUrl', trimmed);
    checkServerConnection();
  });

  browserSelect?.addEventListener('change', () => {
    detectedBrowser = browserSelect.value;
    if (browserLabel) {
      browserLabel.textContent = `${detectedBrowser} Extension`;
    }
    scanBrowserBookmarks();
  });

  testConnectionBtn.addEventListener('click', checkServerConnection);
  scanBtn.addEventListener('click', scanBrowserBookmarks);
  importBtn.addEventListener('click', importBookmarksToServer);

  openWebAppBtn.addEventListener('click', () => {
    const targetUrl = serverUrlInput.value.trim().replace(/\/+$/, '') || 'https://swipemark.himanshutamoli.site';
    if (chrome?.tabs?.create) {
      chrome.tabs.create({ url: targetUrl });
    } else {
      window.open(targetUrl, '_blank');
    }
  });

  // Focus New Tab Screen Toggle & Preview
  const popupNewTabToggle = document.getElementById('popupNewTabToggle');
  const popupNewTabSlider = document.getElementById('popupNewTabSlider');
  const openNewTabBtn = document.getElementById('openNewTabBtn');

  if (popupNewTabToggle) {
    if (chrome?.storage?.local) {
      chrome.storage.local.get(['swipemark_newtab_settings'], (result) => {
        const settings = result?.swipemark_newtab_settings;
        const enabled = settings ? settings.enabled !== false : true;
        popupNewTabToggle.checked = enabled;
        if (popupNewTabSlider) {
          popupNewTabSlider.style.backgroundColor = enabled ? '#86efac' : '#e4e4e7';
        }
      });
    }

    popupNewTabToggle.addEventListener('change', (e) => {
      const isEnabled = e.target.checked;
      if (popupNewTabSlider) {
        popupNewTabSlider.style.backgroundColor = isEnabled ? '#86efac' : '#e4e4e7';
      }
      if (chrome?.storage?.local) {
        chrome.storage.local.get(['swipemark_newtab_settings'], (result) => {
          const current = result?.swipemark_newtab_settings || {};
          current.enabled = isEnabled;
          chrome.storage.local.set({ swipemark_newtab_settings: current });
        });
      }
    });
  }

  if (openNewTabBtn) {
    openNewTabBtn.addEventListener('click', () => {
      if (chrome?.tabs?.create) {
        chrome.tabs.create({ url: 'newtab.html' });
      } else {
        window.open('newtab.html', '_blank');
      }
    });
  }
});

// Storage Helper (supports sync and local storage seamlessly)
function getStoredSetting(key) {
  return new Promise((resolve) => {
    if (chrome?.storage?.sync) {
      chrome.storage.sync.get([key], (syncRes) => {
        if (!chrome.runtime.lastError && syncRes && syncRes[key] !== undefined) {
          return resolve(syncRes[key]);
        }
        if (chrome?.storage?.local) {
          chrome.storage.local.get([key], (localRes) => {
            resolve(localRes ? localRes[key] : undefined);
          });
        } else {
          resolve(undefined);
        }
      });
    } else if (chrome?.storage?.local) {
      chrome.storage.local.get([key], (result) => resolve(result ? result[key] : undefined));
    } else {
      resolve(localStorage.getItem(key));
    }
  });
}

function saveStoredSetting(key, val) {
  if (chrome?.storage?.sync) {
    chrome.storage.sync.set({ [key]: val }, () => {
      if (chrome.runtime.lastError && chrome?.storage?.local) {
        chrome.storage.local.set({ [key]: val });
      }
    });
  }
  if (chrome?.storage?.local) {
    chrome.storage.local.set({ [key]: val });
  }
  try {
    localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
  } catch {}
}

// Check Connection to Next.js API
async function checkServerConnection() {
  connectionDot.className = 'status-dot checking';
  connectionDot.title = 'Checking server connection...';
  const baseUrl = serverUrlInput.value.trim().replace(/\/+$/, '');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${baseUrl}/api/bookmarks/stats`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      connectionDot.className = 'status-dot connected';
      connectionDot.title = 'Connected to Bookmark Swipe backend';
      return true;
    } else {
      connectionDot.className = 'status-dot disconnected';
      connectionDot.title = `Server returned status: ${res.status}`;
      return false;
    }
  } catch (err) {
    connectionDot.className = 'status-dot disconnected';
    connectionDot.title = 'Cannot connect to backend server. Make sure Next.js is running.';
    return false;
  }
}

// Recursive Bookmark Tree Extraction
function traverseBookmarkTree(
  nodes,
  currentPath = [],
  results = { bookmarks: [], folders: [], folderNames: new Set() },
  browser = 'Chrome'
) {
  for (const node of nodes) {
    if (node.url) {
      // It's a bookmark URL
      const trimmedUrl = node.url.trim();
      // Filter out internal and non-http(s) urls
      if (
        trimmedUrl.startsWith('http://') ||
        trimmedUrl.startsWith('https://')
      ) {
        results.bookmarks.push({
          chromeId: String(node.id),
          chromeParentId: node.parentId ? String(node.parentId) : '1',
          index: typeof node.index === 'number' ? node.index : 0,
          title: node.title ? node.title.trim() : new URL(trimmedUrl).hostname,
          url: trimmedUrl,
          folder: currentPath.length > 0 ? currentPath.join(' / ') : 'Bookmarks Bar',
          browser: browser,
          dateAdded: node.dateAdded ? new Date(node.dateAdded).toISOString() : new Date().toISOString()
        });
      }
    } else {
      // It's a folder
      const folderTitle = node.title ? node.title.trim() : '';
      const nextPath = folderTitle ? [...currentPath, folderTitle] : currentPath;
      if (folderTitle) {
        results.folderNames.add(folderTitle);
        results.folders.push({
          chromeId: String(node.id),
          chromeParentId: node.parentId ? String(node.parentId) : '',
          title: folderTitle,
          fullPath: nextPath.join(' / '),
          browser: browser,
        });
      }
      if (node.children && node.children.length > 0) {
        traverseBookmarkTree(node.children, nextPath, results, browser);
      }
    }
  }
  return results;
}

// Scan Browser Bookmarks
async function scanBrowserBookmarks() {
  scanStatusBadge.textContent = 'Scanning...';
  scanStatusBadge.className = 'badge';
  showMessage(`Scanning ${detectedBrowser} bookmarks...`, 'info');

  try {
    if (chrome?.bookmarks?.getTree) {
      chrome.bookmarks.getTree((tree) => {
        const extracted = traverseBookmarkTree(tree, [], { bookmarks: [], folders: [], folderNames: new Set() }, detectedBrowser);
        scannedBookmarks = extracted.bookmarks;
        scannedFolders = extracted.folders;
        scannedFoldersCount = extracted.folderNames.size;

        updateScanUI();
      });
    } else {
      // Fallback for non-extension preview / development
      scannedBookmarks = [
        {
          chromeId: "mock-1",
          chromeParentId: "1",
          index: 0,
          title: "Next.js Documentation",
          url: "https://nextjs.org/docs",
          folder: "Development / React",
          browser: detectedBrowser,
          dateAdded: new Date().toISOString()
        },
        {
          chromeId: "mock-2",
          chromeParentId: "1",
          index: 1,
          title: "Tailwind CSS Components",
          url: "https://tailwindcss.com",
          folder: "Development / CSS",
          browser: detectedBrowser,
          dateAdded: new Date().toISOString()
        },
        {
          chromeId: "mock-3",
          chromeParentId: "2",
          index: 0,
          title: "GitHub Trending Repositories",
          url: "https://github.com/trending",
          folder: "Daily / Tech",
          browser: detectedBrowser,
          dateAdded: new Date().toISOString()
        }
      ];
      scannedFolders = [
        { chromeId: "mock-folder-1", title: "Development", fullPath: "Development", browser: detectedBrowser },
        { chromeId: "mock-folder-2", title: "React", fullPath: "Development / React", browser: detectedBrowser },
        { chromeId: "mock-folder-3", title: "CSS", fullPath: "Development / CSS", browser: detectedBrowser },
        { chromeId: "mock-folder-4", title: "Daily", fullPath: "Daily", browser: detectedBrowser },
        { chromeId: "mock-folder-5", title: "Tech", fullPath: "Daily / Tech", browser: detectedBrowser }
      ];
      scannedFoldersCount = 5;
      updateScanUI();
    }
  } catch (error) {
    console.error('Scan error:', error);
    showMessage(`Scan failed: ${error.message}`, 'error');
    scanStatusBadge.textContent = 'Error';
  }
}

function updateScanUI() {
  statBookmarkCount.textContent = scannedBookmarks.length;
  statFolderCount.textContent = scannedFoldersCount;
  scanStatusBadge.textContent = `${scannedBookmarks.length} Found`;
  scanStatusBadge.className = 'badge success';

  if (scannedBookmarks.length > 0) {
    importBtn.disabled = false;
    showMessage(`Found ${scannedBookmarks.length} ${detectedBrowser} bookmarks across ${scannedFoldersCount} folders.`, 'info');
  } else {
    importBtn.disabled = true;
    showMessage(`No bookmarks detected in ${detectedBrowser}.`, 'info');
  }
}

// Send Bookmarks & Folders to Next.js API
async function importBookmarksToServer() {
  if (scannedBookmarks.length === 0) {
    showMessage('No bookmarks to import.', 'error');
    return;
  }

  const baseUrl = serverUrlInput.value.trim().replace(/\/+$/, '');
  importBtn.disabled = true;
  importBtn.innerHTML = `
    <svg class="spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    Importing...
  `;
  showMessage(`Syncing ${detectedBrowser} bookmarks to server...`, 'info');

  try {
    const isConnected = await checkServerConnection();
    if (!isConnected) {
      throw new Error(`Cannot reach ${baseUrl}. Please ensure the Next.js app is running on this port.`);
    }

    const response = await fetch(`${baseUrl}/api/bookmarks/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookmarks: scannedBookmarks,
        folders: scannedFolders,
        browser: detectedBrowser,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to import bookmarks');
    }

    const { totalReceived, insertedCount, duplicatesCount } = data;
    showMessage(
      `Synced! ${insertedCount} new ${detectedBrowser} bookmarks added, ${duplicatesCount} preserved/updated.`,
      'success'
    );
  } catch (err) {
    console.error('Import failed:', err);
    showMessage(`Import failed: ${err.message}`, 'error');
  } finally {
    importBtn.disabled = false;
    importBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </svg>
      Sync to App
    `;
  }
}

function showMessage(text, type = 'info') {
  statusMessage.className = `status-message ${type}`;
  statusText.textContent = text;
}
