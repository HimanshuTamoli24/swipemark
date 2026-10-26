'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ExternalLink,
  Folder,
  Calendar,
  Globe,
  Check,
  X,
  Pencil,
  Trash2,
  CheckCircle2,
  Flame,
  Shield,
  Compass,
  Laptop,
} from 'lucide-react';
import { getCategoryEmoji } from '@/lib/smartFolderClassifier';

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  folder?: string;
  browser?: string;
  status?: string;
  favicon?: string;
  chromeId?: string;
  chromeParentId?: string;
  index?: number;
  dateAdded?: string;
}

interface SwipeCardProps {
  bookmark: BookmarkItem;
  onSwipe: (direction: 'saved' | 'skipped') => void;
  onUnbookmark?: (bookmark: BookmarkItem) => void;
  onRename?: (bookmark: BookmarkItem, newTitle: string) => Promise<void>;
  isExiting: 'saved' | 'skipped' | null;
}

const SWIPE_THRESHOLD = 80;

export const getBrowserBadge = (browser?: string) => {
  switch (browser) {
    case 'Brave':
      return { Icon: Shield, label: 'Brave', color: 'bg-amber-200 text-amber-950 border-black' };
    case 'Firefox':
      return { Icon: Flame, label: 'Firefox', color: 'bg-orange-200 text-orange-950 border-black' };
    case 'Edge':
      return { Icon: Compass, label: 'Edge', color: 'bg-cyan-200 text-cyan-950 border-black' };
    case 'Opera':
      return { Icon: Globe, label: 'Opera', color: 'bg-rose-200 text-rose-950 border-black' };
    case 'Safari':
      return { Icon: Compass, label: 'Safari', color: 'bg-indigo-200 text-indigo-950 border-black' };
    case 'Chrome':
    default:
      return { Icon: Globe, label: 'Chrome', color: 'bg-sky-200 text-sky-950 border-black' };
  }
};

