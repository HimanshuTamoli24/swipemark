// Content Script for Bookmark Swipe Two-Way Synchronization
// Runs in the context of the Bookmark Swipe dashboard (http://localhost:3000 and http://127.0.0.1:3000)

console.log('[Bookmark Swipe Extension] Content script loaded on Bookmark Swipe dashboard.');

// Mark DOM so page can synchronously detect extension presence
try {
  document.documentElement.dataset.bookmarkSwipeExtension = 'active';
  document.documentElement.dataset.bookmarkSwipeVersion = '1.1.0';
} catch (e) {
  // Ignore in case of DOM restriction
}

// 1. Listen for messages from the Next.js web application
window.addEventListener('message', (event) => {
  // Accept messages only from current window
  if (event.source !== window || !event.data) return;

  const { type, requestId, action, payload } = event.data;

  // Handshake Ping
  if (type === 'BOOKMARK_SWIPE_PING') {
    window.postMessage(
      {
        type: 'BOOKMARK_SWIPE_PONG',
        version: '1.1.0',
        active: true,
      },
      '*'
    );
    return;
  }

  // Action Dispatch to Background Worker
  if (type === 'BOOKMARK_SWIPE_ACTION') {
    if (!action) return;

    try {
      chrome.runtime.sendMessage({ action, payload }, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          window.postMessage(
            {
              type: 'BOOKMARK_SWIPE_ACTION_RESULT',
              requestId,
              success: false,
              error: error.message,
            },
            '*'
          );
        } else {
          window.postMessage(
            {
              type: 'BOOKMARK_SWIPE_ACTION_RESULT',
              requestId,
              ...(response || { success: true }),
            },
            '*'
          );
        }
      });
    } catch (err) {
      window.postMessage(
        {
          type: 'BOOKMARK_SWIPE_ACTION_RESULT',
          requestId,
          success: false,
          error: err.message || 'Failed to dispatch action to extension background worker',
        },
        '*'
      );
    }
  }
});

// 2. Forward Chrome bookmark events from Background Worker to the Web App
chrome.runtime.onMessage.addListener((message) => {
  if (message && message.type === 'BOOKMARK_SWIPE_CHROME_EVENT') {
    window.postMessage(message, '*');
  }
});

// Broadcast that extension is ready
window.postMessage(
  {
    type: 'BOOKMARK_SWIPE_PONG',
    version: '1.1.0',
    active: true,
  },
  '*'
);
