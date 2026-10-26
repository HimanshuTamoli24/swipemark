import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Folder from '@/models/Folder';
import Bookmark from '@/models/Bookmark';

export async function GET() {
  try {
    await connectToDatabase();

    // 1. Get folders from Folder collection
    const dbFolders = await Folder.find().sort({ title: 1 }).lean();

    // 2. Count bookmarks per folder
    const bookmarkCounts = await Bookmark.aggregate([
      {
        $group: {
          _id: '$folder',
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap: Record<string, number> = {};
    for (const c of bookmarkCounts) {
      if (c._id) {
        countMap[c._id] = c.count;
      }
    }

    // 3. Make sure any folder that exists in bookmarks is represented
    const folderMap = new Map<string, { id: string; title: string; fullPath: string; chromeId?: string; count: number }>();

    for (const f of dbFolders) {
      folderMap.set(f.fullPath, {
        id: f._id.toString(),
        title: f.title,
        fullPath: f.fullPath,
        chromeId: f.chromeId,
        count: countMap[f.fullPath] || 0,
      });
    }

    for (const folderName of Object.keys(countMap)) {
      if (!folderMap.has(folderName) && folderName.trim()) {
        const parts = folderName.split(' / ');
        const title = parts[parts.length - 1];
        folderMap.set(folderName, {
          id: `virtual-${encodeURIComponent(folderName)}`,
          title,
          fullPath: folderName,
          count: countMap[folderName],
        });
      }
    }

    const folders = Array.from(folderMap.values());

    return NextResponse.json({
      folders,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching folders';
    console.error('Fetch folders error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { title, parentFolder, chromeId, chromeParentId } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Folder title is required' }, { status: 400 });
    }

    const trimmedTitle = title.trim();
    const fullPath = parentFolder && parentFolder.trim()
      ? `${parentFolder.trim()} / ${trimmedTitle}`
      : trimmedTitle;

    const folder = await Folder.findOneAndUpdate(
      { fullPath },
      {
        $set: {
          title: trimmedTitle,
          fullPath,
          chromeId: chromeId ? String(chromeId) : '',
          chromeParentId: chromeParentId ? String(chromeParentId) : '',
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      folder: {
        id: folder._id.toString(),
        title: folder.title,
        fullPath: folder.fullPath,
        chromeId: folder.chromeId,
        count: 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error creating folder';
    console.error('Create folder error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
