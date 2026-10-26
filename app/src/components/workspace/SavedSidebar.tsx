"use client";

import React, { useState, useMemo } from "react";
import {
  Check,
  X,
  Search,
  Folder,
  ExternalLink,
  Download,
  Bookmark,
  MoreVertical,
} from "lucide-react";
import { BookmarkItem, getBrowserBadge } from "@/components/SwipeCard";
import { getCategoryEmoji } from "@/lib/smartFolderClassifier";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SavedSidebarProps {
  isOpen: boolean;
  viewMode: "all" | "deck" | "skipped" | "saved" | "tree";
  savedBookmarks: BookmarkItem[];
  isLoading: boolean;
  onClose: () => void;
  onToggleSavedItem: (item: BookmarkItem) => void;
  onExport: (format: "html" | "json") => void;
}

export default function SavedSidebar({
  isOpen,
  viewMode,
  savedBookmarks,
  isLoading,
  onClose,
  onToggleSavedItem,
  onExport,
}: SavedSidebarProps) {
  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState("all");
  const [browserFilter, setBrowserFilter] = useState("all");

  const filteredSaved = useMemo(() => {
    return savedBookmarks.filter((b) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search.trim() ||
        b.title?.toLowerCase().includes(q) ||
        b.url?.toLowerCase().includes(q) ||
        b.folder?.toLowerCase().includes(q);

      const matchesFolder =
        folderFilter === "all" ||
        (b.folder || "Bookmarks Bar") === folderFilter;

      const matchesBrowser =
        browserFilter === "all" ||
        (b.browser || "").toLowerCase() === browserFilter.toLowerCase();

      return matchesSearch && matchesFolder && matchesBrowser;
    });
  }, [savedBookmarks, search, folderFilter, browserFilter]);

  const uniqueFolders = useMemo(() => {
    return Array.from(
      new Set(savedBookmarks.map((b) => b.folder || "Bookmarks Bar"))
    );
  }, [savedBookmarks]);

  const isVisible =
    viewMode === "saved" || (viewMode === "all" && isOpen);

  return (
    <section
      className={`xl:col-span-3 bg-white rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] p-4 sm:p-5 space-y-4 flex flex-col h-[calc(100vh-130px)] sticky top-20 overflow-hidden ${
        isVisible ? "flex" : "hidden"
      }`}
    >
      {/* Right Header: Detto same layout as Left Sidebar */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-black">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#34d399] text-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center font-bold">
            <Check className="w-4 h-4 stroke-[3.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-black text-black uppercase tracking-wider">
                Saved (Kept)
              </h2>
              <span className="px-1.5 py-0.2 rounded-md bg-[#34d399] text-black font-black text-[10px] border border-black">
                {savedBookmarks.length}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-medium">
              Swiped right (Saved)
            </p>
          </div>
        </div>

        {/* 3-Dot Menu + Close Button */}
        <div className="flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="w-7 h-7 rounded-lg border-2 border-black bg-white hover:bg-zinc-100 text-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer outline-none"
              title="Export and more options"
              aria-label="Saved options"
            >
              <MoreVertical className="w-4 h-4 stroke-[2.5]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Export Collection</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => onExport("html")}
                disabled={savedBookmarks.length === 0}
                className="gap-2 cursor-pointer font-bold"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Export as HTML</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onExport("json")}
                disabled={savedBookmarks.length === 0}
                className="gap-2 cursor-pointer font-bold"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Export as JSON</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border-2 border-black bg-white hover:bg-emerald-100 text-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            title="Hide Saved Sidebar (✕)"
            aria-label="Hide Saved Sidebar"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${filteredSaved.length} saved...`}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border-2 border-black rounded-xl text-black font-medium placeholder-zinc-500 focus:outline-hidden focus:bg-white shadow-[2px_2px_0px_#000] transition-all"
          />
          <Search className="w-3.5 h-3.5 text-black absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
        </div>

        {/* Neobrutalist Folder and Browser Filter Selectors */}
        <div className="grid grid-cols-2 gap-1.5">
          <Select
            value={folderFilter}
            onValueChange={(val) => setFolderFilter(val || "all")}
          >
            <SelectTrigger size="sm" className="w-full text-[11px] h-8 bg-zinc-50 py-1">
              <SelectValue placeholder="All Folders">
                {folderFilter === "all"
                  ? "📁 All Folders"
                  : `${getCategoryEmoji(folderFilter)} ${folderFilter}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📁 All Folders</SelectItem>
              {uniqueFolders.map((folder) => (
                <SelectItem key={folder} value={folder}>
                  {getCategoryEmoji(folder)} {folder}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={browserFilter}
            onValueChange={(val) => setBrowserFilter(val || "all")}
          >
            <SelectTrigger size="sm" className="w-full text-[11px] h-8 bg-zinc-50 py-1">
              <SelectValue placeholder="All Browsers">
                {browserFilter === "all" ? "🌐 All Browsers" : browserFilter}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🌐 All Browsers</SelectItem>
              <SelectItem value="Chrome">Chrome</SelectItem>
              <SelectItem value="Brave">Brave</SelectItem>
              <SelectItem value="Firefox">Firefox</SelectItem>
              <SelectItem value="Edge">Edge</SelectItem>
              <SelectItem value="Opera">Opera</SelectItem>
              <SelectItem value="Safari">Safari</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
        {isLoading ? (
          <div className="py-12 text-center text-xs font-bold text-zinc-500">
            Loading saved...
          </div>
        ) : filteredSaved.length === 0 ? (
          <div className="py-16 text-center space-y-2 px-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 border-2 border-black text-black mx-auto flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <Bookmark className="w-5 h-5 fill-black" />
            </div>
            <p className="text-xs font-bold text-black">
              No saved bookmarks
            </p>
            <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
              Swipe cards right to keep your favorite bookmarks here.
            </p>
          </div>
        ) : (
          filteredSaved.map((item) => {
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
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
                    {item.folder && (
                      <span className="flex items-center gap-1 text-black font-semibold truncate max-w-[120px]">
                        <Folder className="w-2.5 h-2.5 shrink-0 stroke-[2.5]" />
                        <span className="truncate">{item.folder}</span>
                      </span>
                    )}
                    <span className="font-mono truncate">
                      {new URL(item.url).hostname.replace("www.", "")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-zinc-100 border-2 border-black shadow-[1px_1px_0px_#000] text-black hover:bg-yellow-200 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                    title="Open URL in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => onToggleSavedItem(item)}
                    className="p-1.5 rounded-lg bg-[#fb7185] border-2 border-black shadow-[1px_1px_0px_#000] text-black hover:bg-rose-500 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                    title="Move to Skipped"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
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
