import { NextRequest, NextResponse } from 'next/server';
import { AnyBulkWriteOperation } from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import Bookmark, { BookmarkStatus, IBookmark } from '@/models/Bookmark';
import Folder, { IFolder } from '@/models/Folder';
import { classifyByRules } from '@/lib/smartFolderClassifier';

interface IncomingBookmark {
  title?: string;
  url: string;
  folder?: string;
  browser?: string;
  chromeId?: string;
  chromeParentId?: string;
  index?: number;
  dateAdded?: string | number | Date;
}

interface IncomingFolder {
  title: string;
  fullPath: string;
  browser?: string;
  chromeId?: string;
  chromeParentId?: string;
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const bookmarks: IncomingBookmark[] = body.bookmarks || [];
    const folders: IncomingFolder[] = body.folders || [];
    const defaultBrowser = (body.browser || 'Chrome') as string;

    if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty bookmarks array' },
        { status: 400 }
      );
    }

    // 1. Process Folders
    if (Array.isArray(folders) && folders.length > 0) {
      const folderOps: AnyBulkWriteOperation<IFolder>[] = [];
      for (const f of folders) {
        if (!f.title || !f.fullPath) continue;
        const folderBrowser = f.browser || defaultBrowser;
        folderOps.push({
          updateOne: {
            filter: { fullPath: f.fullPath.trim(), browser: folderBrowser },
            update: {
              $set: {
                title: f.title.trim(),
                fullPath: f.fullPath.trim(),
                browser: folderBrowser,
                chromeId: f.chromeId ? String(f.chromeId) : '',
                chromeParentId: f.chromeParentId ? String(f.chromeParentId) : '',
              },
            },
            upsert: true,
          },
        });
      }
      if (folderOps.length > 0) {
        await Folder.bulkWrite(folderOps, { ordered: false });
      }
    }

    // 2. Process Bookmarks
    const validOperations: AnyBulkWriteOperation<IBookmark>[] = [];

    for (const b of bookmarks) {
      if (!b.url || typeof b.url !== 'string') continue;
      const trimmedUrl = b.url.trim();

      // Ensure valid URL
      try {
        const parsed = new URL(trimmedUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) continue;

        const title = b.title && b.title.trim().length > 0 ? b.title.trim() : parsed.hostname;
        const rawFolder = b.folder && b.folder.trim().length > 0 ? b.folder.trim() : '';
        const shouldAutoSort =
          body.autoCategorize !== false &&
          (!rawFolder || rawFolder === 'Bookmarks Bar' || rawFolder === 'Other Bookmarks');
        const folder = shouldAutoSort
          ? classifyByRules(title, trimmedUrl).folder
          : rawFolder || 'Bookmarks Bar';
        const browser = (b.browser || defaultBrowser || 'Chrome') as any;
        const dateAdded = b.dateAdded ? new Date(b.dateAdded) : new Date();
        const favicon = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`;
        const chromeId = b.chromeId ? String(b.chromeId) : '';
        const chromeParentId = b.chromeParentId ? String(b.chromeParentId) : '';
        const bookmarkIndex = typeof b.index === 'number' ? b.index : 0;

        validOperations.push({
          updateOne: {
            filter: { url: trimmedUrl, folder, browser },
            update: {
              $setOnInsert: {
                url: trimmedUrl,
                status: 'unreviewed' as BookmarkStatus,
                favicon,
                dateAdded: isNaN(dateAdded.getTime()) ? new Date() : dateAdded,
              },
              $set: {
                title,
                folder,
                browser,
                chromeId,
                chromeParentId,
                index: bookmarkIndex,
              },
            },
            upsert: true,
          },
        });
      } catch {
        // Skip malformed URLs
        continue;
      }
    }

    if (validOperations.length === 0) {
      return NextResponse.json(
        { error: 'No valid HTTP/HTTPS bookmarks found in payload' },
        { status: 400 }
      );
    }

    // Execute bulkWrite
    const bulkResult = await Bookmark.bulkWrite(validOperations, { ordered: false });

    const insertedCount = bulkResult.upsertedCount || 0;
    const duplicatesCount = validOperations.length - insertedCount;

    return NextResponse.json({
      success: true,
      totalReceived: bookmarks.length,
      validCount: validOperations.length,
      insertedCount,
      duplicatesCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error during import';
    console.error('Import bookmarks error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
