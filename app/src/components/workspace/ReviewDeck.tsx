"use client";

import React from "react";
import {
  Zap,
  Bookmark,
  Check,
  X,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import SwipeCard, { BookmarkItem } from "@/components/SwipeCard";

interface ReviewDeckProps {
  currentBookmark: BookmarkItem | null;
  isCardLoading: boolean;
  isExiting: "saved" | "skipped" | null;
  stats: {
    total: number;
    unreviewed: number;
    saved: number;
    skipped: number;
    reviewed: number;
    progress: number;
  };
  historyStackLength: number;
  isUndoing: boolean;
  isSeeding: boolean;
  centerSpanClass: string;
  viewMode: "all" | "deck" | "skipped" | "saved" | "tree";
  onSwipe: (status: "saved" | "skipped") => void;
  onUndo: () => void;
  onUnbookmark: (bookmark: BookmarkItem) => void;
  onRenameBookmark: (bookmark: BookmarkItem, newTitle: string) => Promise<void>;
  onRestoreAllSkipped: () => void;
  onSeedDemo: () => void;
  onSwitchToSaved: () => void;
}

export default function ReviewDeck({
  currentBookmark,
  isCardLoading,
  isExiting,
  stats,
  historyStackLength,
  isUndoing,
  isSeeding,
  centerSpanClass,
  viewMode,
  onSwipe,
  onUndo,
  onUnbookmark,
  onRenameBookmark,
  onRestoreAllSkipped,
  onSeedDemo,
  onSwitchToSaved,
}: ReviewDeckProps) {
  const isVisible =
    viewMode === "all" || viewMode === "deck";

  return (
    <section
      className={`${centerSpanClass} w-full flex flex-col items-center justify-center space-y-5 transition-all duration-200 ${
        isVisible ? "flex" : "hidden xl:flex"
      }`}
    >
      {/* Progress status card */}
      <div className="w-full max-w-md bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_#000] space-y-2">
        <div className="flex items-center justify-between text-xs font-black text-black">
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            <Zap className="w-4 h-4 fill-[#fde047] stroke-black" />
            Review Progress
          </span>
          <span className="font-mono text-xs">
            {stats.reviewed} / {stats.total} ({stats.progress}%)
          </span>
        </div>
        <div className="w-full h-3.5 bg-zinc-100 border-2 border-black rounded-full overflow-hidden flex">
          <div
            className="bg-[#34d399] h-full transition-all duration-200 border-r border-black"
            style={{
              width: `${stats.total > 0 ? (stats.saved / stats.total) * 100 : 0}%`,
            }}
            title={`Saved: ${stats.saved}`}
          />
          <div
            className="bg-[#fb7185] h-full transition-all duration-200"
            style={{
              width: `${stats.total > 0 ? (stats.skipped / stats.total) * 100 : 0}%`,
            }}
            title={`Skipped: ${stats.skipped}`}
          />
        </div>
      </div>

      {/* Tinder Card Container */}
      <div className="w-full flex items-center justify-center min-h-[410px] overflow-hidden max-w-full py-1">
        {isCardLoading ? (
          <div className="w-full max-w-md h-[390px] bg-white rounded-2xl border-2 border-black shadow-[5px_5px_0px_#000] flex flex-col items-center justify-center text-black gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-black border-t-transparent animate-spin" />
            <p className="text-xs font-bold">
              Loading next bookmark...
            </p>
          </div>
        ) : currentBookmark ? (
          <SwipeCard
            key={currentBookmark.id}
            bookmark={currentBookmark}
            onSwipe={onSwipe}
            onUnbookmark={onUnbookmark}
            onRename={onRenameBookmark}
            isExiting={isExiting}
          />
        ) : stats.total > 0 && stats.unreviewed === 0 ? (
          /* Celebration card */
          <div className="w-full max-w-md bg-white rounded-2xl border-2 border-black shadow-[6px_6px_0px_#000] p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[#34d399] text-black border-2 border-black shadow-[3px_3px_0px_#000] mx-auto flex items-center justify-center font-bold">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-2xl font-black text-black tracking-tight">
                Queue Completed!
              </h3>
              <p className="text-xs text-zinc-600 font-medium max-w-xs mx-auto leading-relaxed">
                You reviewed all bookmarks. You kept {stats.saved} and skipped {stats.skipped}.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              {stats.skipped > 0 && (
                <button
                  onClick={onRestoreAllSkipped}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#fde047] text-black font-black text-xs border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-[#facc15] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 stroke-[2.5]" /> Revisit
                  Skipped Bookmarks ({stats.skipped})
                </button>
              )}
              <button
                onClick={onSwitchToSaved}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-black bg-white text-black font-black text-xs shadow-[3px_3px_0px_#000] hover:bg-zinc-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
              >
                Browse Saved ({stats.saved})
              </button>
            </div>
          </div>
        ) : (
          /* Zero bookmarks card */
          <div className="w-full max-w-md bg-white rounded-2xl border-2 border-black shadow-[6px_6px_0px_#000] p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-[#fde047] text-black border-2 border-black shadow-[3px_3px_0px_#000] mx-auto flex items-center justify-center">
              <Bookmark className="w-8 h-8 fill-black" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-black">
                No Bookmarks Loaded
              </h3>
              <p className="text-xs text-zinc-600 font-medium max-w-xs mx-auto">
                Import your bookmarks using the browser extension or load sample data.
              </p>
            </div>
            <button
              onClick={onSeedDemo}
              disabled={isSeeding}
              className="w-full py-2.5 px-4 rounded-xl bg-black text-white font-black text-xs border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-zinc-800 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-yellow-400 stroke-black" />
              {isSeeding ? "Loading Sample Data..." : "Load Sample Bookmarks"}
            </button>
          </div>
        )}
      </div>

      {/* Tactical Control Buttons with Neobrutalism Physical Push */}
      {currentBookmark && (
        <div className="flex items-center gap-5 pt-1">
          {/* Skip (Left) Button */}
          <button
            type="button"
            onClick={() => onSwipe("skipped")}
            disabled={isCardLoading || !!isExiting}
            className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#fb7185] border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-black hover:bg-rose-400 transition-all disabled:opacity-50 cursor-pointer"
            title="Skip bookmark (← or A)"
          >
            <X className="w-8 h-8 stroke-[3]" />
            <span className="sr-only">Skip</span>
          </button>

          {/* Undo Button */}
          <button
            type="button"
            onClick={onUndo}
            disabled={historyStackLength === 0 || isUndoing}
            className="flex items-center justify-center w-12 h-12 rounded-xl bg-white border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-black hover:bg-zinc-100 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Undo last swipe (Z)"
          >
            <RotateCcw
              className={`w-5 h-5 stroke-[2.5] ${isUndoing ? "animate-spin" : ""}`}
            />
            <span className="sr-only">Undo</span>
          </button>

          {/* Open link button */}
          <a
            href={currentBookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-12 h-12 rounded-xl bg-white border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-black hover:bg-yellow-200 transition-all cursor-pointer"
            title="Open URL in new tab (Space)"
          >
            <ExternalLink className="w-5 h-5 stroke-[2.5]" />
            <span className="sr-only">Open Link</span>
          </a>

          {/* Save (Right) Button */}
          <button
            type="button"
            onClick={() => onSwipe("saved")}
            disabled={isCardLoading || !!isExiting}
            className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#34d399] border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-black hover:bg-emerald-400 transition-all disabled:opacity-50 cursor-pointer"
            title="Save bookmark (→ or D)"
          >
            <Check className="w-8 h-8 stroke-[3.5]" />
            <span className="sr-only">Save</span>
          </button>
        </div>
      )}
    </section>
  );
}