export default function SwipeCard({
  bookmark,
  onSwipe,
  onUnbookmark,
  onRename,
  isExiting,
}: SwipeCardProps) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragStartTimeRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);

  // Inline rename state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(bookmark.title);
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  useEffect(() => {
    setEditedTitle(bookmark.title);
    setIsEditingTitle(false);
  }, [bookmark.id, bookmark.title]);

  // Extract domain
  let hostname = '';
  try {
    hostname = new URL(bookmark.url).hostname.replace(/^www\./, '');
  } catch {
    hostname = bookmark.url;
  }

  // Format date
  const formattedDate = bookmark.dateAdded
    ? new Date(bookmark.dateAdded).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.card-interactive-link')) return;
    if (isEditingTitle) return;

    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragStartTimeRef.current = performance.now();
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = (e.clientY - dragStartRef.current.y) * 0.25; // damped vertical drag
      setDragOffset({ x: dx, y: dy });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    // Momentum / velocity calculation per Emil Kowalski gesture physics
    const elapsed = Math.max(1, performance.now() - dragStartTimeRef.current);
    const velocity = Math.abs(dragOffset.x) / elapsed;

    if (dragOffset.x > SWIPE_THRESHOLD || (dragOffset.x > 30 && velocity > 0.45)) {
      onSwipe('saved');
    } else if (dragOffset.x < -SWIPE_THRESHOLD || (dragOffset.x < -30 && velocity > 0.45)) {
      onSwipe('skipped');
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  }, [isDragging, dragOffset.x, onSwipe]);

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.card-interactive-link')) return;
    if (isEditingTitle || e.touches.length !== 1) return;

    setIsDragging(true);
    dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    dragStartTimeRef.current = performance.now();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = (e.touches[0].clientY - dragStartRef.current.y) * 0.25;
    setDragOffset({ x: dx, y: dy });
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const elapsed = Math.max(1, performance.now() - dragStartTimeRef.current);
    const velocity = Math.abs(dragOffset.x) / elapsed;

    if (dragOffset.x > SWIPE_THRESHOLD || (dragOffset.x > 30 && velocity > 0.45)) {
      onSwipe('saved');
    } else if (dragOffset.x < -SWIPE_THRESHOLD || (dragOffset.x < -30 && velocity > 0.45)) {
      onSwipe('skipped');
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleSaveTitle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editedTitle.trim() || editedTitle.trim() === bookmark.title) {
      setIsEditingTitle(false);
      setEditedTitle(bookmark.title);
      return;
    }

    if (onRename) {
      setIsSavingTitle(true);
      await onRename(bookmark, editedTitle.trim());
      setIsSavingTitle(false);
    }
    setIsEditingTitle(false);
  };

  // Compute transform styles using custom ease-out curve
  let transform = '';
  let transition = isDragging
    ? 'none'
    : 'transform 220ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms cubic-bezier(0.23, 1, 0.32, 1)';
  let opacity = 1;

  if (isExiting === 'saved') {
    transform = 'translate3d(125%, 20px, 0) rotate(16deg)';
    opacity = 0;
    transition = 'transform 260ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms ease-out';
  } else if (isExiting === 'skipped') {
    transform = 'translate3d(-125%, 20px, 0) rotate(-16deg)';
    opacity = 0;
    transition = 'transform 260ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms ease-out';
  } else if (isDragging || dragOffset.x !== 0) {
    const rotation = dragOffset.x * 0.07;
    transform = `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${rotation}deg)`;
  }

  // Calculate badge opacity based on swipe offset
  const keepOpacity = Math.min(1, Math.max(0, dragOffset.x / SWIPE_THRESHOLD));
  const skipOpacity = Math.min(1, Math.max(0, -dragOffset.x / SWIPE_THRESHOLD));

  const browserBadge = getBrowserBadge(bookmark.browser);
  const BrowserIcon = browserBadge.Icon;

  return (
    <div
      ref={cardRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform,
        transition,
        opacity,
        touchAction: 'none',
      }}
      className={`relative w-full max-w-md select-none cursor-grab active:cursor-grabbing bg-white rounded-2xl border-2 border-black shadow-[5px_5px_0px_#09090b] p-6 flex flex-col justify-between min-h-[390px] overflow-hidden ${
        isDragging ? 'shadow-[8px_8px_0px_#09090b]' : ''
      }`}
    >
      {/* Neobrutalist KEEP Stamp */}
      <div
        style={{ opacity: isExiting === 'saved' ? 1 : keepOpacity }}
        className="pointer-events-none absolute top-6 left-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-black bg-[#34d399] text-black font-black text-xs tracking-wider uppercase shadow-[2px_2px_0px_#000] transform -rotate-12 transition-opacity"
      >
        <Check className="w-4 h-4 stroke-[3]" />
        KEEP
      </div>

      {/* Neobrutalist SKIP Stamp */}
      <div
        style={{ opacity: isExiting === 'skipped' ? 1 : skipOpacity }}
        className="pointer-events-none absolute top-6 right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-black bg-[#fb7185] text-black font-black text-xs tracking-wider uppercase shadow-[2px_2px_0px_#000] transform rotate-12 transition-opacity"
      >
        <X className="w-4 h-4 stroke-[3]" />
        SKIP
      </div>

      {/* Top Header Information */}
      <div className="space-y-4">
        {/* Badges: Domain, Browser, Folder */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Domain Pill */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-100 border-2 border-black shadow-[2px_2px_0px_#000]">
            <div className="w-4 h-4 rounded bg-white border border-black flex items-center justify-center shrink-0 overflow-hidden">
              {bookmark.favicon && !imageError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bookmark.favicon}
                  alt=""
                  className="w-3.5 h-3.5 object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <Globe className="w-3 h-3 text-black" />
              )}
            </div>
            <span className="text-xs font-mono font-bold text-black truncate max-w-[140px]">
              {hostname}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Browser Vector Badge */}
            <div
              className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] ${browserBadge.color}`}
              title={`Source: ${browserBadge.label}`}
            >
              <BrowserIcon className="w-3 h-3 stroke-[2.5]" />
              <span>{browserBadge.label}</span>
            </div>

            {/* Folder badge with category icon */}
            {bookmark.folder && (
              <div
                className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-black bg-[#fde047] px-2 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] truncate max-w-[140px]"
                title={`Folder: ${bookmark.folder}`}
              >
                <span className="text-xs leading-none">{getCategoryEmoji(bookmark.folder)}</span>
                <span className="truncate">{bookmark.folder}</span>
              </div>
            )}

            {/* Unbookmark action */}
            {onUnbookmark && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnbookmark(bookmark);
                }}
                className="card-interactive-link p-1.5 rounded-lg border-2 border-black bg-white hover:bg-rose-100 text-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                title="Unbookmark (Permanent delete)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Title / Inline Rename */}
        <div className="pt-2">
          {isEditingTitle ? (
            <form onSubmit={handleSaveTitle} className="card-interactive-link flex items-center gap-2">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                autoFocus
                disabled={isSavingTitle}
                className="flex-1 text-base font-bold text-black border-2 border-black rounded-lg px-3 py-1.5 focus:outline-hidden bg-yellow-50 shadow-[2px_2px_0px_#000]"
              />
              <button
                type="submit"
                disabled={isSavingTitle}
                className="p-2 rounded-lg bg-black text-white hover:bg-zinc-800 text-xs font-bold border-2 border-black shadow-[2px_2px_0px_#000]"
                title="Save title"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingTitle(false);
                  setEditedTitle(bookmark.title);
                }}
                className="p-2 rounded-lg text-black bg-white border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-zinc-100"
                title="Cancel"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-2 group/title">
              <h2 className="text-xl sm:text-2xl font-black text-black leading-snug tracking-tight line-clamp-3">
                {bookmark.title || hostname}
              </h2>
              {onRename && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }}
                  className="card-interactive-link p-1.5 rounded-lg border-2 border-transparent hover:border-black hover:bg-yellow-200 text-zinc-600 hover:text-black opacity-60 group-hover/title:opacity-100 transition-all shrink-0 mt-0.5"
                  title="Rename title"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* URL & Footer info */}
      <div className="pt-6 space-y-4">
        {/* URL Box with Open Button */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-100 border-2 border-black shadow-[2px_2px_0px_#000]">
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            <Globe className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <span className="text-xs font-mono font-medium text-black truncate" title={bookmark.url}>
              {bookmark.url}
            </span>
          </div>

          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="card-interactive-link shrink-0 inline-flex items-center justify-center p-1.5 rounded-lg bg-white border-2 border-black text-black hover:bg-yellow-200 transition-colors shadow-[1.5px_1.5px_0px_#000]"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Date & Sync info */}
        <div className="flex items-center justify-between text-[11px] text-zinc-600 font-semibold px-1">
          {formattedDate ? (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-zinc-600" />
              Added {formattedDate}
            </span>
          ) : (
            <span className="text-zinc-400">Drag or use arrow keys</span>
          )}

          {bookmark.chromeId ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-black bg-emerald-100 px-2 py-0.5 rounded-md font-bold border border-black">
              <CheckCircle2 className="w-3 h-3 text-emerald-800" /> Synced
            </span>
          ) : (
            <span className="text-zinc-500 font-mono text-[10px]">Ready to triage</span>
          )}
        </div>
      </div>
    </div>
  );
}
