"use strict";
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  X,
  ExternalLink,
  Search,
  Trash2,
  Layers,
  Sparkles,
  Globe,
  RefreshCw,
  FolderTree,
  Bot,
  ArrowUpDown,
  Check,
  Edit3,
  Loader2,
} from "lucide-react";
import { getCategoryEmoji } from "@/lib/smartFolderClassifier";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FolderNode {
  id: string;
  name: string;
  fullPath: string;
  count: number;
  children: FolderNode[];
}

export interface BookmarkEntry {
  id: string;
  title: string;
  url: string;
  folder: string;
  status: "unreviewed" | "saved" | "skipped";
  browser?: string;
  favicon?: string;
  dateAdded?: string;
}

export interface OpenFolderWindow {
  id: string;
  folderName: string;
  colorScheme: {
    bg: string;
    border: string;
    badge: string;
    headerBg: string;
  };
}

const PANEL_COLORS = [
  {
    bg: "bg-rose-50/90",
    border: "border-rose-500",
    badge: "bg-rose-200 text-rose-900 border-rose-400",
    headerBg: "bg-[#fb7185]",
  },
  {
    bg: "bg-sky-50/90",
    border: "border-sky-500",
    badge: "bg-sky-200 text-sky-900 border-sky-400",
    headerBg: "bg-[#38bdf8]",
  },
  {
    bg: "bg-amber-50/90",
    border: "border-amber-500",
    badge: "bg-amber-200 text-amber-900 border-amber-400",
    headerBg: "bg-[#fde047]",
  },
  {
    bg: "bg-purple-50/90",
    border: "border-purple-500",
    badge: "bg-purple-200 text-purple-900 border-purple-400",
    headerBg: "bg-[#c084fc]",
  },
  {
    bg: "bg-emerald-50/90",
    border: "border-emerald-500",
    badge: "bg-emerald-200 text-emerald-900 border-emerald-400",
    headerBg: "bg-[#34d399]",
  },
];

// Semantic AI-style Title Cleaner
function cleanTitleText(rawTitle: string, url: string): string {
  let title = (rawTitle || "").trim();

  // If title is missing or just the URL
  if (!title || title.startsWith("http://") || title.startsWith("https://")) {
    try {
      const u = new URL(url);
      const pathParts = u.pathname.split("/").filter(Boolean);
      if (pathParts.length > 0) {
        const last = pathParts[pathParts.length - 1].replace(/[-_]/g, " ");
        return last.charAt(0).toUpperCase() + last.slice(1);
      }
      return u.hostname.replace(/^www\./, "");
    } catch {
      return title || url;
    }
  }

  // Remove common SEO boilerplate tails like " | Official Site", " - GitHub", " : Home"
  title = title
    .replace(
      /\s*[-–|:]\s*(Official Site|Home|Download|Free|Website|Welcome to).*$/i,
      "",
    )
    .replace(
      /\s*[-–|:]\s*(GitHub|YouTube|Twitter|X|Reddit|Medium|Substack)$/i,
      "",
    )
    .replace(/\s*\(.*?\)$/, "") // Remove trailing parentheticals
    .replace(/\s{2,}/g, " ")
    .trim();

  return title || rawTitle;
}

interface FolderTreeExplorerProps {
  onClose?: () => void;
  onBookmarkUpdated?: () => void;
  initialOpenFolder?: string;
}

