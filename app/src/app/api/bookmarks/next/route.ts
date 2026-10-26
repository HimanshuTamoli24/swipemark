import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Bookmark from '@/models/Bookmark';

export async function GET() {
  try {
    await connectToDatabase();

    // Use $sample to fetch one random unreviewed bookmark
    const results = await Bookmark.aggregate([
      { $match: { status: 'unreviewed' } },
      { $sample: { size: 1 } },
    ]);

    if (!results || results.length === 0) {
      return NextResponse.json({ bookmark: null });
    }

    const bookmark = results[0];

    return NextResponse.json({
      bookmark: {
        id: bookmark._id.toString(),
        title: bookmark.title,
        url: bookmark.url,
        folder: bookmark.folder,
        status: bookmark.status,
        favicon: bookmark.favicon,
        chromeId: bookmark.chromeId || '',
        chromeParentId: bookmark.chromeParentId || '',
        index: bookmark.index || 0,
        dateAdded: bookmark.dateAdded,
        createdAt: bookmark.createdAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching next bookmark';
    console.error('Fetch next bookmark error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
