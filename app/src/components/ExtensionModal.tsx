'use client';

import React from 'react';
import { X, Puzzle, Download, CheckCircle, ExternalLink, Zap } from 'lucide-react';

interface ExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSeedDemo: () => Promise<void>;
  isSeeding?: boolean;
}

export default function ExtensionModal({
  isOpen,
  onClose,
  onSeedDemo,
  isSeeding,
}: ExtensionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl border-2 border-black shadow-[6px_6px_0px_#09090b] p-6 sm:p-7 space-y-6 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#fde047] border-2 border-black text-black flex items-center justify-center shadow-[2px_2px_0px_#09090b]">
              <Puzzle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-black">Browser Extension & Setup</h3>
              <p className="text-xs text-zinc-600 font-semibold">Chrome, Brave, Edge, Firefox, and Opera</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg border-2 border-transparent hover:border-black hover:bg-zinc-100 text-black transition-colors"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-4 text-xs sm:text-sm text-zinc-900">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-lg bg-black text-white font-black flex items-center justify-center shrink-0 text-xs border border-black shadow-[1px_1px_0px_#09090b]">
              1
            </div>
            <div>
              <p className="font-bold text-black">Open Extension Manager</p>
              <p className="text-zinc-600 text-xs mt-0.5 font-medium">
                In Chrome, Brave, or Edge, navigate to{' '}
                <code className="px-1.5 py-0.5 bg-zinc-100 border border-black rounded text-black font-mono font-bold">
                  chrome://extensions
                </code>{' '}
                or{' '}
                <code className="px-1.5 py-0.5 bg-zinc-100 border border-black rounded text-black font-mono font-bold">
                  brave://extensions
                </code>
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-lg bg-black text-white font-black flex items-center justify-center shrink-0 text-xs border border-black shadow-[1px_1px_0px_#09090b]">
              2
            </div>
            <div>
              <p className="font-bold text-black">Enable Developer Mode & Load Unpacked</p>
              <p className="text-zinc-600 text-xs mt-0.5 font-medium">
                Toggle <strong>Developer mode</strong> on, click <strong>Load unpacked</strong>, and select the{' '}
                <code className="px-1.5 py-0.5 bg-zinc-100 border border-black rounded text-black font-mono font-bold">
                  extension
                </code>{' '}
                folder in this repository.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-lg bg-black text-white font-black flex items-center justify-center shrink-0 text-xs border border-black shadow-[1px_1px_0px_#09090b]">
              3
            </div>
            <div>
              <p className="font-bold text-black">Scan & Multi-Browser Tracking</p>
              <p className="text-zinc-600 text-xs mt-0.5 font-medium">
                Click the extension icon. It automatically detects whether you are on <strong>Chrome, Brave, Edge, or Firefox</strong> and syncs bookmark mutations in real time.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-lg bg-[#fde047] text-black font-black flex items-center justify-center shrink-0 text-xs border-2 border-black shadow-[1px_1px_0px_#09090b]">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-bold text-black">Instant Bookmark Shortcut</p>
              <p className="text-zinc-600 text-xs mt-0.5 font-medium">
                Press <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-black rounded font-mono font-bold text-black">Ctrl+Shift+B</kbd> (or <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-black rounded font-mono font-bold text-black">Cmd+Shift+B</kbd>) on any tab to immediately bookmark into Swipe Mark! Or press <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-black rounded font-mono font-bold text-black">Shift + B</kbd> on this dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Alternative: Seed Demo Bookmarks */}
        <div className="p-4 rounded-xl bg-[#fde047] border-2 border-black shadow-[3px_3px_0px_#09090b] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-black">
              <Zap className="w-4 h-4 text-black" />
              <span>Want to try it right away?</span>
            </div>
            <button
              onClick={onSeedDemo}
              disabled={isSeeding}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-zinc-800 border-2 border-black shadow-[2px_2px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isSeeding ? 'Loading...' : 'Load Sample Bookmarks'}
            </button>
          </div>
          <p className="text-[11px] text-black font-semibold">
            Instantly loads sample bookmarks into your MongoDB database to test swiping right now.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t-2 border-black">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 text-xs font-bold text-black border-2 border-black shadow-[2px_2px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            Got it, close
          </button>
        </div>
      </div>
    </div>
  );
}
