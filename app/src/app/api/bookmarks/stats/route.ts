import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Bookmark from '@/models/Bookmark';

export async function GET() {
  try {
    await connectToDatabase();

    const [statsAggregation, folderStats, browserStats] = await Promise.all([
      Bookmark.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Bookmark.aggregate([
        {
          $group: {
            _id: '$folder',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      Bookmark.aggregate([
        {
          $group: {
            _id: '$browser',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    let total = 0;
    let unreviewed = 0;
    let saved = 0;
    let skipped = 0;

    for (const group of statsAggregation) {
      const count = group.count || 0;
      total += count;
      if (group._id === 'unreviewed') unreviewed = count;
      else if (group._id === 'saved') saved = count;
      else if (group._id === 'skipped') skipped = count;
    }

    const reviewed = saved + skipped;
    const progress = total > 0 ? Math.round((reviewed / total) * 100) : 0;

    return NextResponse.json({
      total,
      unreviewed,
      saved,
      skipped,
      reviewed,
      progress,
      folders: folderStats.map((f) => ({ folder: f._id || 'Root', count: f.count })),
      browsers: browserStats.map((b) => ({ browser: b._id || 'Chrome', count: b.count })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching statistics';
    console.error('Fetch stats error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
