// Background Service Worker for Bookmark Swipe Multi-Browser Two-Way Sync
console.log('Bookmark Swipe Background Service Worker initialized.');

// Detect Browser Environment (Chrome, Brave, Firefox, Edge, Opera, etc.)
let cachedBrowser = null;

async function initBrowserDetection() {
  if (typeof navigator !== 'undefined') {
    if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
      try {
        const isBrave = await navigator.brave.isBrave();
        if (isBrave) {
          cachedBrowser = 'Brave';
          return 'Brave';
        }
      } catch (e) {}
    }
    const ua = navigator.userAgent || '';
    if (ua.includes('Firefox/')) cachedBrowser = 'Firefox';
    else if (ua.includes('Edg/')) cachedBrowser = 'Edge';
    else if (ua.includes('OPR/') || ua.includes('Opera/')) cachedBrowser = 'Opera';
    else if (ua.includes('Vivaldi/')) cachedBrowser = 'Vivaldi';
    else if (ua.includes('Chrome/')) cachedBrowser = 'Chrome';
    else if (ua.includes('Safari/')) cachedBrowser = 'Safari';
    else cachedBrowser = 'Chrome';
    return cachedBrowser;
  }
  cachedBrowser = 'Chrome';
  return cachedBrowser;
}

function detectBrowser() {
  if (cachedBrowser) return cachedBrowser;
  if (typeof navigator !== 'undefined') {
    if (navigator.brave) return 'Brave';
    const ua = navigator.userAgent || '';
    if (ua.includes('Firefox/')) return 'Firefox';
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
    if (ua.includes('Vivaldi/')) return 'Vivaldi';
    if (ua.includes('Chrome/')) return 'Chrome';
    if (ua.includes('Safari/')) return 'Safari';
  }
  return 'Chrome';
}

initBrowserDetection();

// Broadcast events to active Bookmark Swipe web dashboard tabs
function broadcastToDashboard(message) {
  chrome.tabs.query({ url: ['http://localhost:3000/*', 'http://127.0.0.1:3000/*'] }, (tabs) => {
    if (chrome.runtime.lastError) return;
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Tab might be loading or inactive, ignore
        });
      }
    }
  });
}

// Global Keyboard Shortcut: Quick Bookmark Active Tab (Ctrl+Shift+B / Cmd+Shift+B)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'quick-bookmark') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs || tabs.length === 0 || !tabs[0].url) return;
      const tab = tabs[0];
      const trimmedUrl = tab.url.trim();

      // Filter non-http pages
      if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        return;
      }

      const browser = detectBrowser();
      const title = tab.title ? tab.title.trim() : new URL(trimmedUrl).hostname;

      chrome.storage.sync.get(['defaultFolder'], async (storage) => {
        const folder = storage.defaultFolder || 'MySaved';

        // 1. Create in Browser's bookmarks
        chrome.bookmarks.create({ title, url: trimmedUrl }, async (createdNode) => {
          const chromeId = createdNode?.id || '';
          const chromeParentId = createdNode?.parentId || '';

          // 2. Sync to Swipe Mark Next.js Backend
          try {
            const res = await fetch('http://localhost:3000/api/bookmarks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title,
                url: trimmedUrl,
                folder,
                browser,
                chromeId,
                chromeParentId,
              }),
            });

            if (res.ok) {
              // Show badge on icon
              chrome.action.setBadgeText({ text: '✓' });
              chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
              setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);

              // Broadcast to open dashboard
              broadcastToDashboard({
                type: 'BOOKMARK_SWIPE_CHROME_EVENT',
                action: 'QUICK_BOOKMARKED',
                title,
                url: trimmedUrl,
                folder,
                browser,
              });
            }
          } catch (err) {
            console.error('Quick bookmark sync error:', err);
          }
        });
      });
    });
  }
});

// Listen to Chrome Bookmarks Events for Two-Way Synchronization
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  broadcastToDashboard({
    type: 'BOOKMARK_SWIPE_CHROME_EVENT',
    action: 'CREATED',
    id,
    bookmark,
    browser: detectBrowser(),
  });
});

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  broadcastToDashboard({
    type: 'BOOKMARK_SWIPE_CHROME_EVENT',
    action: 'REMOVED',
    id,
    removeInfo,
    browser: detectBrowser(),
  });
});

chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
  broadcastToDashboard({
    type: 'BOOKMARK_SWIPE_CHROME_EVENT',
    action: 'CHANGED',
    id,
    changeInfo,
    browser: detectBrowser(),
  });
});

chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
  broadcastToDashboard({
    type: 'BOOKMARK_SWIPE_CHROME_EVENT',
    action: 'MOVED',
    id,
    moveInfo,
    browser: detectBrowser(),
  });
});

