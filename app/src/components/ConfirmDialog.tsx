'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-2xl border-2 border-black shadow-[6px_6px_0px_#09090b] p-6 space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 border-black shadow-[2px_2px_0px_#09090b] ${
              isDestructive
                ? 'bg-[#fb7185] text-black'
                : 'bg-[#fde047] text-black'
            }`}
          >
            <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
          </div>

          <div className="space-y-1 pr-6 flex-1">
            <h3 className="text-base font-black text-black leading-snug">{title}</h3>
            <p className="text-xs text-zinc-600 font-semibold leading-relaxed">{message}</p>
          </div>

          <button
            onClick={onCancel}
            disabled={isLoading}
            className="absolute top-5 right-5 p-1 rounded-lg border-2 border-transparent hover:border-black hover:bg-zinc-100 text-black transition-colors"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl border-2 border-black bg-white hover:bg-zinc-100 text-xs font-bold text-black shadow-[2px_2px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-black border-2 border-black shadow-[2px_2px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 inline-flex items-center gap-1.5 ${
              isDestructive
                ? 'bg-[#fb7185] hover:bg-rose-400'
                : 'bg-black text-white hover:bg-zinc-800'
            }`}
          >
            {isLoading && (
              <span className="w-3 h-3 rounded-full border-2 border-black border-t-transparent animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
