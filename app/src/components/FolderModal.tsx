'use client';

import React, { useState, useEffect } from 'react';
import { Folder, FolderPlus, X, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, parentFolder?: string) => Promise<void>;
  initialTitle?: string;
  initialParent?: string;
  existingFolders: string[];
  mode?: 'create' | 'rename';
}

export default function FolderModal({
  isOpen,
  onClose,
  onSubmit,
  initialTitle = '',
  initialParent = '',
  existingFolders,
  mode = 'create',
}: FolderModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [parentFolder, setParentFolder] = useState(initialParent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(initialTitle);
    setParentFolder(initialParent);
    setError(null);
  }, [initialTitle, initialParent, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Folder name cannot be empty');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(title.trim(), parentFolder.trim());
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-2xl border-2 border-black shadow-[6px_6px_0px_#09090b] p-6 space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#fde047] border-2 border-black text-black flex items-center justify-center shadow-[2px_2px_0px_#09090b]">
              {mode === 'create' ? <FolderPlus className="w-5 h-5 stroke-[2.5]" /> : <Folder className="w-5 h-5 stroke-[2.5]" />}
            </div>
            <div>
              <h3 className="text-base font-black text-black">
                {mode === 'create' ? 'Create New Folder' : 'Rename Folder'}
              </h3>
              <p className="text-xs text-zinc-600 font-semibold">
                {mode === 'create'
                  ? 'Add folder to Chrome and Swipe Mark'
                  : 'Update folder name across Chrome and Swipe Mark'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg border-2 border-transparent hover:border-black hover:bg-zinc-100 text-black transition-colors"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-[#fb7185] border-2 border-black text-black text-xs font-bold shadow-[2px_2px_0px_#09090b]">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-black text-black uppercase tracking-wider">
              Folder Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design Resources, AI Tools..."
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-black bg-zinc-50 text-xs font-bold text-black shadow-[2px_2px_0px_#09090b] focus:outline-none focus:bg-white transition-all"
            />
          </div>

          {mode === 'create' && (
            <div className="space-y-1.5">
              <label className="text-xs font-black text-black uppercase tracking-wider">
                Parent Folder (Optional)
              </label>
              <Select
                value={parentFolder || '__root__'}
                onValueChange={(val) => setParentFolder(val === '__root__' ? '' : (val || ''))}
              >
                <SelectTrigger className="w-full px-3.5 py-2.5 rounded-xl border-2 border-black bg-white text-xs font-bold text-black shadow-[2px_2px_0px_#09090b]">
                  <SelectValue placeholder="Root / Bookmarks Bar">
                    {!parentFolder || parentFolder === '__root__'
                      ? '📁 Root / Bookmarks Bar'
                      : `📁 ${parentFolder}`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="__root__">📁 Root / Bookmarks Bar</SelectItem>
                  {existingFolders.map((f) => (
                    <SelectItem key={f} value={f}>
                      📁 {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t-2 border-black">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border-2 border-black bg-white hover:bg-zinc-100 text-xs font-bold text-black shadow-[2px_2px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-bold border-2 border-black shadow-[2px_2px_0px_#09090b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              )}
              {mode === 'create' ? 'Create Folder' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
