'use client';

import React from 'react';
import { Bookmark, CheckCircle2, XCircle, Clock, BarChart2, Shield, Flame, Compass, Globe, Laptop } from 'lucide-react';

export interface BrowserCount {
  browser: string;
  count: number;
}

export interface StatsData {
  total: number;
  unreviewed: number;
  saved: number;
  skipped: number;
  reviewed: number;
  progress: number;
  browsers?: BrowserCount[];
}

interface StatsBarProps {
  stats: StatsData;
  isLoading?: boolean;
}

const renderBrowserIcon = (browser: string) => {
  switch (browser) {
    case 'Brave':
      return <Shield className="w-3.5 h-3.5 text-amber-700" />;
    case 'Firefox':
      return <Flame className="w-3.5 h-3.5 text-orange-600" />;
    case 'Safari':
      return <Compass className="w-3.5 h-3.5 text-sky-600" />;
    case 'Edge':
    case 'Chrome':
      return <Globe className="w-3.5 h-3.5 text-indigo-700" />;
    default:
      return <Laptop className="w-3.5 h-3.5 text-zinc-700" />;
  }
};

export default function StatsBar({ stats, isLoading }: StatsBarProps) {
  return (
    <div className="w-full bg-white border-2 border-black rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0px_#09090b]">
      <div className="flex flex-col gap-4">
        {/* Top row: Metrics cards in Neobrutalism */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total */}
          <div className="bg-white border-2 border-black rounded-xl p-3 flex items-center gap-3 shadow-[2px_2px_0px_#09090b]">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-black text-black flex items-center justify-center shrink-0">
              <Bookmark className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Total</p>
              <p className="text-xl font-black text-black tracking-tight">
                {isLoading ? '-' : stats.total}
              </p>
            </div>
          </div>

          {/* Remaining (Neo-yellow) */}
          <div className="bg-[#fde047] border-2 border-black rounded-xl p-3 flex items-center gap-3 shadow-[2px_2px_0px_#09090b]">
            <div className="w-9 h-9 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-black">To Review</p>
              <p className="text-xl font-black text-black tracking-tight">
                {isLoading ? '-' : stats.unreviewed}
              </p>
            </div>
          </div>

          {/* Saved / Kept (Neo-emerald) */}
          <div className="bg-[#34d399] border-2 border-black rounded-xl p-3 flex items-center gap-3 shadow-[2px_2px_0px_#09090b]">
            <div className="w-9 h-9 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-black">Saved</p>
              <p className="text-xl font-black text-black tracking-tight">
                {isLoading ? '-' : stats.saved}
              </p>
            </div>
          </div>

          {/* Skipped (Neo-coral) */}
          <div className="bg-[#fb7185] border-2 border-black rounded-xl p-3 flex items-center gap-3 shadow-[2px_2px_0px_#09090b]">
            <div className="w-9 h-9 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
              <XCircle className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-black">Skipped</p>
              <p className="text-xl font-black text-black tracking-tight">
                {isLoading ? '-' : stats.skipped}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom row: Review Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-bold text-black">
            <span className="flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" />
              Triage Progress
            </span>
            <span className="tabular-nums font-black text-black">
              {stats.reviewed} / {stats.total} ({stats.progress}%)
            </span>
          </div>

          <div className="w-full h-3 bg-zinc-100 border-2 border-black rounded-lg overflow-hidden flex shadow-[2px_2px_0px_#09090b]">
            {stats.total > 0 && (
              <>
                <div
                  className="bg-[#34d399] h-full transition-all duration-300 border-r border-black"
                  style={{ width: `${(stats.saved / stats.total) * 100}%` }}
                  title={`Saved: ${stats.saved}`}
                />
                <div
                  className="bg-[#fb7185] h-full transition-all duration-300"
                  style={{ width: `${(stats.skipped / stats.total) * 100}%` }}
                  title={`Skipped: ${stats.skipped}`}
                />
              </>
            )}
          </div>
        </div>

        {/* Browser breakdown chips without emojis */}
        {stats.browsers && stats.browsers.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t-2 border-black flex-wrap">
            <span className="text-[10px] font-black text-black uppercase tracking-wider">
              Tracked:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {stats.browsers.map((b) => (
                <span
                  key={b.browser}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 border-2 border-black text-[11px] font-bold text-black shadow-[2px_2px_0px_#09090b]"
                >
                  {renderBrowserIcon(b.browser)}
                  <span>{b.browser}</span>
                  <span className="font-black text-white bg-black px-1.5 py-0.2 rounded text-[10px]">
                    {b.count}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
