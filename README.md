# Bookmark Swipe 🔖

A clean, minimalist web app and Chrome Extension to triage, organize, rename, and manage your browser bookmarks with real-time two-way synchronization.

Swipe right to **keep / save** a bookmark, swipe left to **skip** it, or use intuitive keyboard shortcuts to review hundreds of bookmarks in minutes.

---

## 🚀 Features

- **Multi-Browser Tracking**:
  - Automatically detects whether bookmarks are imported from **Google Chrome**, **Brave**, **Mozilla Firefox**, **Microsoft Edge**, **Opera**, or **Safari**.
  - Distinct visual badges and brand icons (`🌐 Chrome`, `🦁 Brave`, `🦊 Firefox`, `🌊 Edge`, `⭕ Opera`, `🧭 Safari`).
  - Browser-specific breakdown chips in the statistics bar and filter pills in the list views.
- **Multiple Bookmarks Enabled**:
  - Eliminates rigid single-URL limitations: users can bookmark the same URL in multiple folders or across multiple browsers without deduplication conflicts.
  - Compound indexing `{ url: 1, folder: 1, browser: 1 }` prevents duplicates only within the exact same browser and folder combination.
- **Quick Bookmark Shortcut (`Shift + B`)**:
  - **In Web Dashboard**: Press **`Shift + B`** anywhere to open the modal to quickly add a bookmark with browser tagging and folder selection.
  - **In Browser (Extension)**: Press **`Ctrl + Shift + B`** (or **`Cmd + Shift + B`** on macOS) on any open tab to immediately bookmark into Bookmark Swipe with browser auto-detection.
- **Chrome & Chromium Extension (Manifest V3 with Two-Way Sync)**:
  - Recursively exports all browser bookmarks from all nested folders, preserving folder hierarchies, titles, URLs, timestamps, and browser IDs.
  - Automatically filters invalid URLs (`chrome://`, `about:`, non-HTTP).
  - Background service worker & content script bridge: real-time updates dispatched from the web dashboard immediately execute in Chrome and Brave!
  - Real-time listener: changes made directly in Chrome broadcast to the dashboard.
- **Unbookmark with Confirmation**:
  - Unbookmark button on both the Tinder swipe card and list views.
  - Removes the bookmark from the actual browser via `chrome.bookmarks.remove()` and deletes it from MongoDB.
  - Confirmation dialog prevents accidental deletions.
- **Rename Bookmarks**:
  - Edit a bookmark's title directly from the Tinder card or inline in the list views.
  - Instantly updates browser via `chrome.bookmarks.update()` and persists in MongoDB.
- **Organize & Drag-and-Drop**:
  - Drag and drop bookmarks onto folder pills to move them between folders.
  - Drag and drop to reorder bookmarks within lists.
  - Quick dropdown "Move to Folder..." picker on each bookmark row.
- **Create, Rename & Delete Folders**:
  - Create new browser bookmark folders directly from the dashboard (`chrome.bookmarks.create()`).
  - Rename folders with cascade updating to all nested bookmarks (`chrome.bookmarks.update()`).
  - Delete folders with confirmation (`chrome.bookmarks.removeTree()`).
- **Tinder-Style Swipe Mechanics**:
  - Drag cards with mouse physics (drag distance, dynamic rotation, KEEP / SKIP stamp opacity).
  - Full touch swipe support for mobile and tablets.
  - Keyboard shortcuts (`←` / `A` to skip, `→` / `D` to keep, `Space` / `O` to open link, `Z` to undo).
- **Bookmark Management**:
  - **Saved Tab**: Search, filter by folder or browser, open, move, or export saved bookmarks to standard HTML bookmarks file or JSON.
  - **Skipped Tab**: View skipped bookmarks, restore individual items, or click **Restore All** to revisit them anytime.
  - **All Bookmarks Tab**: Full inventory with status and browser badges.
- **Live Statistics**:
  - Total imported, unreviewed remaining, saved, skipped, review completion percentage, and breakdown by browser.

---

## 📁 Repository Structure

