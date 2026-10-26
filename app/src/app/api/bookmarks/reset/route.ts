import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Bookmark from '@/models/Bookmark';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    let scope = 'skipped';
    try {
      const body = await req.json();
      if (body?.scope) {
        scope = body.scope;
      }
    } catch {
      // default scope is 'skipped'
    }

    const filter: Record<string, unknown> = {};
    if (scope === 'skipped') {
      filter.status = 'skipped';
    } else if (scope === 'all') {
      filter.status = { $in: ['saved', 'skipped'] };
    }

    const result = await Bookmark.updateMany(filter, {
      $set: {
        status: 'unreviewed',
        reviewedAt: null,
        savedAt: null,
        skippedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      scope,
      resetCount: result.modifiedCount,
      message: `Successfully reset ${result.modifiedCount} ${scope} bookmarks to unreviewed.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error resetting bookmarks';
    console.error('Reset bookmarks error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