export default function FolderTreeExplorer({
  onClose,
  onBookmarkUpdated,
  initialOpenFolder,
}: FolderTreeExplorerProps) {
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [rawFolderList, setRawFolderList] = useState<
    { fullPath: string; count: number }[]
  >([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>(
    {},
  );

  // Sorting state for Tree Hierarchy: "default" | "alpha" | "count"
  const [treeSortOrder, setTreeSortOrder] = useState<
    "default" | "alpha" | "count"
  >("default");

  // Multi-Window Folder Panels (Starts completely empty: no auto-opened windows!)
  const [openWindows, setOpenWindows] = useState<OpenFolderWindow[]>([]);
  const [panelBookmarks, setPanelBookmarks] = useState<
    Record<string, BookmarkEntry[]>
  >({});
  const [loadingPanels, setLoadingPanels] = useState<Record<string, boolean>>(
    {},
  );
  const [panelFilter, setPanelFilter] = useState<Record<string, string>>({});
  const [panelSortOrder, setPanelSortOrder] = useState<
    Record<string, "default" | "alpha" | "newest" | "oldest" | "domain">
  >({});

  // Inline Title Editing state
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(
    null,
  );
  const [editingTitleText, setEditingTitleText] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  // Global Smart Sort & Clean Titles state
  const [isSmartSorting, setIsSmartSorting] = useState(false);
  const [smartSortStatus, setSmartSortStatus] = useState<string | null>(null);
  const [isCleaningTitles, setIsCleaningTitles] = useState<
    Record<string, boolean>
  >({});

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch all folders & counts
  const loadFolders = async () => {
    setIsLoadingFolders(true);
    try {
      const res = await fetch("/api/folders");
      if (res.ok) {
        const data = await res.json();
        const folderItems = data.folders || [];
        setRawFolderList(folderItems);

        // Build hierarchical tree
        const tree = buildTree(folderItems, treeSortOrder);
        setFolders(tree);

        // Expand root nodes by default
        const initialExpanded: Record<string, boolean> = {};
        tree.forEach((node) => {
          initialExpanded[node.fullPath] = true;
        });
        setExpandedNodes(initialExpanded);

        // Only open initial folder IF explicitly requested via prop!
        // DO NOT auto-open any window otherwise!
        if (initialOpenFolder) {
          openFolderWindow(initialOpenFolder);
        }
      }
    } catch (err) {
      console.error("Failed to load folders for tree explorer:", err);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, [treeSortOrder]);

  // Build tree from flat folder paths like "Bookmarks Bar / Sub / Nested"
  const buildTree = (
    items: { fullPath: string; count: number }[],
    sortMode: "default" | "alpha" | "count" = "default",
  ): FolderNode[] => {
    const rootNodes: FolderNode[] = [];
    const map = new Map<string, FolderNode>();

    let sorted = [...items];
    if (sortMode === "alpha") {
      sorted.sort((a, b) => a.fullPath.localeCompare(b.fullPath));
    } else if (sortMode === "count") {
      sorted.sort((a, b) => b.count - a.count);
    } else {
      sorted.sort((a, b) => a.fullPath.localeCompare(b.fullPath));
    }

    for (const item of sorted) {
      const parts = item.fullPath.split(/\s*[\/\\]\s*/).filter(Boolean);
      let currentPath = "";

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const prevPath = currentPath;
        currentPath = prevPath ? `${prevPath} / ${part}` : part;

        if (!map.has(currentPath)) {
          const newNode: FolderNode = {
            id: currentPath,
            name: part,
            fullPath: currentPath,
            count: currentPath === item.fullPath ? item.count : 0,
            children: [],
          };
          map.set(currentPath, newNode);

          if (i === 0) {
            rootNodes.push(newNode);
          } else {
            const parent = map.get(prevPath);
            if (
              parent &&
              !parent.children.some((c) => c.fullPath === newNode.fullPath)
            ) {
              parent.children.push(newNode);
            }
          }
        } else if (currentPath === item.fullPath) {
          const existing = map.get(currentPath)!;
          existing.count = item.count;
        }
      }
    }

    return rootNodes;
  };

  // Open or focus a folder window panel (without forcing unwanted rightward auto-scroll!)
  const openFolderWindow = async (folderName: string) => {
    const clean = folderName.trim();
    if (!clean) return;

    // Check if already open
    const existingIndex = openWindows.findIndex((w) => w.folderName === clean);
    if (existingIndex !== -1) {
      return; // Already open, no action needed
    }

    const colorScheme = PANEL_COLORS[openWindows.length % PANEL_COLORS.length];
    const newWindow: OpenFolderWindow = {
      id: `win-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      folderName: clean,
      colorScheme,
    };

    setOpenWindows((prev) => [...prev, newWindow]);
    fetchBookmarksForFolder(clean);
  };

  const closeFolderWindow = (windowId: string) => {
    setOpenWindows((prev) => prev.filter((w) => w.id !== windowId));
  };

  const fetchBookmarksForFolder = async (folderName: string) => {
    setLoadingPanels((prev) => ({ ...prev, [folderName]: true }));
    try {
      const res = await fetch(
        `/api/bookmarks?folder=${encodeURIComponent(folderName)}&limit=150`,
      );
      if (res.ok) {
        const data = await res.json();
        setPanelBookmarks((prev) => ({
          ...prev,
          [folderName]: data.bookmarks || [],
        }));
      }
    } catch (err) {
      console.error(`Error loading bookmarks for folder ${folderName}:`, err);
    } finally {
      setLoadingPanels((prev) => ({ ...prev, [folderName]: false }));
    }
  };

  const toggleExpand = (path: string) => {
    setExpandedNodes((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  // Delete Bookmark
  const handleDeleteBookmark = async (
    bookmarkId: string,
    folderName: string,
  ) => {
    try {
      const res = await fetch(`/api/bookmarks/${bookmarkId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPanelBookmarks((prev) => ({
          ...prev,
          [folderName]: (prev[folderName] || []).filter(
            (b) => b.id !== bookmarkId,
          ),
        }));
        loadFolders();
        if (onBookmarkUpdated) onBookmarkUpdated();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Inline Rename Bookmark Title
  const handleSaveInlineTitle = async (
    bookmarkId: string,
    folderName: string,
  ) => {
    if (!editingTitleText.trim()) return;
    setIsSavingTitle(true);
    try {
      const res = await fetch(`/api/bookmarks/${bookmarkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editingTitleText.trim() }),
      });
      if (res.ok) {
        setPanelBookmarks((prev) => ({
          ...prev,
          [folderName]: (prev[folderName] || []).map((b) =>
            b.id === bookmarkId ? { ...b, title: editingTitleText.trim() } : b,
          ),
        }));
        setEditingBookmarkId(null);
        if (onBookmarkUpdated) onBookmarkUpdated();
      }
    } catch (err) {
      console.error("Rename title error:", err);
    } finally {
      setIsSavingTitle(false);
    }
  };

  // AI Clean Titles for a Specific Folder
  const handleCleanFolderTitles = async (folderName: string) => {
    const list = panelBookmarks[folderName] || [];
    if (list.length === 0) return;

    setIsCleaningTitles((prev) => ({ ...prev, [folderName]: true }));
    try {
      const updatedList = [...list];
      for (const item of updatedList) {
        const cleaned = cleanTitleText(item.title, item.url);
        if (cleaned !== item.title) {
          await fetch(`/api/bookmarks/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: cleaned }),
          });
          item.title = cleaned;
        }
      }

      setPanelBookmarks((prev) => ({
        ...prev,
        [folderName]: updatedList,
      }));
      if (onBookmarkUpdated) onBookmarkUpdated();
    } catch (err) {
      console.error("Clean titles error:", err);
    } finally {
      setIsCleaningTitles((prev) => ({ ...prev, [folderName]: false }));
    }
  };

  // Global AI Smart Sort (classifier.dev)
  const handleGlobalSmartSort = async () => {
    setIsSmartSorting(true);
    setSmartSortStatus("Categorizing bookmarks with AI...");
    try {
      // 1. Fetch unreviewed/all bookmarks
      const bRes = await fetch("/api/bookmarks?limit=100");
      if (!bRes.ok) throw new Error("Failed to load bookmarks");
      const bData = await bRes.json();
      const allItems = bData.bookmarks || [];

      if (allItems.length === 0) {
        setSmartSortStatus("No bookmarks found to sort.");
        setTimeout(() => setSmartSortStatus(null), 3000);
        return;
      }

      // 2. Call classify API
      const classifyRes = await fetch("/api/bookmarks/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookmarks: allItems.map(
            (b: { id: string; title: string; url: string }) => ({
              id: b.id,
              title: b.title,
              url: b.url,
            }),
          ),
        }),
      });

      if (!classifyRes.ok) throw new Error("Classify request failed");
      const classifyData = await classifyRes.json();
      const classifiedList = classifyData.classified || [];

      // 3. Update bookmarks to new suggested folders
      let updatedCount = 0;
      for (const item of classifiedList) {
        if (item.id && item.suggestedFolder) {
          await fetch(`/api/bookmarks/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folder: item.suggestedFolder }),
          });
          updatedCount++;
        }
      }

      setSmartSortStatus(
        `🎉 Organized ${updatedCount} bookmarks into smart folders!`,
      );
      loadFolders();
      // Reload any open panels
      openWindows.forEach((w) => fetchBookmarksForFolder(w.folderName));
      if (onBookmarkUpdated) onBookmarkUpdated();
      setTimeout(() => setSmartSortStatus(null), 4000);
    } catch (err) {
      console.error("Smart sort error:", err);
      setSmartSortStatus("Smart sort encountered an issue.");
      setTimeout(() => setSmartSortStatus(null), 3000);
    } finally {
      setIsSmartSorting(false);
    }
  };

  // Render tree node recursively
  const renderTreeNode = (node: FolderNode, depth = 0) => {
    const isExpanded = !!expandedNodes[node.fullPath];
    const hasChildren = node.children.length > 0;
    const isWindowOpen = openWindows.some(
      (w) => w.folderName === node.fullPath,
    );
    const emoji = getCategoryEmoji(node.name);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches =
        node.name.toLowerCase().includes(q) ||
        node.fullPath.toLowerCase().includes(q);
      const childMatches = node.children.some(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.fullPath.toLowerCase().includes(q),
      );
      if (!matches && !childMatches) return null;
    }

    return (
      <div key={node.fullPath} className="select-none">
        <div
          onClick={() => openFolderWindow(node.fullPath)}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={`group flex items-center justify-between py-2 pr-2.5 rounded-xl border-2 transition-all cursor-pointer text-xs font-bold ${
            isWindowOpen
              ? "bg-[#fde047] text-black border-black shadow-[2px_2px_0px_#000] translate-x-1"
              : "bg-white hover:bg-zinc-100 text-black border-transparent hover:border-black"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.fullPath);
                }}
                className="p-0.5 rounded hover:bg-black/10 text-black shrink-0 transition-transform"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
              </button>
            ) : (
              <span className="w-3.5 h-3.5 shrink-0 inline-block text-center text-zinc-300">
                •
              </span>
            )}

            <span className="text-sm shrink-0 leading-none">{emoji}</span>
            <span
              className="truncate max-w-[130px] sm:max-w-[160px]"
              title={node.fullPath}
            >
              {node.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-black border border-black ${
                isWindowOpen
                  ? "bg-black text-yellow-300"
                  : "bg-zinc-100 text-zinc-700"
              }`}
            >
              {node.count}
            </span>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-1 mt-1">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#fafaf9] rounded-2xl border-2 border-black shadow-[6px_6px_0px_#000] overflow-hidden">
      {/* Top Explorer Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3.5 bg-white border-b-2 border-black shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#34d399] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <FolderTree className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-black uppercase tracking-wider">
                Folder Tree Explorer
              </h2>
            </div>
            <p className="text-[11px] text-zinc-600 font-semibold">
              Click any folder in the tree to open its window side-by-side with
              horizontal scroll
            </p>
          </div>
        </div>

        {/* Global Toolbar Actions (Smart Sort, Rearrange, Close) */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Smart Sort Button */}
          <button
            type="button"
            onClick={handleGlobalSmartSort}
            disabled={isSmartSorting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-black text-xs font-black shadow-[2px_2px_0px_#000] bg-purple-200 hover:bg-purple-300 text-purple-950 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50"
            title="Auto-organize bookmarks into smart category folders"
          >
            {isSmartSorting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Bot className="w-3.5 h-3.5 text-purple-900" />
            )}
            <span>{isSmartSorting ? "Sorting..." : "Smart Sort"}</span>
          </button>

          {/* Rearrange / Sort Folders Toggle */}
          <button
            type="button"
            onClick={() => {
              setTreeSortOrder((prev) =>
                prev === "default"
                  ? "alpha"
                  : prev === "alpha"
                    ? "count"
                    : "default",
              );
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-black text-xs font-bold shadow-[2px_2px_0px_#000] bg-zinc-100 hover:bg-zinc-200 text-black active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            title={`Sort Folders: ${
              treeSortOrder === "default"
                ? "Standard Depth"
                : treeSortOrder === "alpha"
                  ? "Alphabetical (A-Z)"
                  : "Bookmark Count"
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {treeSortOrder === "default"
                ? "Sort: Default"
                : treeSortOrder === "alpha"
                  ? "Sort: A-Z"
                  : "Sort: Count"}
            </span>
          </button>

          <button
            type="button"
            onClick={loadFolders}
            className="p-2 rounded-xl border-2 border-black bg-white hover:bg-zinc-100 text-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            title="Refresh folders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border-2 border-black bg-[#fb7185] hover:bg-rose-500 text-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
              title="Close Folder Explorer"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          )}
        </div>
      </div>

      {/* Smart Sort Status Notification */}
      {smartSortStatus && (
        <div className="bg-purple-100 border-b-2 border-black px-4 py-2 text-xs font-black text-purple-950 flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-purple-700" />
          <span>{smartSortStatus}</span>
        </div>
      )}

      {/* Main Horizontal Miller Columns Container with X-Scrollbar */}
      <div
        ref={scrollContainerRef}
        className="flex-1 flex overflow-x-auto overflow-y-hidden p-4 sm:p-5 gap-4 sm:gap-5 custom-x-scrollbar"
      >
        {/* ========================================================= */}
        {/* PANE 1: TREE STRUCTURE SIDEBAR (Green panel in drawing)  */}
        {/* ========================================================= */}
        <div className="w-[300px] sm:w-[320px] shrink-0 bg-emerald-50/90 rounded-2xl border-2 border-emerald-600 shadow-[4px_4px_0px_#000] flex flex-col h-full overflow-hidden">
          {/* Tree Header */}
          <div className="p-4 bg-[#34d399] border-b-2 border-black flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-black stroke-[2.5]" />
              <h3 className="text-xs font-black text-black uppercase tracking-wider">
                Folder Tree Hierarchy
              </h3>
            </div>
            <span className="px-1.5 py-0.5 rounded-md bg-black text-emerald-300 text-[10px] font-black font-mono">
              {rawFolderList.length} folders
            </span>
          </div>

          {/* Tree Search Box */}
          <div className="p-3 bg-white/70 border-b-2 border-black/20 shrink-0">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search folders..."
                className="w-full pl-8 pr-3 py-1.5 text-xs font-bold bg-white border-2 border-black rounded-xl text-black placeholder-zinc-400 focus:outline-hidden shadow-[2px_2px_0px_#000]"
              />
              <Search className="w-3.5 h-3.5 text-black absolute left-2.5 top-1/2 -translate-y-1/2 stroke-[2.5]" />
            </div>
          </div>

          {/* Tree Node List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
            {isLoadingFolders ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-zinc-600">
                  Loading folder tree...
                </p>
              </div>
            ) : folders.length === 0 ? (
              <div className="py-8 text-center text-xs font-bold text-zinc-500">
                No folders found.
              </div>
            ) : (
              folders.map((node) => renderTreeNode(node))
            )}
          </div>

          {/* Tree Footer Hint */}
          <div className="p-3 bg-emerald-100/60 border-t-2 border-black/20 text-center shrink-0">
            <p className="text-[10px] font-bold text-emerald-950 flex items-center justify-center gap-1">
              <span>👉 Click any folder to open its window panel</span>
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PANE 2+: DYNAMIC OPEN FOLDER WINDOWS (Red, Blue, Yellow) */}
        {/* ========================================================= */}
        {openWindows.map((win) => {
          const bookmarks = panelBookmarks[win.folderName] || [];
          const isLoading = !!loadingPanels[win.folderName];
          const filterText = panelFilter[win.folderName] || "";
          const sortOrder = panelSortOrder[win.folderName] || "default";
          const isCleaning = !!isCleaningTitles[win.folderName];
          const emoji = getCategoryEmoji(win.folderName);

          // Apply Filter
          let filtered = bookmarks.filter((b) => {
            if (!filterText.trim()) return true;
            const q = filterText.toLowerCase();
            return (
              b.title.toLowerCase().includes(q) ||
              b.url.toLowerCase().includes(q)
            );
          });

          // Apply Sort
          if (sortOrder === "alpha") {
            filtered = [...filtered].sort((a, b) =>
              a.title.localeCompare(b.title),
            );
          } else if (sortOrder === "newest") {
            filtered = [...filtered].sort(
              (a, b) =>
                new Date(b.dateAdded || 0).getTime() -
                new Date(a.dateAdded || 0).getTime(),
            );
          } else if (sortOrder === "oldest") {
            filtered = [...filtered].sort(
              (a, b) =>
                new Date(a.dateAdded || 0).getTime() -
                new Date(b.dateAdded || 0).getTime(),
            );
          } else if (sortOrder === "domain") {
            filtered = [...filtered].sort((a, b) => {
              try {
                const uA = new URL(a.url).hostname;
                const uB = new URL(b.url).hostname;
                return uA.localeCompare(uB);
              } catch {
                return 0;
              }
            });
          }

          return (
            <div
              key={win.id}
              className={`folder-window-panel w-[320px] sm:w-[360px] shrink-0 ${win.colorScheme.bg} rounded-2xl border-2 border-black shadow-[5px_5px_0px_#000] flex flex-col h-full overflow-hidden transition-all animate-window-slide`}
            >
              {/* Window Header with Close (X) button */}
              <div
                className={`p-3.5 ${win.colorScheme.headerBg} border-b-2 border-black flex items-center justify-between shrink-0`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg leading-none shrink-0">{emoji}</span>
                  <div className="min-w-0">
                    <h3
                      className="text-xs font-black text-black uppercase tracking-tight truncate max-w-[200px]"
                      title={win.folderName}
                    >
                      {win.folderName}
                    </h3>
                    <span className="text-[10px] font-bold text-black/80 block">
                      {bookmarks.length} bookmarks
                    </span>
                  </div>
                </div>

                {/* Window Close (X) button */}
                <button
                  type="button"
                  onClick={() => closeFolderWindow(win.id)}
                  className="p-1 rounded-lg bg-white/80 hover:bg-black hover:text-white text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all shrink-0 cursor-pointer"
                  title="Close this folder window"
                >
                  <X className="w-4 h-4 stroke-[3]" />
                </button>
              </div>

              {/* Folder Search / Filter */}
              <div className="p-2.5 bg-white/80 border-b-2 border-black/20 shrink-0 space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={filterText}
                    onChange={(e) =>
                      setPanelFilter((prev) => ({
                        ...prev,
                        [win.folderName]: e.target.value,
                      }))
                    }
                    placeholder={`Filter in ${win.folderName}...`}
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-bold bg-white border-2 border-black rounded-xl text-black placeholder-zinc-400 focus:outline-hidden shadow-[1.5px_1.5px_0px_#000]"
                  />
                  <Search className="w-3.5 h-3.5 text-black absolute left-2.5 top-1/2 -translate-y-1/2 stroke-[2.5]" />
                </div>

                {/* Window Mini Toolbar: AI Clean Titles & Sort */}
                <div className="flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCleanFolderTitles(win.folderName)}
                    disabled={isCleaning}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 bg-white hover:bg-purple-100 border border-black rounded-lg text-[10px] font-black shadow-[1px_1px_0px_#000] transition active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
                    title="Clean noisy titles in this folder with AI"
                  >
                    {isCleaning ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-purple-700" />
                    )}
                    <span>{isCleaning ? "Cleaning..." : "Clean Titles"}</span>
                  </button>

                  <div className="flex-1 min-w-0">
                    <Select
                      value={sortOrder}
                      onValueChange={(val) => {
                        if (val) {
                          setPanelSortOrder((prev) => ({
                            ...prev,
                            [win.folderName]: val as any,
                          }));
                        }
                      }}
                    >
                      <SelectTrigger
                        size="sm"
                        className="w-full h-7 px-2 py-0.5 border border-black rounded-lg text-[10px] font-black shadow-[1px_1px_0px_#000]"
                      >
                        <SelectValue placeholder="↕ Sort: Default">
                          {sortOrder === "alpha"
                            ? "A-Z Name"
                            : sortOrder === "newest"
                            ? "Newest First"
                            : sortOrder === "oldest"
                            ? "Oldest First"
                            : sortOrder === "domain"
                            ? "By Domain"
                            : "↕ Sort: Default"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="end" className="min-w-[140px]">
                        <SelectItem value="default">↕ Sort: Default</SelectItem>
                        <SelectItem value="alpha">A-Z Name</SelectItem>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                        <SelectItem value="domain">By Domain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Bookmark List Inside Window */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                {isLoading ? (
                  <div className="py-16 text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-bold text-zinc-600">
                      Loading bookmarks...
                    </p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-12 text-center text-xs font-bold text-zinc-500 bg-white/60 rounded-xl border border-dashed border-black/30 p-4">
                    {filterText ? "No matching bookmarks" : "Folder is empty"}
                  </div>
                ) : (
                  filtered.map((b) => {
                    let hostname = "";
                    try {
                      hostname = new URL(b.url).hostname.replace(/^www\./, "");
                    } catch {
                      hostname = b.url;
                    }

                    const isEditing = editingBookmarkId === b.id;

                    return (
                      <div
                        key={b.id}
                        className="group bg-white p-3 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000] transition-all space-y-2"
                      >
                        {/* Title or Inline Edit */}
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingTitleText}
                              onChange={(e) =>
                                setEditingTitleText(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleSaveInlineTitle(b.id, win.folderName);
                                if (e.key === "Escape")
                                  setEditingBookmarkId(null);
                              }}
                              autoFocus
                              className="flex-1 px-2 py-1 text-xs font-bold bg-yellow-50 border-2 border-black rounded-lg text-black outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleSaveInlineTitle(b.id, win.folderName)
                              }
                              disabled={isSavingTitle}
                              className="p-1 rounded bg-[#34d399] border border-black shadow-[1px_1px_0px_#000] text-black hover:bg-emerald-400"
                              title="Save title"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingBookmarkId(null)}
                              className="p-1 rounded bg-zinc-200 border border-black text-black hover:bg-zinc-300"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <a
                              href={b.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-extrabold text-black hover:underline line-clamp-2 leading-snug flex-1"
                              title={b.title}
                            >
                              {b.title}
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBookmarkId(b.id);
                                setEditingTitleText(b.title);
                              }}
                              className="p-1 rounded text-zinc-400 hover:text-black hover:bg-zinc-100 transition opacity-0 group-hover:opacity-100"
                              title="Rename link title"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* URL Domain & Actions */}
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-100">
                          <div className="flex items-center gap-1.5 text-zinc-600 truncate max-w-[180px]">
                            {b.favicon ? (
                              <img
                                src={b.favicon}
                                alt=""
                                className="w-3.5 h-3.5 rounded shrink-0 object-contain"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display =
                                    "none";
                                }}
                              />
                            ) : (
                              <Globe className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                            )}
                            <span className="truncate font-semibold">
                              {hostname}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <a
                              href={b.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded hover:bg-zinc-100 text-black border border-transparent hover:border-black transition"
                              title="Open link"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteBookmark(b.id, win.folderName)
                              }
                              className="p-1 rounded hover:bg-rose-100 text-zinc-400 hover:text-rose-600 transition"
                              title="Delete bookmark"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
