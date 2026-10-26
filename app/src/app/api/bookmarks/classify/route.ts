import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Bookmark from '@/models/Bookmark';
import Folder from '@/models/Folder';
import {
  classifyBookmark,
  classifyByRules,
  SMART_CATEGORIES,
} from '@/lib/smartFolderClassifier';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Single bookmark classification query
    if (body.url && !body.autoOrganizeAll) {
      const { url, title } = body;
      const result = await classifyBookmark(title || '', url);
      return NextResponse.json({
        success: true,
        suggestion: result,
      });
    }

    // 2. Auto-organize existing bookmarks into smart folders
    if (body.autoOrganizeAll) {
      await connectToDatabase();

      // Find all bookmarks that are in default / unorganized folders or all unreviewed
      const query = body.onlyUncategorized
        ? { folder: { $in: ['Bookmarks Bar', 'Other Bookmarks', 'MySaved', '', null] } }
        : {};

      const bookmarks = await Bookmark.find(query).lean();

      if (bookmarks.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No bookmarks needed auto-categorization',
          updatedCount: 0,
        });
      }

      // Categorize and create bulk update operations
      const bulkOps = [];
      const folderSet = new Set<string>();
      const categoryCounts: Record<string, number> = {};

      for (const b of bookmarks) {
        const result = classifyByRules(b.title || '', b.url);
        folderSet.add(result.folder);
        categoryCounts[result.folder] = (categoryCounts[result.folder] || 0) + 1;

        bulkOps.push({
          updateOne: {
            filter: { _id: b._id },
            update: {
              $set: {
                folder: result.folder,
              },
            },
          },
        });
      }

      if (bulkOps.length > 0) {
        await Bookmark.bulkWrite(bulkOps, { ordered: false });
      }

      // Also ensure Folder entries exist for all categorized smart folders
      const folderOps = Array.from(folderSet).map((folderTitle) => ({
        updateOne: {
          filter: { fullPath: folderTitle },
          update: {
            $set: {
              title: folderTitle,
              fullPath: folderTitle,
              browser: 'Chrome',
            },
          },
          upsert: true,
        },
      }));

      if (folderOps.length > 0) {
        await Folder.bulkWrite(folderOps, { ordered: false });
      }

      return NextResponse.json({
        success: true,
        message: `Successfully organized ${bulkOps.length} bookmarks into smart folders`,
        updatedCount: bulkOps.length,
        categoryCounts,
        availableCategories: SMART_CATEGORIES.map((c) => ({
          name: c.name,
          emoji: c.emoji,
          iconName: c.iconName,
          badgeColor: c.badgeColor,
        })),
      });
    }

    return NextResponse.json(
      { error: 'Invalid request body. Expected url or autoOrganizeAll: true' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Classification error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to classify' },
      { status: 500 }
    );
  }
}
