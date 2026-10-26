"use client";

import React from "react";
import {
  Columns,
  X,
  Zap,
  Check,
  FolderTree,
} from "lucide-react";

interface MobileBottomNavProps {
  viewMode: "all" | "deck" | "skipped" | "saved" | "tree";
  onSelectViewMode: (mode: "all" | "deck" | "skipped" | "saved" | "tree") => void;
  skippedCount: number;
  savedCount: number;
}

export default function MobileBottomNav({
  viewMode,
  onSelectViewMode,
  skippedCount,
  savedCount,
}: MobileBottomNavProps) {
  const navItems = [
    {
      id: "all" as const,
      label: "All",
      icon: Columns,
      color: "bg-zinc-200",
    },
    {
      id: "skipped" as const,
      label: `Skip (${skippedCount})`,
      icon: X,
      badgeColor: "bg-[#fb7185]",
    },
    {
      id: "deck" as const,
      label: "Deck",
      icon: Zap,
      color: "bg-yellow-300",
    },
    {
      id: "saved" as const,
      label: `Saved (${savedCount})`,
      icon: Check,
      badgeColor: "bg-[#34d399]",
    },
    {
      id: "tree" as const,
      label: "Tree",
      icon: FolderTree,
      color: "bg-teal-200",
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-black p-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0px_-2px_0px_#000] flex items-center justify-around gap-1 overflow-x-auto"
    >
      {navItems.map((item) => {
        const isActive = viewMode === item.id;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            onClick={() => onSelectViewMode(item.id)}
            type="button"
            className={`flex-1 min-w-0 flex items-center justify-center gap-0.5 sm:gap-1 py-1.5 px-1 sm:px-2 rounded-xl text-[9px] xs:text-[10px] sm:text-xs font-black transition-all cursor-pointer whitespace-nowrap active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
              isActive
                ? "bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]"
                : "bg-zinc-100/80 hover:bg-zinc-200/80 text-black border-2 border-black/20"
            }`}
          >
            <Icon
              className={`w-3 h-3 shrink-0 stroke-[2.5] ${
                item.id === "skipped"
                  ? "text-rose-600"
                  : item.id === "saved"
                  ? "text-emerald-700"
                  : item.id === "deck"
                  ? "fill-[#fde047] stroke-black"
                  : "text-black"
              }`}
            />
            <span className="truncate tracking-tighter">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
