import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Bookmark from '@/models/Bookmark';
import Folder from '@/models/Folder';

/**
 * Destructive Database Wipe Handler
 * Clears all bookmarks and folders from MongoDB.
 *
 * Supported Methods: POST, DELETE
 * Endpoint: /api/bookmarks/clear
 *
 * Query Options:
 * - ?folders=false: preserve folders collection, only wipe bookmarks
 * - ?status=unreviewed|saved|skipped: only wipe specific status
 * - ?browser=Chrome|Brave|...: only wipe specific browser
 */
async function handleDestructiveClear(req: NextRequest) {
  try {
    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    let wipeFolders = true; // By default on /clear, perform complete DB wipe
    let statusFilter: string | null = null;
    let browserFilter: string | null = null;

    if (
      searchParams.get('folders') === 'false' ||
      searchParams.get('wipeFolders') === 'false' ||
      searchParams.get('includeFolders') === 'false'
    ) {
      wipeFolders = false;
    }

    try {
      const body = await req.json();
      if (body?.folders === false || body?.wipeFolders === false || body?.includeFolders === false) {
        wipeFolders = false;
      }
      if (body?.status) statusFilter = body.status;
      if (body?.browser) browserFilter = body.browser;
    } catch {
      // Body is optional
    }

    if (searchParams.get('status')) statusFilter = searchParams.get('status');
    if (searchParams.get('browser')) browserFilter = searchParams.get('browser');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (statusFilter && statusFilter !== 'all') {
      filter.status = statusFilter;
    }
    if (browserFilter && browserFilter !== 'all') {
      filter.browser = browserFilter;
    }

    const [bookmarkResult, folderResult] = await Promise.all([
      Bookmark.deleteMany(filter),
      wipeFolders ? Folder.deleteMany({}) : Promise.resolve({ deletedCount: 0 }),
    ]);

    return NextResponse.json({
      success: true,
      message: wipeFolders
        ? `Complete database wipe successful: permanently deleted ${bookmarkResult.deletedCount} bookmarks and ${folderResult.deletedCount} folders.`
        : `Bookmarks wipe successful: permanently deleted ${bookmarkResult.deletedCount} bookmarks.`,
      deletedBookmarksCount: bookmarkResult.deletedCount,
      deletedFoldersCount: folderResult.deletedCount,
      completeDbWiped: wipeFolders,
      filterApplied: Object.keys(filter).length > 0 ? filter : 'all',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error clearing database';
    console.error('Destructive clear database error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handleDestructiveClear(req);
}

export async function DELETE(req: NextRequest) {
  return handleDestructiveClear(req);
}
