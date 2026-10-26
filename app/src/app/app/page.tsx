"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Bookmark,
  BookmarkPlus,
  Check,
  X,
  RotateCcw,
  ExternalLink,
  Puzzle,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Folder,
  Globe,
  Search,
  Download,
  Columns,
  Pencil,
  SlidersHorizontal,
  Flame,
  Shield,
  Compass,
  Zap,
  Bot,
  Sparkles,
  FolderTree,
  Clock,
  Info,
  PanelLeft,
  PanelRight,
} from "lucide-react";
import { getCategoryEmoji } from "@/lib/smartFolderClassifier";
import { BookmarkItem } from "@/components/SwipeCard";
import ExtensionModal from "@/components/ExtensionModal";
import QuickBookmarkModal from "@/components/QuickBookmarkModal";
import FolderTreeExplorer from "@/components/FolderTreeExplorer";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  pingExtension,
  chromeUnbookmark,
  chromeRenameBookmark,
} from "@/lib/extensionSync";
import { FolderItem } from "@/components/BookmarkList";
import SkippedSidebar from "@/components/workspace/SkippedSidebar";
import SavedSidebar from "@/components/workspace/SavedSidebar";
import ReviewDeck from "@/components/workspace/ReviewDeck";
import MobileBottomNav from "@/components/workspace/MobileBottomNav";

interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  text: string;
}

interface HistoryAction {
  bookmark: BookmarkItem;
  previousStatus: "unreviewed";
  newStatus: "saved" | "skipped";
}

