"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  RotateCcw,
  Trash2,
  Search,
  MoreVertical,
} from "lucide-react";
import { BookmarkItem, getBrowserBadge } from "@/components/SwipeCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SkippedSidebarProps {
  isOpen: boolean;
  viewMode: "all" | "deck" | "skipped" | "saved" | "tree";
  skippedBookmarks: BookmarkItem[];
  isLoading: boolean;
  onClose: () => void;
  onRestoreSkippedItem: (item: BookmarkItem) => void;
  onRestoreAllSkipped: () => void;
  onPermanentDelete: (item: BookmarkItem) => void;
}

export default function SkippedSidebar({
  isOpen,
  viewMode,
  skippedBookmarks,
  isLoading,
  onClose,
  onRestoreSkippedItem,
  onRestoreAllSkipped,
  onPermanentDelete,
}: SkippedSidebarProps) {
  const [search, setSearch] = useState("");

  const filteredSkipped = useMemo(() => {
    if (!search.trim()) return skippedBookmarks;
    const q = search.toLowerCase();
    return skippedBookmarks.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.url?.toLowerCase().includes(q) ||
        b.folder?.toLowerCase().includes(q)
    );
  }, [skippedBookmarks, search]);

  const isVisible =
    viewMode === "skipped" || (viewMode === "all" && isOpen);

  return (
    <section
      className={`xl:col-span-3 bg-white rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] p-4 sm:p-5 space-y-4 flex flex-col h-[calc(100vh-130px)] sticky top-20 overflow-hidden ${
        isVisible ? "flex" : "hidden"
      }`}
    >
      {/* Left Header: Detto same as Right Sidebar */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-black">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#fb7185] text-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center font-bold">
            <X className="w-4 h-4 stroke-[3]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-black text-black uppercase tracking-wider">
                Skipped & Trash
              </h2>
              <span className="px-1.5 py-0.2 rounded-md bg-[#fb7185] text-black font-black text-[10px] border border-black">
                {skippedBookmarks.length}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-medium">
              Swiped left (Unsaved)
            </p>
          </div>
        </div>

        {/* 3-Dot Menu + Close Button */}
        <div className="flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="w-7 h-7 rounded-lg border-2 border-black bg-white hover:bg-zinc-100 text-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer outline-none"
              title="Skipped actions"
              aria-label="Skipped options"
            >
              <MoreVertical className="w-4 h-4 stroke-[2.5]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Skipped Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={onRestoreAllSkipped}
                disabled={skippedBookmarks.length === 0}
                className="gap-2 cursor-pointer font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Restore All to Deck</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border-2 border-black bg-white hover:bg-rose-100 text-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            title="Hide Skipped Sidebar (✕)"
            aria-label="Hide Skipped Sidebar"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${filteredSkipped.length} skipped...`}
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border-2 border-black rounded-xl text-black font-medium placeholder-zinc-500 focus:outline-hidden focus:bg-white shadow-[2px_2px_0px_#000] transition-all"
        />
        <Search className="w-3.5 h-3.5 text-black absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
        {isLoading ? (
          <div className="py-12 text-center text-xs font-bold text-zinc-500">
            Loading skipped...
          </div>
        ) : filteredSkipped.length === 0 ? (
          <div className="py-16 text-center space-y-2 px-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 border-2 border-black text-black mx-auto flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <Trash2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-black">
              No skipped bookmarks
            </p>
            <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
              Swipe cards left to temporarily skip or trash them.
            </p>
          </div>
        ) : (
          filteredSkipped.map((item) => {
            const bBadge = getBrowserBadge(item.browser);
            const BrowserIcon = bBadge.Icon;
            return (
              <div
                key={item.id}
                className="group p-2.5 rounded-xl bg-white hover:bg-zinc-50 border-2 border-black shadow-[2px_2px_0px_#000] transition-all flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`p-0.5 rounded border border-black ${bBadge.color}`}
                      title={bBadge.label}
                    >
                      <BrowserIcon className="w-2.5 h-2.5" />
                    </span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-black hover:underline truncate block"
                      title={item.title}
                    >
                      {item.title}
                    </a>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono truncate">
                    {item.url}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onRestoreSkippedItem(item)}
                    className="p-1.5 rounded-lg bg-[#34d399] border-2 border-black shadow-[1px_1px_0px_#000] text-black hover:bg-[#10b981] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                    title="Restore back to swipe queue"
                  >
                    <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onPermanentDelete(item)}
                    className="p-1.5 rounded-lg bg-[#fb7185] border-2 border-black shadow-[1px_1px_0px_#000] text-black hover:bg-rose-500 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                    title="Permanently Unbookmark (Delete from Chrome & DB)"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