// Handle requests from Content Script & Extension Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { action, payload } = request;
  const currentBrowser = detectBrowser();

  if (action === 'PING') {
    sendResponse({
      success: true,
      version: '1.2.0',
      connected: true,
      browser: currentBrowser,
    });
    return false;
  }

  // 0. SET DEFAULT FOLDER
  if (action === 'SET_DEFAULT_FOLDER') {
    const folderName = payload?.defaultFolder || 'MySaved';
    chrome.storage.sync.set({ defaultFolder: folderName }, () => {
      sendResponse({ success: true, defaultFolder: folderName });
    });
    return true;
  }

  // 1. UNBOOKMARK / REMOVE
  if (action === 'UNBOOKMARK') {
    const chromeId = String(payload.chromeId);
    if (!chromeId) {
      sendResponse({ success: false, error: 'Missing Chrome bookmark ID' });
      return false;
    }

    chrome.bookmarks.get(chromeId, (nodes) => {
      if (chrome.runtime.lastError || !nodes || nodes.length === 0) {
        sendResponse({ success: true, alreadyRemoved: true, browser: currentBrowser });
        return;
      }

      chrome.bookmarks.remove(chromeId, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, chromeId, browser: currentBrowser });
        }
      });
    });
    return true;
  }

  // 2. RENAME BOOKMARK
  if (action === 'RENAME_BOOKMARK') {
    const chromeId = String(payload.chromeId);
    const newTitle = String(payload.title || '').trim();

    if (!chromeId || !newTitle) {
      sendResponse({ success: false, error: 'Missing Chrome ID or title' });
      return false;
    }

    chrome.bookmarks.update(chromeId, { title: newTitle }, (updatedNode) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, bookmark: updatedNode, browser: currentBrowser });
      }
    });
    return true;
  }

  // 3. MOVE BOOKMARK
  if (action === 'MOVE_BOOKMARK') {
    const chromeId = String(payload.chromeId);
    const moveDestination = {};

    if (payload.parentId) {
      moveDestination.parentId = String(payload.parentId);
    }
    if (typeof payload.index === 'number') {
      moveDestination.index = payload.index;
    }

    if (!chromeId || (!moveDestination.parentId && moveDestination.index === undefined)) {
      sendResponse({ success: false, error: 'Missing Chrome ID or move destination' });
      return false;
    }

    chrome.bookmarks.move(chromeId, moveDestination, (movedNode) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, bookmark: movedNode, browser: currentBrowser });
      }
    });
    return true;
  }

  // 4. CREATE BOOKMARK
  if (action === 'CREATE_BOOKMARK') {
    const title = String(payload.title || '').trim();
    const url = String(payload.url || '').trim();
    const parentId = payload.parentId ? String(payload.parentId) : '1';

    if (!url) {
      sendResponse({ success: false, error: 'Bookmark URL is required' });
      return false;
    }

    chrome.bookmarks.create({ parentId, title, url }, (newBookmark) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, bookmark: newBookmark, browser: currentBrowser });
      }
    });
    return true;
  }

  // 5. CREATE FOLDER
  if (action === 'CREATE_FOLDER') {
    const title = String(payload.title || '').trim();
    const parentId = payload.parentId ? String(payload.parentId) : '1';

    if (!title) {
      sendResponse({ success: false, error: 'Folder title is required' });
      return false;
    }

    chrome.bookmarks.create({ parentId, title }, (newFolder) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, folder: newFolder, browser: currentBrowser });
      }
    });
    return true;
  }

  // 6. RENAME FOLDER
  if (action === 'RENAME_FOLDER') {
    const chromeFolderId = String(payload.chromeFolderId);
    const newTitle = String(payload.title || '').trim();

    if (!chromeFolderId || !newTitle) {
      sendResponse({ success: false, error: 'Missing folder ID or title' });
      return false;
    }

    chrome.bookmarks.update(chromeFolderId, { title: newTitle }, (updatedFolder) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, folder: updatedFolder, browser: currentBrowser });
      }
    });
    return true;
  }

  // 7. DELETE FOLDER
  if (action === 'DELETE_FOLDER') {
    const chromeFolderId = String(payload.chromeFolderId);
    if (!chromeFolderId) {
      sendResponse({ success: false, error: 'Missing Chrome folder ID' });
      return false;
    }

    chrome.bookmarks.removeTree(chromeFolderId, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, chromeFolderId, browser: currentBrowser });
      }
    });
    return true;
  }

  // 8. GET TREE
  if (action === 'GET_TREE') {
    chrome.bookmarks.getTree((tree) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, tree, browser: currentBrowser });
      }
    });
    return true;
  }

  sendResponse({ success: false, error: `Unknown action: ${action}` });
  return false;
});
