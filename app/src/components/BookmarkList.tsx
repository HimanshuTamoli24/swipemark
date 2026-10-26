'use client';

import React, { useState } from 'react';
import {
  Search,
  ExternalLink,
  RotateCcw,
  Trash2,
  Folder,
  Globe,
  CheckCircle2,
  XCircle,
  Download,
  Pencil,
  FolderInput,
  FolderPlus,
  MoreVertical,
  GripVertical,
  Check,
  X,
  Layers,
  Shield,
  Flame,
  Compass,
  Laptop,
} from 'lucide-react';
import { BookmarkItem } from './SwipeCard';

export interface FolderItem {
  id: string;
  title: string;
  fullPath: string;
  count: number;
  chromeId?: string;
  chromeParentId?: string;
}

interface BookmarkListProps {
  statusFilter: 'saved' | 'skipped' | 'all';
  bookmarks: BookmarkItem[];
  foldersList: FolderItem[];
  onUpdateStatus: (id: string, status: 'saved' | 'skipped' | 'unreviewed') => Promise<void>;
  onUnbookmark: (bookmark: BookmarkItem) => Promise<void> | void;
  onRenameBookmark: (bookmark: BookmarkItem, newTitle: string) => Promise<void>;
  onMoveBookmark: (bookmark: BookmarkItem, targetFolderName: string) => Promise<void>;
  onReorderBookmarks?: (reorderedList: BookmarkItem[]) => Promise<void>;
  onCreateFolder: () => void;
  onRenameFolder: (folder: FolderItem) => void;
  onDeleteFolder: (folder: FolderItem) => void;
  onResetSkipped?: () => Promise<void>;
  isLoading?: boolean;
}

const renderBrowserSvg = (browserName: string) => {
  switch (browserName) {
    case 'Brave':
      return <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
    case 'Firefox':
      return <Flame className="w-3.5 h-3.5 text-orange-600 shrink-0" />;
    case 'Safari':
      return <Compass className="w-3.5 h-3.5 text-sky-600 shrink-0" />;
    case 'Chrome':
    case 'Edge':
      return <Globe className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
    default:
      return <Laptop className="w-3.5 h-3.5 text-zinc-600 shrink-0" />;
  }
};

