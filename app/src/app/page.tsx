'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  BookmarkPlus,
  Check,
  X,
  RotateCcw,
  ExternalLink,
  Puzzle,
  ArrowRight,
  Zap,
  Globe,
  SlidersHorizontal,
  RefreshCw,
  Columns,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import SwipeCard, { BookmarkItem } from '@/components/SwipeCard';
import ExtensionModal from '@/components/ExtensionModal';
import QuickBookmarkModal from '@/components/QuickBookmarkModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { pingExtension, chromeUnbookmark } from '@/lib/extensionSync';

interface HistoryAction {
  bookmark: BookmarkItem;
  previousStatus: 'unreviewed';
  newStatus: 'saved' | 'skipped';
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

const FALLBACK_DEMO_BOOKMARK: BookmarkItem = {
  id: 'demo_1',
  title: 'Tailwind CSS v4 - Next-Generation Engine',
  url: 'https://tailwindcss.com/blog/tailwindcss-v4',
  folder: 'Design Resources',
  browser: 'Chrome',
  status: 'unreviewed',
  dateAdded: "2026-10-26T00:00:00.000Z",
};

export default function LandingPage() {
  const [currentBookmark, setCurrentBookmark] = useState<BookmarkItem | null>(null);
  const [isCardLoading, setIsCardLoading] = useState(true);
  const [isExiting, setIsExiting] = useState<'saved' | 'skipped' | null>(null);
  const [historyStack, setHistoryStack] = useState<HistoryAction[]>([]);
  const [isUndoing, setIsUndoing] = useState(false);

  // Quick stats
  const [stats, setStats] = useState({
    total: 0,
    unreviewed: 0,
    saved: 0,
    skipped: 0,
  });

  // Extension status
  const [isExtensionConnected, setIsExtensionConnected] = useState(false);

  // Modals
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [isQuickBookmarkOpen, setIsQuickBookmarkOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [unbookmarkTarget, setUnbookmarkTarget] = useState<BookmarkItem | null>(null);
  const [isUnbookmarking, setIsUnbookmarking] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const isSwipingRef = useRef(false);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const checkExtensionPresence = useCallback(async () => {
    const connected = await pingExtension(800);
    setIsExtensionConnected(connected);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/bookmarks/stats');
      if (res.ok) {
        const data = await res.json();
        setStats({
          total: data.total || 0,
          unreviewed: data.unreviewed || 0,
          saved: data.saved || 0,
          skipped: data.skipped || 0,
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchNextBookmark = useCallback(async () => {
    setIsCardLoading(true);
    try {
      const res = await fetch('/api/bookmarks/next');
      if (res.ok) {
        const data = await res.json();
        if (data.bookmark) {
          setCurrentBookmark(data.bookmark);
          return;
        }
      }
      // If no bookmark in database or all reviewed, show fallback demo card
      setCurrentBookmark(FALLBACK_DEMO_BOOKMARK);
    } catch {
      setCurrentBookmark(FALLBACK_DEMO_BOOKMARK);
    } finally {
      setIsCardLoading(false);
      setIsExiting(null);
      isSwipingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchNextBookmark();
    checkExtensionPresence();
    const interval = setInterval(checkExtensionPresence, 5000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchNextBookmark, checkExtensionPresence]);

  const handleSwipe = useCallback(
    async (direction: 'saved' | 'skipped') => {
      if (!currentBookmark || isSwipingRef.current) return;
      isSwipingRef.current = true;
      setIsExiting(direction);

      const swipedBookmark = currentBookmark;
      setHistoryStack((prev) => [
        ...prev,
        { bookmark: swipedBookmark, previousStatus: 'unreviewed', newStatus: direction },
      ]);

      // Update in database if it is not demo
      if (!swipedBookmark.id.startsWith('demo_')) {
        try {
          await fetch(`/api/bookmarks/${swipedBookmark.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: direction }),
          });
          fetchStats();
        } catch {
          // ignore
        }
      }

      showToast(
        direction === 'saved' ? 'Saved to collection!' : 'Skipped bookmark',
        direction === 'saved' ? 'success' : 'info'
      );

      setTimeout(() => {
        fetchNextBookmark();
      }, 260);
    },
    [currentBookmark, fetchNextBookmark, fetchStats, showToast]
  );

  const handleUndo = useCallback(async () => {
    if (historyStack.length === 0 || isUndoing) return;
    setIsUndoing(true);
    const last = historyStack[historyStack.length - 1];

    if (!last.bookmark.id.startsWith('demo_')) {
      try {
        await fetch(`/api/bookmarks/${last.bookmark.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'unreviewed' }),
        });
        fetchStats();
      } catch {
        // ignore
      }
    }

    setHistoryStack((prev) => prev.slice(0, prev.length - 1));
    setCurrentBookmark(last.bookmark);
    setIsExiting(null);
    showToast('Swipe undone', 'info');
    setIsUndoing(false);
  }, [historyStack, isUndoing, fetchStats, showToast]);

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/bookmarks/seed', { method: 'POST' });
      if (res.ok) {
        setIsExtensionModalOpen(false);
        await fetchStats();
        await fetchNextBookmark();
        showToast('Sample bookmarks loaded!', 'success');
      }
    } catch {
      showToast('Error seeding demo', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  const confirmUnbookmark = async () => {
    if (!unbookmarkTarget) return;
    setIsUnbookmarking(true);
    try {
      if (unbookmarkTarget.chromeId) {
        await chromeUnbookmark(unbookmarkTarget.chromeId);
      }
      if (!unbookmarkTarget.id.startsWith('demo_')) {
        await fetch(`/api/bookmarks/${unbookmarkTarget.id}`, { method: 'DELETE' });
      }
      showToast(`Unbookmarked "${unbookmarkTarget.title}"`, 'success');
      setUnbookmarkTarget(null);
      await fetchStats();
      fetchNextBookmark();
    } catch {
      showToast('Error unbookmarking', 'error');
    } finally {
      setIsUnbookmarking(false);
    }
  };

  // Keyboard navigation & Shift + B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (['input', 'textarea', 'select'].includes(activeTag)) return;

      if (e.shiftKey && (e.key === 'B' || e.key.toLowerCase() === 'b')) {
        e.preventDefault();
        setIsQuickBookmarkOpen(true);
        return;
      }

      if (currentBookmark && !isExiting) {
        if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
          e.preventDefault();
          handleSwipe('saved');
        } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
          e.preventDefault();
          handleSwipe('skipped');
        } else if (e.key === ' ' || e.key.toLowerCase() === 'o') {
          e.preventDefault();
          window.open(currentBookmark.url, '_blank');
        } else if (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'u') {
          e.preventDefault();
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentBookmark, isExiting, handleSwipe, handleUndo]);

  return (
    <div className="min-h-screen bg-[#fbf9f5] flex flex-col justify-between selection:bg-black selection:text-white w-full max-w-full overflow-x-hidden">
      {/* ngl.link Inspired Clean Minimal Header */}
      <header className="sticky top-0 z-30 w-full bg-[#fbf9f5]/90 backdrop-blur-md border-b-2 border-black px-4 sm:px-6">
        <div className="max-w-4xl mx-auto h-16 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#09090b] group-hover:bg-[#fde047] group-hover:text-black transition-colors">
              <Bookmark className="w-5 h-5 fill-current stroke-current" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-black tracking-tight leading-none">
                Swipe Mark
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#fde047] text-black border border-black shadow-[1px_1px_0px_#09090b]">
                FAST
              </span>
            </div>
          </Link>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsQuickBookmarkOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-100 text-black text-xs font-bold border-2 border-black shadow-[2px_2px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              title="Quick Bookmark (Shift + B)"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add</span>
              <kbd className="hidden sm:inline text-[9px] px-1 py-0.2 rounded bg-zinc-100 text-black border border-black font-mono">
                ⇧B
              </kbd>
            </button>

            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-black border-2 border-black shadow-[2px_2px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              <Columns className="w-3.5 h-3.5 text-[#fde047]" />
              <span>Studio</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content: Clean, Crystal, Visual-First Centerpiece (ngl.link style) */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 sm:py-10 flex flex-col items-center justify-center space-y-6 sm:space-y-8">
        {/* Punchy Title Section */}
        <div className="text-center space-y-2 max-w-md">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#09090b] text-[11px] font-black uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 fill-black" />
            <span>Tinder for your bookmarks</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tight leading-tight">
            Swipe Mark
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 font-semibold leading-relaxed">
            Clean 100s of dusty browser bookmarks in seconds. Swipe right to keep, left to skip.
          </p>
        </div>

        {/* Central Interactive Swiper Widget (ngl.link Card Centerpiece) */}
        <div className="w-full flex flex-col items-center space-y-5">
          {/* Active Card Container */}
          <div className="w-full flex justify-center min-h-[380px] sm:min-h-[400px] overflow-hidden max-w-full py-1">
            {isCardLoading ? (
              <div className="w-full max-w-md h-[380px] bg-white rounded-2xl border-2 border-black shadow-[5px_5px_0px_#09090b] flex flex-col items-center justify-center text-black gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
                <p className="text-xs font-bold">Loading card...</p>
              </div>
            ) : currentBookmark ? (
              <SwipeCard
                key={currentBookmark.id}
                bookmark={currentBookmark}
                onSwipe={handleSwipe}
                onUnbookmark={(b) => setUnbookmarkTarget(b)}
                onRename={async () => {}}
                isExiting={isExiting}
              />
            ) : (
              <div className="w-full max-w-md bg-white rounded-2xl border-2 border-black shadow-[5px_5px_0px_#09090b] p-8 text-center space-y-4 flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-xl bg-[#34d399] border-2 border-black text-black flex items-center justify-center shadow-[2px_2px_0px_#09090b]">
                  <Check className="w-7 h-7 stroke-[3]" />
                </div>
                <h3 className="text-lg font-black text-black">All Cleaned Up!</h3>
                <p className="text-xs text-zinc-600 font-semibold">
                  You reviewed your queue. Load demo bookmarks or connect your browser.
                </p>
                <button
                  onClick={handleSeedDemo}
                  disabled={isSeeding}
                  className="px-4 py-2.5 rounded-xl bg-black text-white text-xs font-bold border-2 border-black shadow-[2px_2px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  {isSeeding ? 'Loading...' : 'Load Sample Bookmarks'}
                </button>
              </div>
            )}
          </div>

          {/* Tactile Big Action Buttons (Thumb-friendly for mobile) */}
          {currentBookmark && (
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Skip (Pass) Button - Coral */}
              <button
                onClick={() => handleSwipe('skipped')}
                disabled={isCardLoading || !!isExiting}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-[#fb7185] hover:bg-rose-400 border-2 border-black text-black shadow-[4px_4px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center transition-all disabled:opacity-50"
                title="Skip bookmark (← or A)"
              >
                <X className="w-8 h-8 sm:w-9 sm:h-9 stroke-[3]" />
                <span className="sr-only">Skip</span>
              </button>

              {/* Undo Button */}
              <button
                onClick={handleUndo}
                disabled={historyStack.length === 0 || isUndoing}
                className="w-12 h-12 rounded-xl bg-white hover:bg-zinc-100 border-2 border-black text-black shadow-[2px_2px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none"
                title="Undo last swipe (Z)"
              >
                <RotateCcw className={`w-4 h-4 ${isUndoing ? 'animate-spin' : ''}`} />
                <span className="sr-only">Undo</span>
              </button>

              {/* Open Link Button */}
              <a
                href={currentBookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-xl bg-white hover:bg-zinc-100 border-2 border-black text-black shadow-[2px_2px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center transition-all"
                title="Open in new tab (Space)"
              >
                <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                <span className="sr-only">Open</span>
              </a>

              {/* Keep (Save) Button - Emerald */}
              <button
                onClick={() => handleSwipe('saved')}
                disabled={isCardLoading || !!isExiting}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-[#34d399] hover:bg-emerald-400 border-2 border-black text-black shadow-[4px_4px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center transition-all disabled:opacity-50"
                title="Save bookmark (→ or D)"
              >
                <Check className="w-8 h-8 sm:w-9 sm:h-9 stroke-[3]" />
                <span className="sr-only">Keep</span>
              </button>
            </div>
          )}

          {/* Minimal Keyboard Hint */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] font-black text-black bg-white px-4 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_#09090b]">
            <span>← Skip</span>
            <span>•</span>
            <span>→ Keep</span>
            <span>•</span>
            <span>Space Open</span>
            <span>•</span>
            <span>Z Undo</span>
          </div>
        </div>

        {/* ngl.link Big Punchy Pill Action CTA */}
        <div className="w-full max-w-md pt-2 flex flex-col items-center gap-3">
          <Link
            href="/app"
            className="w-full h-14 sm:h-16 rounded-2xl bg-black text-white hover:bg-zinc-800 text-sm sm:text-base font-black flex items-center justify-center gap-3 border-2 border-black shadow-[5px_5px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all group"
          >
            <Columns className="w-5 h-5 text-[#fde047] group-hover:rotate-12 transition-transform" />
            <span>Launch 3-Column Studio (/app)</span>
            <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Live sync / extension pill */}
          <button
            onClick={() => setIsExtensionModalOpen(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-50 text-black text-xs font-bold border-2 border-black shadow-[2px_2px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-between transition-all"
          >
            <span className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full border border-black ${
                  isExtensionConnected ? 'bg-[#34d399]' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span>
                {isExtensionConnected
                  ? 'Extension Active • Two-Way Sync Ready'
                  : 'Install Chrome & Brave Extension'}
              </span>
            </span>
            <span className="text-[10px] font-black uppercase text-zinc-500 underline">
              Setup Guide
            </span>
          </button>
        </div>

        {/* ngl.link 3-Step Visual Cards (Zero bloat, pure visual clarity) */}
        <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Step 1 */}
          <div className="bg-white border-2 border-black rounded-xl p-3.5 shadow-[3px_3px_0px_#09090b] flex sm:flex-col items-center sm:items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#38bdf8] border-2 border-black text-black flex items-center justify-center font-black text-xs shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-black leading-tight">1. Auto-Detect</p>
              <p className="text-[11px] text-zinc-600 font-medium mt-0.5">
                Chrome, Brave, Edge & Firefox.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white border-2 border-black rounded-xl p-3.5 shadow-[3px_3px_0px_#09090b] flex sm:flex-col items-center sm:items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#fde047] border-2 border-black text-black flex items-center justify-center font-black text-xs shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-black leading-tight">2. Swipe Fast</p>
              <p className="text-[11px] text-zinc-600 font-medium mt-0.5">
                Right to keep, Left to pass.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white border-2 border-black rounded-xl p-3.5 shadow-[3px_3px_0px_#09090b] flex sm:flex-col items-center sm:items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#34d399] border-2 border-black text-black flex items-center justify-center font-black text-xs shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-black leading-tight">3. Clean Sync</p>
              <p className="text-[11px] text-zinc-600 font-medium mt-0.5">
                Deletes & updates live in browser.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Clean Crystal Footer */}
      <footer className="w-full border-t-2 border-black bg-white py-4 px-4 text-center">
        <div className="max-w-md mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold text-black">
          <p>© Swipe Mark • Visual Bookmark Triage</p>
          <div className="flex items-center gap-3">
            <Link href="/app" className="underline hover:text-indigo-600">
              Studio
            </Link>
            <span>•</span>
            <button
              onClick={() => setIsExtensionModalOpen(true)}
              className="underline hover:text-indigo-600"
            >
              Extension
            </button>
            <span>•</span>
            <button
              onClick={handleSeedDemo}
              disabled={isSeeding}
              className="underline hover:text-indigo-600"
            >
              Sample Data
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <QuickBookmarkModal
        isOpen={isQuickBookmarkOpen}
        onClose={() => setIsQuickBookmarkOpen(false)}
        onBookmarkCreated={async () => {
          showToast('Saved to Swipe Mark!', 'success');
          await fetchStats();
          fetchNextBookmark();
        }}
      />

      <ExtensionModal
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
        onSeedDemo={handleSeedDemo}
        isSeeding={isSeeding}
      />

      <ConfirmDialog
        isOpen={!!unbookmarkTarget}
        title="Unbookmark this page?"
        message={`Are you sure you want to remove "${unbookmarkTarget?.title}" from your browser bookmarks?`}
        confirmLabel="Unbookmark"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isUnbookmarking}
        onConfirm={confirmUnbookmark}
        onCancel={() => setUnbookmarkTarget(null)}
      />

      {/* Floating Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-2.5 rounded-xl shadow-[4px_4px_0px_#09090b] text-xs font-black flex items-center gap-2 border-2 border-black text-black animate-in slide-in-from-bottom-2 duration-150 ${
              toast.type === 'error'
                ? 'bg-[#fb7185]'
                : toast.type === 'info'
                ? 'bg-[#fde047]'
                : 'bg-[#34d399]'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 stroke-[2.5]" />}
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
