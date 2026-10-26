'use client';

// Two-way synchronization bridge between the Next.js web application and the Chrome Extension
// Communicates via window.postMessage with content_script.js

let requestIdCounter = 0;

export interface ExtensionActionResult {
  success: boolean;
  error?: string;
  alreadyRemoved?: boolean;
  chromeId?: string;
  bookmark?: unknown;
  folder?: { id: string; title: string; parentId?: string };
}

/**
 * Dispatch an action to the Chrome Extension background worker
 */
export function sendExtensionAction(
  action: string,
  payload: Record<string, unknown> = {},
  timeoutMs = 4000
): Promise<ExtensionActionResult> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve({ success: false, error: 'Window not available' });
      return;
    }

    const requestId = `bs_req_${Date.now()}_${++requestIdCounter}`;
    let isSettled = false;

    // Timeout fallback if extension is not installed or unresponsive
    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        window.removeEventListener('message', messageHandler);
        resolve({
          success: false,
          error: 'Chrome extension not detected or did not respond in time.',
        });
      }
    }, timeoutMs);

    function messageHandler(event: MessageEvent) {
      if (
        event.source !== window ||
        !event.data ||
        event.data.type !== 'BOOKMARK_SWIPE_ACTION_RESULT' ||
        event.data.requestId !== requestId
      ) {
        return;
      }

      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        window.removeEventListener('message', messageHandler);
        resolve({
          success: !!event.data.success,
          error: event.data.error,
          alreadyRemoved: event.data.alreadyRemoved,
          chromeId: event.data.chromeId,
          bookmark: event.data.bookmark,
          folder: event.data.folder,
        });
      }
    }

    window.addEventListener('message', messageHandler);

    window.postMessage(
      {
        type: 'BOOKMARK_SWIPE_ACTION',
        requestId,
        action,
        payload,
      },
      '*'
    );
  });
}

/**
 * Check if the Chrome extension content script is active on the page
 */
export function pingExtension(timeoutMs = 1200): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    // Check fast synchronous DOM indicator
    if (document.documentElement.dataset.bookmarkSwipeExtension === 'active') {
      resolve(true);
      return;
    }

    let isSettled = false;
    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        window.removeEventListener('message', pongHandler);
        resolve(false);
      }
    }, timeoutMs);

    function pongHandler(event: MessageEvent) {
      if (
        event.source === window &&
        event.data &&
        event.data.type === 'BOOKMARK_SWIPE_PONG'
      ) {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          window.removeEventListener('message', pongHandler);
          resolve(true);
        }
      }
    }

    window.addEventListener('message', pongHandler);
    window.postMessage({ type: 'BOOKMARK_SWIPE_PING' }, '*');
  });
}

// 1. Remove / Unbookmark in Chrome
export async function chromeUnbookmark(chromeId: string): Promise<ExtensionActionResult> {
  if (!chromeId) return { success: true };
  return sendExtensionAction('UNBOOKMARK', { chromeId });
}

// 2. Rename Bookmark in Chrome
export async function chromeRenameBookmark(chromeId: string, title: string): Promise<ExtensionActionResult> {
  if (!chromeId) return { success: true };
  return sendExtensionAction('RENAME_BOOKMARK', { chromeId, title });
}

// 3. Move Bookmark in Chrome
export async function chromeMoveBookmark(
  chromeId: string,
  parentId?: string,
  index?: number
): Promise<ExtensionActionResult> {
  if (!chromeId) return { success: true };
  return sendExtensionAction('MOVE_BOOKMARK', { chromeId, parentId, index });
}

// 4. Create Folder in Chrome
export async function chromeCreateFolder(title: string, parentId?: string): Promise<ExtensionActionResult> {
  return sendExtensionAction('CREATE_FOLDER', { title, parentId });
}

// 5. Rename Folder in Chrome
export async function chromeRenameFolder(chromeFolderId: string, title: string): Promise<ExtensionActionResult> {
  if (!chromeFolderId) return { success: true };
  return sendExtensionAction('RENAME_FOLDER', { chromeFolderId, title });
}

// 6. Delete Folder in Chrome
export async function chromeDeleteFolder(chromeFolderId: string): Promise<ExtensionActionResult> {
  if (!chromeFolderId) return { success: true };
  return sendExtensionAction('DELETE_FOLDER', { chromeFolderId });
}