export default function BookmarkList({
  statusFilter,
  bookmarks,
  foldersList,
  onUpdateStatus,
  onUnbookmark,
  onRenameBookmark,
  onMoveBookmark,
  onReorderBookmarks,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onResetSkipped,
  isLoading,
}: BookmarkListProps) {
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedBrowser, setSelectedBrowser] = useState<string>('all');
  const [isResetting, setIsResetting] = useState(false);

  // Inline rename state for a bookmark
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isSavingRename, setIsSavingRename] = useState(false);

  // Move-to-folder dropdown state
  const [movingBookmarkId, setMovingBookmarkId] = useState<string | null>(null);

  // Drag and drop states
  const [draggedBookmarkId, setDraggedBookmarkId] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [dragOverBookmarkId, setDragOverBookmarkId] = useState<string | null>(null);

  // Unique list of all available folder paths
  const allFolderPaths = Array.from(
    new Set([
      ...foldersList.map((f) => f.fullPath),
      ...bookmarks.map((b) => b.folder || 'Bookmarks Bar'),
    ])
  ).filter(Boolean);

  // Filter bookmarks by search, folder, and browser
  const filteredBookmarks = bookmarks.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.url.toLowerCase().includes(search.toLowerCase()) ||
      (b.folder && b.folder.toLowerCase().includes(search.toLowerCase())) ||
      (b.browser && b.browser.toLowerCase().includes(search.toLowerCase()));

    const matchesFolder = selectedFolder === 'all' || b.folder === selectedFolder;
    const matchesBrowser = selectedBrowser === 'all' || (b.browser || 'Chrome') === selectedBrowser;

    return matchesSearch && matchesFolder && matchesBrowser;
  });

  // Start inline rename
  const handleStartRename = (bookmark: BookmarkItem) => {
    setEditingBookmarkId(bookmark.id);
    setEditingTitle(bookmark.title);
  };

  const handleSaveRename = async (bookmark: BookmarkItem) => {
    if (!editingTitle.trim() || editingTitle.trim() === bookmark.title) {
      setEditingBookmarkId(null);
      return;
    }
    setIsSavingRename(true);
    await onRenameBookmark(bookmark, editingTitle.trim());
    setIsSavingRename(false);
    setEditingBookmarkId(null);
  };

  // Move bookmark to a chosen folder
  const handleMoveToFolder = async (bookmark: BookmarkItem, targetFolder: string) => {
    setMovingBookmarkId(null);
    if (bookmark.folder === targetFolder) return;
    await onMoveBookmark(bookmark, targetFolder);
  };

  // Drag and drop handlers for moving into folders
  const handleDragStart = (e: React.DragEvent, bookmarkId: string) => {
    setDraggedBookmarkId(bookmarkId);
    e.dataTransfer.setData('text/plain', bookmarkId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedBookmarkId(null);
    setDragOverFolder(null);
    setDragOverBookmarkId(null);
  };

  const handleDropOnFolder = async (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault();
    setDragOverFolder(null);
    const bookmarkId = e.dataTransfer.getData('text/plain') || draggedBookmarkId;
    if (!bookmarkId) return;

    const bookmark = bookmarks.find((b) => b.id === bookmarkId);
    if (bookmark && bookmark.folder !== targetFolder) {
      await onMoveBookmark(bookmark, targetFolder);
    }
  };

  // Reorder bookmarks within the current filtered list
  const handleDropOnBookmark = async (e: React.DragEvent, targetBookmarkId: string) => {
    e.preventDefault();
    setDragOverBookmarkId(null);
    const sourceId = e.dataTransfer.getData('text/plain') || draggedBookmarkId;
    if (!sourceId || sourceId === targetBookmarkId || !onReorderBookmarks) return;

    const sourceIndex = filteredBookmarks.findIndex((b) => b.id === sourceId);
    const targetIndex = filteredBookmarks.findIndex((b) => b.id === targetBookmarkId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const updated = [...filteredBookmarks];
    const [moved] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, moved);

    await onReorderBookmarks(updated);
  };

  const handleResetAll = async () => {
    if (!onResetSkipped) return;
    if (confirm('Are you sure you want to restore all skipped bookmarks back to the review queue?')) {
      setIsResetting(true);
      await onResetSkipped();
      setIsResetting(false);
    }
  };

  // Export saved bookmarks
  const exportBookmarks = (format: 'json' | 'html') => {
    const exportItems = filteredBookmarks;
    let fileContent = '';
    let fileName = '';
    let mimeType = '';

    if (format === 'json') {
      fileContent = JSON.stringify(exportItems, null, 2);
      fileName = `swipemark-saved-${new Date().toISOString().slice(0, 10)}.json`;
      mimeType = 'application/json';
    } else {
      fileContent = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Saved Bookmarks</TITLE>
<H1>Swipe Mark - Saved</H1>
<DL><p>
${exportItems
  .map(
    (b) =>
      `    <DT><A HREF="${b.url}" ADD_DATE="${Math.floor(
        new Date(b.dateAdded || Date.now()).getTime() / 1000
      )}">${b.title}</A>`
  )
  .join('\n')}
</DL><p>`;
      fileName = `bookmark-swipe-saved-${new Date().toISOString().slice(0, 10)}.html`;
      mimeType = 'text/html';
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Find active folder item if a single folder is selected
  const activeFolderItem = foldersList.find((f) => f.fullPath === selectedFolder);

  return (
    <div className="w-full bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_#09090b] p-4 sm:p-6 space-y-6">
      {/* Top Controls: Search & Global Actions in Neobrutalism */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-black absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Filter ${filteredBookmarks.length} bookmarks...`}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-black bg-zinc-50 text-xs font-bold text-black placeholder:text-zinc-500 shadow-[2px_2px_0px_#09090b] focus:outline-none focus:bg-white transition-all"
          />
        </div>

        {/* Action button: New Folder / Reset Skipped / Export Saved */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onCreateFolder}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-bold border-2 border-black shadow-[2px_2px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            title="Create a new folder in Chrome & Swipe Mark"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            New Folder
          </button>

          {statusFilter === 'skipped' && onResetSkipped && (
            <button
              onClick={handleResetAll}
              disabled={isResetting || bookmarks.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border-2 border-black bg-[#fb7185] hover:bg-rose-400 text-xs font-bold text-black shadow-[2px_2px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 transition-all"
              title="Restore all skipped bookmarks back to unreviewed"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              Restore All
            </button>
          )}

          {statusFilter === 'saved' && filteredBookmarks.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => exportBookmarks('html')}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 border-black bg-[#34d399] hover:bg-emerald-400 text-xs font-bold text-black shadow-[2px_2px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                title="Export as HTML bookmarks file"
              >
                <Download className="w-3.5 h-3.5" />
                HTML
              </button>
              <button
                onClick={() => exportBookmarks('json')}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 border-black bg-[#38bdf8] hover:bg-sky-400 text-xs font-bold text-black shadow-[2px_2px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                title="Export as JSON"
              >
                <Download className="w-3.5 h-3.5" />
                JSON
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Folder Organizer Bar / Drop Targets */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-black text-black uppercase tracking-wider px-1">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Folders (Drag bookmarks onto folders)
          </span>

          {activeFolderItem && (
            <div className="flex items-center gap-2 normal-case font-bold">
              <button
                onClick={() => onRenameFolder(activeFolderItem)}
                className="inline-flex items-center gap-1 text-xs text-black hover:underline"
              >
                <Pencil className="w-3 h-3" /> Rename Folder
              </button>
              <span>•</span>
              <button
                onClick={() => onDeleteFolder(activeFolderItem)}
                className="inline-flex items-center gap-1 text-xs text-rose-700 hover:underline"
              >
                <Trash2 className="w-3 h-3" /> Delete Folder
              </button>
            </div>
          )}
        </div>

        {/* Folder Badges with drag-and-drop support */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {/* All Bookmarks Pill */}
          <button
            onClick={() => setSelectedFolder('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border-2 border-black ${
              selectedFolder === 'all'
                ? 'bg-black text-white shadow-[2px_2px_0px_#09090b]'
                : 'bg-white text-black hover:bg-zinc-100 shadow-[2px_2px_0px_#09090b]'
            }`}
          >
            <span>All Bookmarks</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-black border border-black ${
                selectedFolder === 'all' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-black'
              }`}
            >
              {bookmarks.length}
            </span>
          </button>

          {/* Folder Pills */}
          {allFolderPaths.map((folderPath) => {
            const count = bookmarks.filter((b) => b.folder === folderPath).length;
            const isSelected = selectedFolder === folderPath;
            const isOver = dragOverFolder === folderPath;

            return (
              <div
                key={folderPath}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverFolder(folderPath);
                }}
                onDragLeave={() => setDragOverFolder(null)}
                onDrop={(e) => handleDropOnFolder(e, folderPath)}
                onClick={() => setSelectedFolder(folderPath)}
                className={`group px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border-2 border-black ${
                  isOver
                    ? 'border-indigo-600 bg-indigo-100 text-indigo-900 shadow-[4px_4px_0px_#09090b] scale-105'
                    : isSelected
                    ? 'bg-black text-white shadow-[2px_2px_0px_#09090b]'
                    : 'bg-white text-black hover:bg-zinc-100 shadow-[2px_2px_0px_#09090b]'
                }`}
                title={`Click to filter. Drag bookmarks here to move.`}
              >
                <Folder className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[140px]">{folderPath}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-black border border-black ${
                    isSelected ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-black'
                  }`}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Browser Filter Bar without emojis */}
      <div className="space-y-1.5 pt-1">
        <div className="text-[10px] font-black text-black uppercase tracking-wider px-1 flex items-center justify-between">
          <span>Browser Filter</span>
          <span className="text-[10px] text-zinc-500 normal-case font-semibold">
            Tracked across Chrome, Brave, Firefox, Edge, Safari
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {[
            { id: 'all', label: 'All Browsers', icon: <Globe className="w-3.5 h-3.5" /> },
            { id: 'Chrome', label: 'Chrome', icon: <Globe className="w-3.5 h-3.5 text-indigo-700" /> },
            { id: 'Brave', label: 'Brave', icon: <Shield className="w-3.5 h-3.5 text-amber-700" /> },
            { id: 'Firefox', label: 'Firefox', icon: <Flame className="w-3.5 h-3.5 text-orange-600" /> },
            { id: 'Edge', label: 'Edge', icon: <Globe className="w-3.5 h-3.5 text-cyan-700" /> },
            { id: 'Safari', label: 'Safari', icon: <Compass className="w-3.5 h-3.5 text-sky-700" /> },
            { id: 'Other', label: 'Other', icon: <Laptop className="w-3.5 h-3.5 text-zinc-700" /> },
          ].map((bItem) => {
            const count =
              bItem.id === 'all'
                ? bookmarks.length
                : bookmarks.filter((b) => (b.browser || 'Chrome') === bItem.id).length;
            const isSelected = selectedBrowser === bItem.id;

            if (count === 0 && !['all', 'Chrome', 'Brave'].includes(bItem.id)) return null;

            return (
              <button
                key={bItem.id}
                type="button"
                onClick={() => setSelectedBrowser(bItem.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border-2 border-black ${
                  isSelected
                    ? 'bg-black text-white shadow-[2px_2px_0px_#09090b]'
                    : 'bg-white text-black hover:bg-zinc-100 shadow-[2px_2px_0px_#09090b]'
                }`}
              >
                <span>{bItem.icon}</span>
                <span>{bItem.label}</span>
                <span
                  className={`text-[10px] px-1 py-0.1 rounded font-black border border-black ${
                    isSelected ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-black'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bookmarks List */}
      {isLoading ? (
        <div className="py-20 text-center text-zinc-400 text-sm">Loading bookmarks...</div>
      ) : filteredBookmarks.length === 0 ? (
        <div className="py-20 text-center space-y-2">
          <p className="text-zinc-700 font-semibold text-sm">No bookmarks found</p>
          <p className="text-zinc-400 text-xs">
            {search
              ? 'Try adjusting your search criteria.'
              : selectedFolder !== 'all'
              ? `Folder "${selectedFolder}" is currently empty. Drag bookmarks into it above!`
              : `No ${statusFilter} bookmarks in this list yet.`}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-2xl overflow-hidden">
          {filteredBookmarks.map((item) => {
            let itemDomain = '';
            try {
              itemDomain = new URL(item.url).hostname.replace(/^www\./, '');
            } catch {
              itemDomain = item.url;
            }

            const isEditing = editingBookmarkId === item.id;
            const isMoving = movingBookmarkId === item.id;
            const isDragOver = dragOverBookmarkId === item.id;

            return (
              <div
                key={item.id}
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverBookmarkId(item.id);
                }}
                onDragLeave={() => setDragOverBookmarkId(null)}
                onDrop={(e) => handleDropOnBookmark(e, item.id)}
                className={`p-3.5 sm:p-4 hover:bg-zinc-50/90 transition-all flex items-center justify-between gap-3 group select-none ${
                  isDragOver ? 'bg-indigo-50/60 border-t-2 border-indigo-500' : ''
                }`}
              >
                {/* Left: Drag Handle & Favicon & Details */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Drag Handle */}
                  <div
                    className="text-zinc-300 group-hover:text-zinc-400 cursor-grab active:cursor-grabbing p-1 shrink-0 mt-0.5"
                    title="Drag to reorder or move to folder"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Favicon */}
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 border border-zinc-200/80 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                    {item.favicon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.favicon} alt="" className="w-4 h-4 object-contain" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </div>

                  {/* Bookmark Title / Inline Edit */}
                  <div className="min-w-0 flex-1 space-y-1">
                    {isEditing ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveRename(item);
                        }}
                        className="flex items-center gap-2 max-w-lg"
                      >
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          autoFocus
                          disabled={isSavingRename}
                          className="flex-1 text-sm font-semibold text-zinc-900 border border-zinc-300 rounded-xl px-2.5 py-1 focus:outline-none focus:border-zinc-900 bg-white"
                        />
                        <button
                          type="submit"
                          disabled={isSavingRename}
                          className="p-1 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-semibold shrink-0"
                          title="Save title"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingBookmarkId(null)}
                          className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-200 shrink-0"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-zinc-900 hover:text-indigo-600 transition-colors truncate max-w-[260px] sm:max-w-[420px]"
                          title={item.title}
                        >
                          {item.title}
                        </a>

                        {item.status && (
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border border-black ${
                              item.status === 'saved'
                                ? 'bg-[#34d399] text-black'
                                : item.status === 'skipped'
                                ? 'bg-[#fb7185] text-black'
                                : 'bg-zinc-200 text-black'
                            }`}
                          >
                            {item.status}
                          </span>
                        )}

                        {/* Browser Badge */}
                        <span
                          className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md border border-black bg-zinc-100 text-black shadow-[1px_1px_0px_#09090b]"
                          title={`Browser: ${item.browser || 'Chrome'}`}
                        >
                          {renderBrowserSvg(item.browser || 'Chrome')}
                          <span>{item.browser || 'Chrome'}</span>
                        </span>

                        {item.chromeId && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-zinc-400" title="Synchronized with Browser">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Synced
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                      <span className="font-mono text-zinc-500 truncate max-w-[200px] sm:max-w-[320px]">
                        {itemDomain}
                      </span>
                      {item.folder && (
                        <span className="flex items-center gap-1 text-zinc-500 truncate max-w-[170px]" title={item.folder}>
                          <Folder className="w-3 h-3 shrink-0 text-zinc-400" />
                          <span className="truncate">{item.folder}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Rename Bookmark Button */}
                  <button
                    onClick={() => handleStartRename(item)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                    title="Rename bookmark"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Move to Folder Dropdown Toggle */}
                  <div className="relative">
                    <button
                      onClick={() => setMovingBookmarkId(isMoving ? null : item.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                      title="Move bookmark to folder..."
                    >
                      <FolderInput className="w-3.5 h-3.5" />
                    </button>

                    {isMoving && (
                      <div className="absolute right-0 top-8 z-30 w-52 bg-white rounded-2xl border border-zinc-200 shadow-xl p-2 space-y-1 animate-in fade-in duration-100">
                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1">
                          Move to Folder
                        </p>
                        <div className="max-h-48 overflow-y-auto space-y-0.5">
                          {allFolderPaths.map((f) => (
                            <button
                              key={f}
                              onClick={() => handleMoveToFolder(item, f)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                                item.folder === f
                                  ? 'bg-zinc-100 font-bold text-zinc-900'
                                  : 'text-zinc-600 hover:bg-zinc-50'
                              }`}
                            >
                              <span className="truncate">{f}</span>
                              {item.folder === f && <Check className="w-3 h-3 text-emerald-600 shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Open Link */}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {/* Move to Saved if skipped or unreviewed */}
                  {item.status !== 'saved' && (
                    <button
                      onClick={() => onUpdateStatus(item.id, 'saved')}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title="Keep / Save bookmark"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Move to Skipped if saved */}
                  {item.status === 'saved' && (
                    <button
                      onClick={() => onUpdateStatus(item.id, 'skipped')}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Move to Skipped"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}

                  {/* Restore to Unreviewed queue */}
                  {item.status !== 'unreviewed' && (
                    <button
                      onClick={() => onUpdateStatus(item.id, 'unreviewed')}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                      title="Restore to Swipe Queue"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Unbookmark (Removes from Chrome & DB) */}
                  <button
                    onClick={() => onUnbookmark(item)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Unbookmark (Remove from Chrome & Swipe Mark)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