```
bookmark/
├── app/                  # Next.js App Router Web Application
│   ├── src/
│   │   ├── app/          # Next.js routes & API endpoints
│   │   │   ├── api/bookmarks/      # CRUD, Import, Next, Stats, Reset, Seed
│   │   │   ├── api/folders/        # Folder CRUD & cascade management
│   │   │   ├── app/page.tsx        # Panoramic Tri-Pane Triage Studio (Left: Skipped, Center: Deck, Right: Saved)
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx            # Main swipe UI, views, and sync orchestration
│   │   ├── components/   # SwipeCard, StatsBar, BookmarkList, ConfirmDialog, FolderModal
│   │   ├── lib/          # MongoDB connection & extensionSync bridge
│   │   └── models/       # Mongoose Bookmark and Folder models
│   ├── .env.example      # Sample environment variables
│   ├── .env.local        # Local environment variables
│   └── package.json
├── extension/            # Chrome Extension (Manifest V3)
│   ├── manifest.json     # Manifest V3 with service worker and content script
│   ├── background.js     # Background service worker (chrome.bookmarks API runner)
│   ├── content_script.js # Web dashboard bridge (window.postMessage <-> runtime)
│   ├── popup.html        # Clean extension popup interface
│   ├── popup.css         # Minimal styling
│   ├── popup.js          # Recursive bookmark tree scanner & sync logic
│   └── icons/            # Extension icons (16, 48, 128)
└── README.md
```

---

## 🛠️ Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **pnpm** or **npm**
- **MongoDB** (local instance e.g. `mongodb://127.0.0.1:27017/bookmark_swipe` or MongoDB Atlas cluster)

### 2. Environment Configuration
Navigate to the `app` directory and verify `app/.env.local`:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/bookmark_swipe
```

### 3. Run Web App

```bash
cd app
pnpm dev
# or npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧩 Installing / Reloading the Chrome Extension

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Turn ON **Developer mode** in the top right corner.
3. If previously loaded, click the 🔄 **Reload** icon on the **Bookmark Swipe** extension card.
   *(If loading for the first time, click **Load unpacked** and select the `bookmark/extension` folder).*
4. Navigate to [http://localhost:3000](http://localhost:3000). The dashboard header will display:
   `🟢 2-Way Sync Active`
5. Click the extension icon in Chrome toolbar, scan your bookmarks, and press **Sync to App**.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `Shift + B` | **Quick Bookmark Modal** (Dashboard) — add any URL with browser & folder tagging |
| `Ctrl + Shift + B` / `Cmd + Shift + B` | **Instant Bookmark** (Browser Extension) — saves current active tab directly |
| `→` or `D` | **Keep / Save** current bookmark in swipe queue |
| `←` or `A` | **Skip** current bookmark in swipe queue |
| `Space` or `O` | **Open** bookmark URL in new tab |
| `Z` or `U` | **Undo** last swipe action |

---

## 🔌 API Endpoints

- `POST /api/bookmarks/import`: Bulk import bookmarks & folders with duplicate prevention.
- `GET /api/bookmarks/next`: Returns one random unreviewed bookmark (`status: 'unreviewed'`).
- `PATCH /api/bookmarks/[id]`: Updates bookmark triage status, title, folder, or position.
- `DELETE /api/bookmarks/[id]`: Permanently deletes a bookmark from MongoDB.
- `GET /api/folders`: Lists all folders with live bookmark counts.
- `POST /api/folders`: Creates a new folder.
- `PATCH /api/folders/[id]`: Renames a folder with cascade renaming of nested bookmarks.
- `DELETE /api/folders/[id]`: Deletes folder and contained bookmarks.
- `GET /api/bookmarks/stats`: Returns total, remaining, saved, skipped counts & review progress.
- `GET /api/bookmarks`: Paginated list with `status`, `folder`, and `search` filters.
- `POST /api/bookmarks/reset`: Resets skipped bookmarks back to the unreviewed queue.
- `POST /api/bookmarks/seed`: Seeds sample bookmarks for testing.