export default function WorkspaceAppPage() {
  // Active Bookmark for Tinder swipe
  const [currentBookmark, setCurrentBookmark] = useState<BookmarkItem | null>(
    null,
  );
  const [isCardLoading, setIsCardLoading] = useState(true);
  const [isExiting, setIsExiting] = useState<"saved" | "skipped" | null>(null);
  const [historyStack, setHistoryStack] = useState<HistoryAction[]>([]);
  const [isUndoing, setIsUndoing] = useState(false);

  // Live Streams for Left (Skipped) & Right (Saved) Panes
  const [savedBookmarks, setSavedBookmarks] = useState<BookmarkItem[]>([]);
  const [skippedBookmarks, setSkippedBookmarks] = useState<BookmarkItem[]>([]);
  const [isSavedLoading, setIsSavedLoading] = useState(false);
  const [isSkippedLoading, setIsSkippedLoading] = useState(false);
  const [isAutoOrganizing, setIsAutoOrganizing] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    unreviewed: 0,
    saved: 0,
    skipped: 0,
    reviewed: 0,
    progress: 0,
    browsers: [] as { browser: string; count: number }[],
  });

  // Folders list
  const [foldersList, setFoldersList] = useState<FolderItem[]>([]);

  // View mode switcher for mobile/tablet ('deck' by default on mobile, 'all' on >=1280px desktop)
  const [viewMode, setViewMode] = useState<
    "all" | "deck" | "skipped" | "saved" | "tree"
  >("deck");

  // Sidebar Visibility toggles (Desktop)
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  const toggleBothSidebars = () => {
    const anyOpen = isLeftSidebarOpen || isRightSidebarOpen;
    setIsLeftSidebarOpen(!anyOpen);
    setIsRightSidebarOpen(!anyOpen);
  };

  const getCenterSpanClass = () => {
    if (viewMode !== "all") {
      return "xl:col-span-12 max-w-2xl mx-auto";
    }
    if (!isLeftSidebarOpen && !isRightSidebarOpen) {
      return "xl:col-span-12 max-w-2xl mx-auto";
    }
    if (!isLeftSidebarOpen || !isRightSidebarOpen) {
      return "xl:col-span-9 max-w-2xl mx-auto";
    }
    return "xl:col-span-6";
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1280) {
      setViewMode("all");
    }
  }, []);

  // Extension connectivity
  const [isExtensionConnected, setIsExtensionConnected] = useState(false);

  // Modals & Confirmation Dialogs
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [isQuickBookmarkOpen, setIsQuickBookmarkOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isWipeDbModalOpen, setIsWipeDbModalOpen] = useState(false);
  const [isWipingDb, setIsWipingDb] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [unbookmarkTarget, setUnbookmarkTarget] = useState<BookmarkItem | null>(
    null,
  );
  const [isUnbookmarking, setIsUnbookmarking] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const isSwipingRef = useRef(false);

  const showToast = useCallback(
    (text: string, type: "success" | "error" | "info" = "success") => {
      const id = `toast_${Date.now()}_${Math.random()}`;
      setToasts((prev) => [...prev, { id, text, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3200);
    },
    [],
  );

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/bookmarks/stats");
      if (res.ok) {
        const data = await res.json();
        setStats({
          total: data.total || 0,
          unreviewed: data.unreviewed || 0,
          saved: data.saved || 0,
          skipped: data.skipped || 0,
          reviewed: data.reviewed || 0,
          progress: data.progress || 0,
          browsers: data.browsers || [],
        });
      }
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
  }, []);

  // Fetch Folders
  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/folders");
      if (res.ok) {
        const data = await res.json();
        setFoldersList(data.folders || []);
      }
    } catch (err) {
      console.error("Fetch folders error:", err);
    }
  }, []);

  // Fetch Next Card for Tinder Deck
  const fetchNextBookmark = useCallback(async () => {
    setIsCardLoading(true);
    try {
      const res = await fetch("/api/bookmarks/next");
      if (res.ok) {
        const data = await res.json();
        setCurrentBookmark(data.bookmark || null);
      }
    } catch (err) {
      console.error("Next bookmark fetch error:", err);
    } finally {
      setIsCardLoading(false);
      setIsExiting(null);
      isSwipingRef.current = false;
    }
  }, []);

  // Fetch Saved Bookmarks (Right Pane)
  const fetchSavedBookmarks = useCallback(async () => {
    setIsSavedLoading(true);
    try {
      const res = await fetch("/api/bookmarks?status=saved&limit=250");
      if (res.ok) {
        const data = await res.json();
        setSavedBookmarks(data.bookmarks || []);
      }
    } catch (err) {
      console.error("Fetch saved error:", err);
    } finally {
      setIsSavedLoading(false);
    }
  }, []);

  // Fetch Skipped Bookmarks (Left Pane)
  const fetchSkippedBookmarks = useCallback(async () => {
    setIsSkippedLoading(true);
    try {
      const res = await fetch("/api/bookmarks?status=skipped&limit=250");
      if (res.ok) {
        const data = await res.json();
        setSkippedBookmarks(data.bookmarks || []);
      }
    } catch (err) {
      console.error("Fetch skipped error:", err);
    } finally {
      setIsSkippedLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchFolders();
    fetchNextBookmark();
    fetchSavedBookmarks();
    fetchSkippedBookmarks();

    const checkExt = async () => {
      const connected = await pingExtension(700);
      setIsExtensionConnected(connected);
    };
    checkExt();
    const interval = setInterval(checkExt, 5000);

    const handleChromeMsg = (e: MessageEvent) => {
      if (
        e.source === window &&
        e.data?.type === "BOOKMARK_SWIPE_CHROME_EVENT"
      ) {
        showToast(`Chrome sync: ${e.data.action}`, "info");
        fetchStats();
        fetchFolders();
        fetchNextBookmark();
        fetchSavedBookmarks();
        fetchSkippedBookmarks();
      }
    };
    window.addEventListener("message", handleChromeMsg);

    return () => {
      clearInterval(interval);
      window.removeEventListener("message", handleChromeMsg);
    };
  }, [
    fetchStats,
    fetchFolders,
    fetchNextBookmark,
    fetchSavedBookmarks,
    fetchSkippedBookmarks,
    showToast,
  ]);

  // Handle Swipe (Save Right or Skip Left)
  const handleSwipe = useCallback(
    async (direction: "saved" | "skipped") => {
      if (!currentBookmark || isSwipingRef.current) return;
      isSwipingRef.current = true;
      setIsExiting(direction);

      const swiped = currentBookmark;

      // History stack for Undo
      setHistoryStack((prev) => [
        ...prev,
        {
          bookmark: swiped,
          previousStatus: "unreviewed",
          newStatus: direction,
        },
      ]);

      // Optimistic stream update
      if (direction === "saved") {
        setSavedBookmarks((prev) => [{ ...swiped, status: "saved" }, ...prev]);
      } else {
        setSkippedBookmarks((prev) => [
          { ...swiped, status: "skipped" },
          ...prev,
        ]);
      }

      setStats((prev) => {
        const newSaved = direction === "saved" ? prev.saved + 1 : prev.saved;
        const newSkipped =
          direction === "skipped" ? prev.skipped + 1 : prev.skipped;
        const newUnreviewed = Math.max(0, prev.unreviewed - 1);
        const newReviewed = newSaved + newSkipped;
        const newProgress =
          prev.total > 0 ? Math.round((newReviewed / prev.total) * 100) : 0;
        return {
          ...prev,
          saved: newSaved,
          skipped: newSkipped,
          unreviewed: newUnreviewed,
          reviewed: newReviewed,
          progress: newProgress,
        };
      });

      try {
        await fetch(`/api/bookmarks/${swiped.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: direction }),
        });

        setTimeout(() => {
          fetchNextBookmark();
        }, 180);
      } catch (err) {
        console.error("Swipe error:", err);
        setIsExiting(null);
        isSwipingRef.current = false;
        showToast("Error recording swipe", "error");
      }
    },
    [currentBookmark, fetchNextBookmark, showToast],
  );

  // Undo Last Action
  const handleUndo = useCallback(async () => {
    if (historyStack.length === 0 || isUndoing) return;

    setIsUndoing(true);
    const lastAction = historyStack[historyStack.length - 1];

    try {
      await fetch(`/api/bookmarks/${lastAction.bookmark.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "unreviewed" }),
      });

      setHistoryStack((prev) => prev.slice(0, prev.length - 1));
      setCurrentBookmark(lastAction.bookmark);
      setIsExiting(null);
      isSwipingRef.current = false;

      // Clean from live streams
      if (lastAction.newStatus === "saved") {
        setSavedBookmarks((prev) =>
          prev.filter((b) => b.id !== lastAction.bookmark.id),
        );
      } else {
        setSkippedBookmarks((prev) =>
          prev.filter((b) => b.id !== lastAction.bookmark.id),
        );
      }

      await fetchStats();
      showToast(`Restored to queue: ${lastAction.bookmark.title}`, "info");
    } catch (err) {
      console.error("Undo error:", err);
      showToast("Error undoing action", "error");
    } finally {
      setIsUndoing(false);
    }
  }, [historyStack, isUndoing, fetchStats, showToast]);

  // Restore a specific skipped bookmark back to unreviewed
  const handleRestoreSkippedItem = async (bookmark: BookmarkItem) => {
    try {
      await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "unreviewed" }),
      });

      setSkippedBookmarks((prev) => prev.filter((b) => b.id !== bookmark.id));
      await fetchStats();
      if (!currentBookmark) {
        fetchNextBookmark();
      }
      showToast(`Restored "${bookmark.title}" to queue`, "success");
    } catch {
      showToast("Error restoring bookmark", "error");
    }
  };

  // Restore All Skipped Bookmarks back to unreviewed
  const handleRestoreAllSkipped = async () => {
    if (skippedBookmarks.length === 0) return;
    try {
      await fetch("/api/bookmarks/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "skipped" }),
      });

      setSkippedBookmarks([]);
      await fetchStats();
      fetchNextBookmark();
      showToast("All skipped bookmarks restored to queue", "success");
    } catch {
      showToast("Error restoring bookmarks", "error");
    }
  };

  // Move saved item back to unreviewed or skipped
  const handleToggleSavedItem = async (bookmark: BookmarkItem) => {
    try {
      await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "skipped" }),
      });

      setSavedBookmarks((prev) => prev.filter((b) => b.id !== bookmark.id));
      setSkippedBookmarks((prev) => [
        { ...bookmark, status: "skipped" },
        ...prev,
      ]);
      await fetchStats();
      showToast(`Moved "${bookmark.title}" to Skipped`, "info");
    } catch {
      showToast("Error moving bookmark", "error");
    }
  };

  // Unbookmark confirmation execution (Deletes from Chrome & DB)
  const confirmUnbookmark = async () => {
    if (!unbookmarkTarget) return;
    setIsUnbookmarking(true);

    try {
      if (unbookmarkTarget.chromeId) {
        await chromeUnbookmark(unbookmarkTarget.chromeId).catch(() => {});
      }

      await fetch(`/api/bookmarks/${unbookmarkTarget.id}`, {
        method: "DELETE",
      });

      setSavedBookmarks((prev) =>
        prev.filter((b) => b.id !== unbookmarkTarget.id),
      );
      setSkippedBookmarks((prev) =>
        prev.filter((b) => b.id !== unbookmarkTarget.id),
      );

      if (currentBookmark?.id === unbookmarkTarget.id) {
        fetchNextBookmark();
      }

      await fetchStats();
      await fetchFolders();
      showToast(
        `Permanently unbookmarked "${unbookmarkTarget.title}"`,
        "success",
      );
      setUnbookmarkTarget(null);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Error unbookmarking",
        "error",
      );
    } finally {
      setIsUnbookmarking(false);
    }
  };

  // Destructive wipe of all bookmarks & complete DB
  const handleWipeDatabase = async () => {
    setIsWipingDb(true);
    try {
      const res = await fetch("/api/bookmarks/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completeDb: true }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          `Complete DB wiped: deleted ${data.deletedBookmarksCount} bookmarks`,
          "success",
        );
        setCurrentBookmark(null);
        setSavedBookmarks([]);
        setSkippedBookmarks([]);
        await fetchStats();
        await fetchFolders();
        fetchNextBookmark();
      } else {
        showToast(data.error || "Failed to wipe database", "error");
      }
    } catch {
      showToast("Error wiping database", "error");
    } finally {
      setIsWipingDb(false);
      setIsWipeDbModalOpen(false);
    }
  };

  // Inline rename bookmark
  const handleRenameBookmark = async (
    bookmark: BookmarkItem,
    newTitle: string,
  ) => {
    try {
      if (bookmark.chromeId) {
        await chromeRenameBookmark(bookmark.chromeId, newTitle).catch(() => {});
      }

      await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });

      setSavedBookmarks((prev) =>
        prev.map((b) => (b.id === bookmark.id ? { ...b, title: newTitle } : b)),
      );
      setSkippedBookmarks((prev) =>
        prev.map((b) => (b.id === bookmark.id ? { ...b, title: newTitle } : b)),
      );

      if (currentBookmark?.id === bookmark.id) {
        setCurrentBookmark((prev) =>
          prev ? { ...prev, title: newTitle } : null,
        );
      }

      showToast("Title updated", "success");
    } catch {
      showToast("Error renaming bookmark", "error");
    }
  };

  // Auto-organize bookmarks into smart categorized folders using classifier
  const handleAutoOrganize = async () => {
    setIsAutoOrganizing(true);
    try {
      const res = await fetch("/api/bookmarks/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoOrganizeAll: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(
          data.message ||
            `Sorted ${data.updatedCount} bookmarks into smart categorized folders!`,
          "success",
        );
        fetchFolders();
        fetchSavedBookmarks();
        fetchSkippedBookmarks();
        fetchNextBookmark();
        fetchStats();
      } else {
        showToast(data.error || "Failed to auto-sort", "error");
      }
    } catch {
      showToast("Error connecting to smart classifier", "error");
    } finally {
      setIsAutoOrganizing(false);
    }
  };

  // Export saved bookmarks
  const exportBookmarks = (format: "html" | "json") => {
    const items = savedBookmarks;
    let content = "";
    let mime = "";
    let name = "";

    if (format === "json") {
      content = JSON.stringify(items, null, 2);
      mime = "application/json";
      name = `bookmarks-saved-${new Date().toISOString().slice(0, 10)}.json`;
    } else {
      content = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmark Swipe Saved</TITLE>
<H1>Saved Bookmarks</H1>
<DL><p>
${items
  .map(
    (b) =>
      `    <DT><A HREF="${b.url}" ADD_DATE="${Math.floor(
        new Date(b.dateAdded || Date.now()).getTime() / 1000,
      )}">${b.title}</A>`,
  )
  .join("\n")}
</DL><p>`;
      mime = "text/html";
      name = `bookmarks-saved-${new Date().toISOString().slice(0, 10)}.html`;
    }

    const blob = new Blob([content], { type: mime });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.click();
    URL.revokeObjectURL(u);
    showToast(
      `Exported ${items.length} bookmarks (${format.toUpperCase()})`,
      "success",
    );
  };

  // Keyboard navigation & Shift+B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (["input", "textarea", "select"].includes(activeTag)) return;

      // Shift + B: Quick Bookmark Modal
      if (e.shiftKey && (e.key === "B" || e.key.toLowerCase() === "b")) {
        e.preventDefault();
        setIsQuickBookmarkOpen(true);
        return;
      }

      // Tinder swipes
      if (currentBookmark && !isExiting) {
        if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
          e.preventDefault();
          handleSwipe("saved");
        } else if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
          e.preventDefault();
          handleSwipe("skipped");
        } else if (e.key === " " || e.key.toLowerCase() === "o") {
          e.preventDefault();
          window.open(currentBookmark.url, "_blank");
        } else if (e.key.toLowerCase() === "z" || e.key.toLowerCase() === "u") {
          e.preventDefault();
          handleUndo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentBookmark, isExiting, handleSwipe, handleUndo]);

  return (
    <div className="min-h-screen bg-[#fbf9f5] flex flex-col justify-between selection:bg-black selection:text-white w-full max-w-full overflow-x-hidden">
      {/* Top Neobrutalist Header */}
      <header className="sticky top-0 z-30 w-full bg-white border-b-2 border-black px-4 sm:px-6">
        <div className="max-w-[1600px] mx-auto h-16 flex items-center justify-between gap-3">
          {/* Brand & Breadcrumb */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center font-black hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              title="Return to Overview"
            >
              <Bookmark className="w-5 h-5 fill-black stroke-black" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="text-sm sm:text-base font-black text-black tracking-tight hover:underline"
                >
                  Swipe Mark
                </Link>
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5">
            {/* Folder Tree Explorer Mode */}
            <button
              onClick={() => setViewMode(viewMode === "tree" ? "all" : "tree")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-black text-xs font-bold shadow-[2px_2px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all ${
                viewMode === "tree"
                  ? "bg-[#34d399] text-black shadow-none translate-x-[1px] translate-y-[1px]"
                  : "bg-emerald-100 hover:bg-emerald-200 text-emerald-950"
              }`}
              title="Open Tree Structure & Multi-Window Horizontal Sliding Panels"
            >
              <FolderTree className="w-3.5 h-3.5 text-black stroke-[2.5]" />
              <span className="hidden sm:inline">
                {viewMode === "tree" ? "Exit Tree" : "Folder Tree"}
              </span>
            </button>

            {/* Quick Bookmark (Shift + B) */}
            <button
              onClick={() => setIsQuickBookmarkOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-bold border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              title="Quick Bookmark (Shift + B)"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-yellow-300" />
              <span className="hidden sm:inline">Bookmark</span>
              <kbd className="hidden sm:inline text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-yellow-300 font-mono font-bold">
                ⇧B
              </kbd>
            </button>

            {/* Keyboard Shortcuts & Extension Guide (i) Button */}
            <button
              onClick={() => setIsInfoModalOpen(true)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border-2 border-black bg-white hover:bg-yellow-200 text-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center font-black transition-all"
              title="Shortcuts & How to Use Extension (i)"
              aria-label="Information & Shortcuts"
            >
              <Info className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Wipe Complete DB (Destructive) */}
            <button
              onClick={() => setIsWipeDbModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-black text-xs font-bold shadow-[2px_2px_0px_#000] bg-white hover:bg-rose-50 text-black hover:text-rose-600 hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              title="Wipe Complete Database (Destructive: deletes all bookmarks & folders)"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
              <span className="hidden sm:inline">Wipe DB</span>
            </button>
          </div>
        </div>
      </header>
      {/* Panoramic 3-Column Studio Layout OR Multi-Window Tree Explorer */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-24 xl:pb-6">
        {/* Docked Edge Open Buttons when either sidebar is collapsed on desktop */}
        {viewMode === "all" && !isLeftSidebarOpen && (
          <button
            onClick={() => setIsLeftSidebarOpen(true)}
            className="hidden xl:flex fixed left-3 top-20 z-30 items-center gap-2 px-3 py-2 bg-white hover:bg-rose-50 border-2 border-black rounded-xl shadow-[3px_3px_0px_#000] text-xs font-black text-black hover:translate-x-1 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all group cursor-pointer"
            title="Open Skipped & Trash Sidebar"
          >
            <PanelLeft className="w-4 h-4 text-[#fb7185] group-hover:scale-110 transition-transform stroke-[2.5]" />
            <span>Open Skipped ({skippedBookmarks.length})</span>
          </button>
        )}

        {viewMode === "all" && !isRightSidebarOpen && (
          <button
            onClick={() => setIsRightSidebarOpen(true)}
            className="hidden xl:flex fixed right-3 top-20 z-30 items-center gap-2 px-3 py-2 bg-white hover:bg-emerald-50 border-2 border-black rounded-xl shadow-[3px_3px_0px_#000] text-xs font-black text-black hover:-translate-x-1 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all group cursor-pointer"
            title="Open Saved Collection Sidebar"
          >
            <span>Open Saved ({savedBookmarks.length})</span>
            <PanelRight className="w-4 h-4 text-[#34d399] group-hover:scale-110 transition-transform stroke-[2.5]" />
          </button>
        )}

        {viewMode === "tree" ? (
          <div className="w-full h-[calc(100vh-140px)] min-h-[580px]">
            <FolderTreeExplorer
              onClose={() => setViewMode("all")}
              onBookmarkUpdated={() => {
                fetchFolders();
                fetchSavedBookmarks();
                fetchSkippedBookmarks();
                fetchStats();
              }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: SKIPPED & TRASH */}
            <SkippedSidebar
              isOpen={isLeftSidebarOpen}
              viewMode={viewMode}
              skippedBookmarks={skippedBookmarks}
              isLoading={isSkippedLoading}
              onClose={() => setIsLeftSidebarOpen(false)}
              onRestoreSkippedItem={handleRestoreSkippedItem}
              onRestoreAllSkipped={handleRestoreAllSkipped}
              onPermanentDelete={(item) => setUnbookmarkTarget(item)}
            />

            {/* CENTER COLUMN: TINDER SWIPE REVIEW DECK */}
            <ReviewDeck
              currentBookmark={currentBookmark}
              isCardLoading={isCardLoading}
              isExiting={isExiting}
              stats={stats}
              historyStackLength={historyStack.length}
              isUndoing={isUndoing}
              isSeeding={isSeeding}
              centerSpanClass={getCenterSpanClass()}
              viewMode={viewMode}
              onSwipe={handleSwipe}
              onUndo={handleUndo}
              onUnbookmark={(b) => setUnbookmarkTarget(b)}
              onRenameBookmark={handleRenameBookmark}
              onRestoreAllSkipped={handleRestoreAllSkipped}
              onSeedDemo={async () => {
                setIsSeeding(true);
                await fetch("/api/bookmarks/seed", { method: "POST" });
                await fetchStats();
                await fetchFolders();
                await fetchNextBookmark();
                await fetchSavedBookmarks();
                await fetchSkippedBookmarks();
                setIsSeeding(false);
                showToast("Sample bookmarks loaded", "success");
              }}
              onSwitchToSaved={() => setViewMode("saved")}
            />

            {/* RIGHT COLUMN: SAVED BOOKMARKS */}
            <SavedSidebar
              isOpen={isRightSidebarOpen}
              viewMode={viewMode}
              savedBookmarks={savedBookmarks}
              isLoading={isSavedLoading}
              onClose={() => setIsRightSidebarOpen(false)}
              onToggleSavedItem={handleToggleSavedItem}
              onExport={exportBookmarks}
            />
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        viewMode={viewMode}
        onSelectViewMode={setViewMode}
        skippedCount={skippedBookmarks.length}
        savedCount={savedBookmarks.length}
      />

   

      {/* Quick Bookmark Modal (Shift + B) */}
      <QuickBookmarkModal
        isOpen={isQuickBookmarkOpen}
        onClose={() => setIsQuickBookmarkOpen(false)}
        availableFolders={foldersList.map((f) => f.fullPath)}
        onBookmarkCreated={async (newB) => {
          showToast(`Saved bookmark "${newB.title || "Bookmark"}"!`, "success");
          await fetchStats();
          await fetchFolders();
          await fetchSavedBookmarks();
          if (!currentBookmark) {
            fetchNextBookmark();
          }
        }}
      />

      {/* Extension Setup Modal */}
      <ExtensionModal
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
        onSeedDemo={async () => {
          setIsSeeding(true);
          await fetch("/api/bookmarks/seed", { method: "POST" });
          await fetchStats();
          await fetchFolders();
          await fetchNextBookmark();
          await fetchSavedBookmarks();
          await fetchSkippedBookmarks();
          setIsSeeding(false);
          setIsExtensionModalOpen(false);
          showToast("Sample bookmarks loaded", "success");
        }}
        isSeeding={isSeeding}
      />

      {/* Unbookmark Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!unbookmarkTarget}
        title="Permanently Unbookmark?"
        message={`Are you sure you want to unbookmark "${unbookmarkTarget?.title}"? This permanently removes it from your browser bookmarks and Swipe Mark.`}
        confirmLabel="Unbookmark"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isUnbookmarking}
        onConfirm={confirmUnbookmark}
        onCancel={() => setUnbookmarkTarget(null)}
      />

      {/* Destructive Database Wipe Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isWipeDbModalOpen}
        title="Permanently Wipe Complete Database?"
        message="Are you sure you want to permanently delete ALL bookmarks and folders from the database? This is a destructive operation that completely wipes MongoDB and cannot be undone."
        confirmLabel="Yes, Wipe Complete DB"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isWipingDb}
        onConfirm={handleWipeDatabase}
        onCancel={() => setIsWipeDbModalOpen(false)}
      />

      {/* Help & Extension Info Modal (Triggered by the (i) button) */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-black w-full max-w-lg rounded-3xl border-[3px] border-black shadow-[10px_10px_0px_#000] overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#fde047] border-b-[3px] border-black p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black text-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                  <Info className="w-5 h-5 text-[#fde047] stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base sm:text-lg tracking-tight uppercase">
                      Quick Guide & Shortcuts
                    </h3>
                    <span className="bg-white text-black border border-black text-[10px] font-black px-2 py-0.5 rounded-full shadow-[1px_1px_0px_#000]">
                      HELP
                    </span>
                  </div>
                  <p className="text-xs font-bold text-black/70">
                    Keyboard controls and extension setup
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="w-9 h-9 rounded-xl border-2 border-black bg-[#fb7185] hover:bg-[#f43f5e] text-black shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center font-black transition-all"
                title="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[62vh] bg-zinc-50/50">
              {/* Keyboard Shortcuts Section */}
              <div className="space-y-2.5">
                <div className="text-xs font-black uppercase tracking-wider text-zinc-700 flex items-center gap-2">
                  <span>⌨️</span>
                  <span>Keyboard Shortcuts</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-3 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-800">
                      Skip Bookmark
                    </span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-0.5 bg-rose-100 border border-black rounded font-mono font-black text-xs">
                        ←
                      </kbd>
                      <span className="text-[10px] text-zinc-400">or</span>
                      <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-black rounded font-mono font-bold text-xs">
                        A
                      </kbd>
                    </div>
                  </div>

                  <div className="p-3 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-800">
                      Keep / Save
                    </span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-0.5 bg-emerald-100 border border-black rounded font-mono font-black text-xs">
                        →
                      </kbd>
                      <span className="text-[10px] text-zinc-400">or</span>
                      <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-black rounded font-mono font-bold text-xs">
                        D
                      </kbd>
                    </div>
                  </div>

                  <div className="p-3 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-800">
                      Open in New Tab
                    </span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-0.5 bg-sky-100 border border-black rounded font-mono font-black text-xs">
                        Space
                      </kbd>
                      <span className="text-[10px] text-zinc-400">or</span>
                      <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-black rounded font-mono font-bold text-xs">
                        O
                      </kbd>
                    </div>
                  </div>

                  <div className="p-3 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-800">
                      Undo Decision
                    </span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-0.5 bg-purple-100 border border-black rounded font-mono font-black text-xs">
                        Z
                      </kbd>
                      <span className="text-[10px] text-zinc-400">or</span>
                      <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-black rounded font-mono font-bold text-xs">
                        U
                      </kbd>
                    </div>
                  </div>

                  <div className="p-3 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] flex items-center justify-between sm:col-span-2">
                    <span className="text-xs font-bold text-zinc-800">
                      Quick Add Active Tab URL
                    </span>
                    <kbd className="px-2.5 py-0.5 bg-[#fde047] border border-black rounded font-mono font-black text-xs">
                      ⇧ + B (Shift+B)
                    </kbd>
                  </div>
                </div>
              </div>

              {/* How to Use Extension Section */}
              <div className="space-y-2.5 pt-2 border-t-2 border-black/10">
                <div className="text-xs font-black uppercase tracking-wider text-zinc-700 flex items-center gap-2">
                  <span>🧩</span>
                  <span>How to Use the Browser Extension</span>
                </div>

                <div className="p-4 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_#000] space-y-3">
                  <div className="flex items-start gap-2.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="text-zinc-800 font-semibold leading-relaxed">
                      Open{" "}
                      <code className="bg-zinc-100 border border-zinc-300 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold">
                        chrome://extensions
                      </code>{" "}
                      (or Brave/Edge) and turn on{" "}
                      <strong>Developer Mode</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="text-zinc-800 font-semibold leading-relaxed">
                      Click <strong>"Load unpacked"</strong> and select your
                      project's{" "}
                      <code className="bg-zinc-100 border border-zinc-300 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold">
                        extension/
                      </code>{" "}
                      folder.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="text-zinc-800 font-semibold leading-relaxed">
                      Press{" "}
                      <kbd className="px-1.5 py-0.5 bg-yellow-200 border border-black rounded text-[10px] font-mono font-black">
                        Ctrl+Shift+B
                      </kbd>{" "}
                      on any webpage to save directly into your chosen or
                      default folder!
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                      4
                    </span>
                    <div className="text-zinc-800 font-semibold leading-relaxed">
                      Open any new tab in Chrome to enjoy your clean{" "}
                      <strong>Focus Timer Clock</strong> with custom themes.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-zinc-100 border-t-[3px] border-black flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setIsInfoModalOpen(false);
                  setIsExtensionModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl border-2 border-black bg-white hover:bg-zinc-200 text-black shadow-[2px_2px_0px_#000] font-black text-xs transition"
              >
                Scan / Import Bookmarks ↗
              </button>
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="px-6 py-2 rounded-xl border-2 border-black bg-[#34d399] hover:bg-emerald-400 text-black shadow-[3px_3px_0px_#000] font-black text-xs active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 border-2 border-black shadow-[3px_3px_0px_#000] animate-in slide-in-from-bottom-2 duration-150 ${
              toast.type === "error"
                ? "bg-[#fb7185] text-black"
                : toast.type === "info"
                  ? "bg-[#fde047] text-black"
                  : "bg-[#34d399] text-black"
            }`}
          >
            {toast.type === "success" && (
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            )}
            {toast.type === "error" && (
              <AlertCircle className="w-4 h-4 stroke-[2.5]" />
            )}
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
