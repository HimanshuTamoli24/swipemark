'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  BookmarkPlus,
  Globe,
  Folder as FolderIcon,
  Check,
  Clipboard,
  Star,
  Plus,
  Layers,
  Sparkles,
  Bot,
} from 'lucide-react';
import {
  classifyByRules,
  SMART_CATEGORIES,
  ClassificationResult,
  getCategoryEmoji,
} from '@/lib/smartFolderClassifier';

interface QuickBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookmarkCreated: (bookmark: any) => void;
  availableFolders?: string[];
}

export default function QuickBookmarkModal({
  isOpen,
  onClose,
  onBookmarkCreated,
  availableFolders = [],
}: QuickBookmarkModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [browser, setBrowser] = useState('Chrome');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Folder management & Default Folder
  const [defaultFolder, setDefaultFolder] = useState<string>('MySaved');
  const [selectedFolder, setSelectedFolder] = useState<string>('MySaved');
  const [allFolders, setAllFolders] = useState<string[]>([
    'MySaved',
    'Bookmarks Bar',
    ...SMART_CATEGORIES.map((c) => c.name),
  ]);
  const [suggestedFolder, setSuggestedFolder] = useState<ClassificationResult | null>(null);
  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [pastedFeedback, setPastedFeedback] = useState(false);

  // 1. Auto-detect browser silently in background (No user choice)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent;
    // @ts-expect-error brave detection
    if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
      // @ts-expect-error brave detection
      navigator.brave.isBrave().then((isB: boolean) => {
        if (isB) setBrowser('Brave');
      }).catch(() => {});
    } else if (ua.includes('Firefox')) {
      setBrowser('Firefox');
    } else if (ua.includes('Edg/')) {
      setBrowser('Edge');
    } else if (ua.includes('OPR/') || ua.includes('Opera/')) {
      setBrowser('Opera');
    } else if (ua.includes('Chrome/')) {
      setBrowser('Chrome');
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
      setBrowser('Safari');
    }
  }, [isOpen]);

  // 2. Fetch all folders from API & sync default folder from localStorage when modal opens
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    // Load user's configured default folder
    const savedDefault = localStorage.getItem('swipemark_default_folder') || 'MySaved';
    setDefaultFolder(savedDefault);
    setSelectedFolder(savedDefault);

    // Fetch existing folders from database
    const loadFolders = async () => {
      try {
        const res = await fetch('/api/folders');
        const smartNames = SMART_CATEGORIES.map((c) => c.name);
        if (res.ok) {
          const data = await res.json();
          const fetchedNames: string[] = (data.folders || []).map((f: any) => f.fullPath || f.title);
          const merged = Array.from(
            new Set(['MySaved', 'Bookmarks Bar', ...(availableFolders || []), ...smartNames, ...fetchedNames])
          ).filter(Boolean);
          setAllFolders(merged);
        } else {
          const merged = Array.from(new Set(['MySaved', 'Bookmarks Bar', ...(availableFolders || []), ...smartNames]));
          setAllFolders(merged);
        }
      } catch {
        const smartNames = SMART_CATEGORIES.map((c) => c.name);
        const merged = Array.from(new Set(['MySaved', 'Bookmarks Bar', ...(availableFolders || []), ...smartNames]));
        setAllFolders(merged);
      }
    };

    loadFolders();
  }, [isOpen]);

  // Auto-classify URL and Title whenever they change
  useEffect(() => {
    if (!url.trim()) {
      setSuggestedFolder(null);
      return;
    }
    const result = classifyByRules(title, url);
    setSuggestedFolder(result);
  }, [url, title]);

  // 3. Auto-populate CURRENT TAB's webpage URL on open (NOT last copied clipboard)
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    setError(null);
    setSuccess(false);
    setPastedFeedback(false);

    // Default to active current tab webpage URL
    if (window.location && window.location.href) {
      setUrl(window.location.href);
      if (document.title && !document.title.includes('Swipe Mark')) {
        setTitle(document.title);
      } else {
        try {
          const parsed = new URL(window.location.href);
          setTitle(parsed.hostname.replace('www.', ''));
        } catch {
          setTitle('Current Tab');
        }
      }
    }
  }, [isOpen]);

  // Handle setting a folder as the permanent Default Folder
  const handleSetAsDefault = (folderName: string) => {
    setDefaultFolder(folderName);
    setSelectedFolder(folderName);
    if (typeof window !== 'undefined') {
      localStorage.setItem('swipemark_default_folder', folderName);
      // Broadcast to extension if active
      window.postMessage(
        {
          type: 'BOOKMARK_SWIPE_ACTION',
          action: 'SET_DEFAULT_FOLDER',
          payload: { defaultFolder: folderName },
        },
        '*'
      );
    }
  };

  const handleAddNewFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFolderName.trim();
    if (!clean) return;
    if (!allFolders.includes(clean)) {
      setAllFolders((prev) => [...prev, clean]);
    }
    setSelectedFolder(clean);
    setNewFolderName('');
    setIsCreatingNewFolder(false);
  };

  // Only paste copied clipboard link on user click
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text?.trim();
      if (trimmed) {
        setUrl(trimmed);
        try {
          const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
          setTitle(parsed.hostname.replace('www.', ''));
        } catch {}
        setPastedFeedback(true);
        setTimeout(() => setPastedFeedback(false), 2200);
      } else {
        setError('Clipboard is empty or does not contain a link');
      }
    } catch {
      setError('Clipboard permission required. Please paste manually into the URL field.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let cleanUrl = url.trim();
    if (!cleanUrl) {
      setError('Please enter a valid URL');
      return;
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    try {
      new URL(cleanUrl);
    } catch {
      setError('Invalid URL format');
      return;
    }

    setIsLoading(true);
    try {
      const targetFolder = selectedFolder.trim() || defaultFolder || 'MySaved';

      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanUrl,
          title: title.trim() || undefined,
          folder: targetFolder,
          browser, // Auto-detected silently
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save bookmark');
      }

      setSuccess(true);
      onBookmarkCreated(data.bookmark);

      setTimeout(() => {
        setUrl('');
        setTitle('');
        setSuccess(false);
        setIsLoading(false);
        onClose();
      }, 600);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error creating bookmark';
      setError(message);
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl border-2 border-black shadow-[6px_6px_0px_#09090b] p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#fde047] border-2 border-black text-black flex items-center justify-center shadow-[2px_2px_0px_#09090b]">
              <BookmarkPlus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-black tracking-tight leading-none">
                  Quick Bookmark
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-black tracking-wider bg-black text-white rounded">
                  SHIFT + B
                </span>
              </div>
              <p className="text-xs text-zinc-600 font-semibold mt-1">
                Auto-detected current webpage & folder selection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border-2 border-transparent hover:border-black hover:bg-zinc-100 text-black transition-colors"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Error / Success notice */}
        {error && (
          <div className="p-3 text-xs font-bold text-black bg-[#fb7185] border-2 border-black rounded-xl shadow-[2px_2px_0px_#09090b]">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 text-xs font-bold text-black bg-[#34d399] border-2 border-black rounded-xl shadow-[2px_2px_0px_#09090b] flex items-center gap-2">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              Bookmark saved into <b>{selectedFolder}</b>!
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* URL Input (Default: Current Tab | Paste Copied on Click) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-black text-black uppercase tracking-wider">
                  Webpage URL
                </label>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-zinc-100 border border-black text-zinc-700">
                  Current Tab
                </span>
              </div>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-black border-2 border-black rounded-lg shadow-[1.5px_1.5px_0px_#09090b] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer ${
                  pastedFeedback
                    ? 'bg-[#34d399] text-black font-black'
                    : 'bg-[#fde047] hover:bg-[#facc15] text-black'
                }`}
                title="Click to paste copied link from clipboard"
              >
                <Clipboard className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{pastedFeedback ? 'Pasted from Clipboard!' : 'Paste Copied Link'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (!title && e.target.value) {
                    try {
                      const u = new URL(
                        e.target.value.startsWith('http')
                          ? e.target.value
                          : `https://${e.target.value}`
                      );
                      setTitle(u.hostname.replace('www.', ''));
                    } catch {}
                  }
                }}
                placeholder="https://example.com"
                autoFocus
                className="w-full pl-3.5 pr-10 py-2.5 text-xs font-bold text-black placeholder-zinc-400 bg-zinc-50 border-2 border-black rounded-xl shadow-[2px_2px_0px_#09090b] focus:outline-none focus:bg-white transition-all"
              />
              <Globe className="w-4 h-4 text-black absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-black uppercase tracking-wider">
              Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Modern Web Design System"
              className="w-full px-3.5 py-2.5 text-xs font-bold text-black placeholder-zinc-400 bg-zinc-50 border-2 border-black rounded-xl shadow-[2px_2px_0px_#09090b] focus:outline-none focus:bg-white transition-all"
            />
          </div>

          {/* Smart AI Suggested Folder with Category Icon & 1-Click Apply */}
          {suggestedFolder && (
            <div className="p-3 bg-purple-50 border-2 border-black rounded-xl shadow-[2.5px_2.5px_0px_#09090b] flex items-center justify-between gap-2 transition-all">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-purple-200 border-2 border-black flex items-center justify-center text-base shrink-0 shadow-[1px_1px_0px_#000]">
                  <span>{suggestedFolder.emoji}</span>
                </div>
                <div className="leading-tight min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-700" />
                      AI Suggestion
                    </span>
                    <span className="text-[9px] font-black px-1.5 py-0.2 bg-purple-200 rounded text-purple-950 border border-purple-400">
                      {Math.round(suggestedFolder.confidence * 100)}% match
                    </span>
                  </div>
                  <span className="text-xs font-black text-black block truncate max-w-[200px]">
                    {suggestedFolder.folder}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!allFolders.includes(suggestedFolder.folder)) {
                    setAllFolders((prev) => [suggestedFolder.folder, ...prev]);
                  }
                  setSelectedFolder(suggestedFolder.folder);
                }}
                className={`px-3 py-1.5 text-xs font-black border-2 border-black rounded-lg shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer shrink-0 ${
                  selectedFolder === suggestedFolder.folder
                    ? 'bg-[#34d399] text-black font-black'
                    : 'bg-[#fde047] hover:bg-yellow-300 text-black'
                }`}
              >
                {selectedFolder === suggestedFolder.folder ? '✓ Applied' : 'Apply'}
              </button>
            </div>
          )}

          {/* Choose Where to Save - Show All Folders & Allow Default Folder Selection */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FolderIcon className="w-3.5 h-3.5 text-black" />
                <label className="text-xs font-black text-black uppercase tracking-wider">
                  Save to Folder
                </label>
              </div>
              <span className="text-[11px] text-zinc-600 font-semibold">
                Default: <b className="text-black">{defaultFolder}</b>
              </span>
            </div>

            {/* Folder Pills Grid */}
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1 pb-1">
              {allFolders.map((folderName) => {
                const isSelected = selectedFolder === folderName;
                const isDefault = defaultFolder === folderName;
                const categoryEmoji = getCategoryEmoji(folderName);

                return (
                  <div
                    key={folderName}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-black transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#fde047] text-black shadow-[2px_2px_0px_#09090b] scale-102'
                        : 'bg-white text-black hover:bg-zinc-100 shadow-[1px_1px_0px_#09090b]'
                    }`}
                    onClick={() => setSelectedFolder(folderName)}
                  >
                    <span className="text-sm shrink-0 leading-none">{categoryEmoji}</span>
                    <span className="truncate max-w-[140px]">{folderName}</span>

                    {/* Star Default Badge / Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetAsDefault(folderName);
                      }}
                      className={`p-0.5 rounded transition-colors ${
                        isDefault
                          ? 'text-black fill-black'
                          : 'text-zinc-400 hover:text-black hover:fill-amber-400'
                      }`}
                      title={
                        isDefault
                          ? 'This is your default folder'
                          : `Make "${folderName}" your default folder`
                      }
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          isDefault ? 'fill-black text-black' : 'text-zinc-400'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}

              {/* Add New Folder Pill Toggle */}
              {!isCreatingNewFolder ? (
                <button
                  type="button"
                  onClick={() => setIsCreatingNewFolder(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-dashed border-black bg-zinc-50 hover:bg-zinc-100 text-black transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Folder</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 w-full mt-1">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g. MySaved, Projects..."
                    autoFocus
                    className="flex-1 px-3 py-1.5 text-xs font-bold border-2 border-black rounded-xl bg-white shadow-[1px_1px_0px_#09090b] focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewFolder(e);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewFolder}
                    className="px-3 py-1.5 rounded-xl bg-black text-white text-xs font-bold border-2 border-black shadow-[1px_1px_0px_#09090b]"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewFolder(false)}
                    className="p-1.5 rounded-xl text-zinc-500 hover:text-black"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Set Selected as Default Action Button */}
            {selectedFolder && selectedFolder !== defaultFolder && (
              <div className="flex items-center justify-between pt-1 text-[11px] font-bold text-zinc-600">
                <span>Selected: <b className="text-black">{selectedFolder}</b></span>
                <button
                  type="button"
                  onClick={() => handleSetAsDefault(selectedFolder)}
                  className="inline-flex items-center gap-1 text-black underline hover:text-indigo-600"
                >
                  <Star className="w-3 h-3 fill-black text-black" />
                  Make "{selectedFolder}" my default folder
                </button>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t-2 border-black">
            <div className="text-[11px] text-zinc-600 font-bold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-black" />
              <span>Auto-sync enabled</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl border-2 border-black bg-white hover:bg-zinc-100 text-xs font-bold text-black shadow-[2px_2px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-bold border-2 border-black shadow-[2px_2px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {isLoading ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>Save Bookmark</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
