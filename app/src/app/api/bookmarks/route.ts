import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Bookmark from '@/models/Bookmark';
import Folder from '@/models/Folder';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const folder = searchParams.get('folder') || '';
    const browser = searchParams.get('browser') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (folder) {
      filter.folder = folder;
    }

    if (browser && browser !== 'all') {
      filter.browser = browser;
    }

    if (search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { url: { $regex: search.trim(), $options: 'i' } },
        { folder: { $regex: search.trim(), $options: 'i' } },
        { browser: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const [bookmarks, total] = await Promise.all([
      Bookmark.find(filter)
        .sort({ index: 1, updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Bookmark.countDocuments(filter),
    ]);

    return NextResponse.json({
      bookmarks: bookmarks.map((b) => ({
        id: b._id.toString(),
        title: b.title,
        url: b.url,
        folder: b.folder,
        status: b.status,
        browser: b.browser || 'Chrome',
        favicon: b.favicon,
        chromeId: b.chromeId || '',
        chromeParentId: b.chromeParentId || '',
        index: b.index || 0,
        dateAdded: b.dateAdded,
        reviewedAt: b.reviewedAt,
        savedAt: b.savedAt,
        skippedAt: b.skippedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching bookmarks';
    console.error('Fetch bookmarks error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { title, url, folder, browser } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const trimmedUrl = url.trim();
    const parsed = new URL(trimmedUrl);
    const resolvedTitle = title?.trim() || parsed.hostname;
    const resolvedFolder = folder?.trim() || 'Bookmarks Bar';
    const resolvedBrowser = browser?.trim() || 'Chrome';
    const favicon = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`;

    const bookmark = await Bookmark.findOneAndUpdate(
      { url: trimmedUrl, folder: resolvedFolder, browser: resolvedBrowser },
      {
        $setOnInsert: {
          url: trimmedUrl,
          folder: resolvedFolder,
          browser: resolvedBrowser,
          status: 'unreviewed',
          favicon,
          dateAdded: new Date(),
        },
        $set: {
          title: resolvedTitle,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      bookmark: {
        id: bookmark._id.toString(),
        title: bookmark.title,
        url: bookmark.url,
        folder: bookmark.folder,
        browser: bookmark.browser,
        status: bookmark.status,
        favicon: bookmark.favicon,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error creating bookmark';
    console.error('Create bookmark error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Destructive wipe endpoint:
 * DELETE /api/bookmarks
 *
 * Query options:
 * - ?complete=true or ?wipeDb=true or ?wipeFolders=true: also deletes all folders (complete DB wipe)
 * - ?status=unreviewed|saved|skipped: selectively wipe only bookmarks matching this status
 * - ?browser=Chrome|Brave|...: selectively wipe only bookmarks from a specific browser
 */
export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const wipeFoldersQuery =
      searchParams.get('wipeFolders') === 'true' ||
      searchParams.get('complete') === 'true' ||
      searchParams.get('wipeDb') === 'true' ||
      searchParams.get('includeFolders') === 'true' ||
      searchParams.get('all') === 'true';

    let bodyWipeFolders = false;
    let bodyStatus: string | null = null;
    let bodyBrowser: string | null = null;

    try {
      const body = await req.json();
      if (
        body?.wipeFolders ||
        body?.completeDb ||
        body?.complete ||
        body?.wipeDb ||
        body?.all ||
        body?.includeFolders
      ) {
        bodyWipeFolders = true;
      }
      if (body?.status) bodyStatus = body.status;
      if (body?.browser) bodyBrowser = body.browser;
    } catch {
      // Body is optional
    }

    const shouldWipeFolders = wipeFoldersQuery || bodyWipeFolders;
    const status = searchParams.get('status') || bodyStatus;
    const browser = searchParams.get('browser') || bodyBrowser;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (browser && browser !== 'all') {
      filter.browser = browser;
    }

    const [bookmarkResult, folderResult] = await Promise.all([
      Bookmark.deleteMany(filter),
      shouldWipeFolders ? Folder.deleteMany({}) : Promise.resolve({ deletedCount: 0 }),
    ]);

    return NextResponse.json({
      success: true,
      message: shouldWipeFolders
        ? `Destructive complete DB wipe: deleted ${bookmarkResult.deletedCount} bookmarks and ${folderResult.deletedCount} folders.`
        : `Destructive bookmarks wipe: deleted ${bookmarkResult.deletedCount} bookmarks.`,
      deletedBookmarksCount: bookmarkResult.deletedCount,
      deletedFoldersCount: folderResult.deletedCount,
      completeDbWiped: shouldWipeFolders,
      filterApplied: Object.keys(filter).length > 0 ? filter : 'all',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error wiping database';
    console.error('Destructive delete all bookmarks error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
