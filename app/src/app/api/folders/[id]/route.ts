import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Folder from '@/models/Folder';
import Bookmark from '@/models/Bookmark';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { newTitle, oldFullPath, newFullPath, chromeId } = body;

    if (!newTitle || !oldFullPath || !newFullPath) {
      return NextResponse.json(
        { error: 'newTitle, oldFullPath, and newFullPath are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 1. Update Folder document if it exists by ID or fullPath
    if (id && !id.startsWith('virtual-')) {
      await Folder.findByIdAndUpdate(id, {
        $set: {
          title: newTitle.trim(),
          fullPath: newFullPath.trim(),
          ...(chromeId ? { chromeId: String(chromeId) } : {}),
        },
      });
    } else {
      await Folder.findOneAndUpdate(
        { fullPath: oldFullPath },
        {
          $set: {
            title: newTitle.trim(),
            fullPath: newFullPath.trim(),
            ...(chromeId ? { chromeId: String(chromeId) } : {}),
          },
        },
        { upsert: true }
      );
    }

    // 2. Cascade rename to all bookmarks in this folder (and sub-paths)
    await Bookmark.updateMany(
      { folder: oldFullPath },
      { $set: { folder: newFullPath.trim() } }
    );

    return NextResponse.json({
      success: true,
      message: `Folder renamed to "${newTitle}"`,
      newFullPath: newFullPath.trim(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error renaming folder';
    console.error('Rename folder error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const fullPath = searchParams.get('fullPath');
    const deleteBookmarks = searchParams.get('deleteBookmarks') === 'true';

    await connectToDatabase();

    let targetPath = fullPath;

    // Remove folder document
    if (id && !id.startsWith('virtual-')) {
      const folderDoc = await Folder.findByIdAndDelete(id);
      if (folderDoc) {
        targetPath = folderDoc.fullPath;
      }
    } else if (fullPath) {
      await Folder.findOneAndDelete({ fullPath });
    }

    if (targetPath) {
      if (deleteBookmarks) {
        // Delete all bookmarks in this folder
        await Bookmark.deleteMany({ folder: targetPath });
      } else {
        // Unassign bookmarks to root
        await Bookmark.updateMany(
          { folder: targetPath },
          { $set: { folder: 'Bookmarks Bar' } }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Folder ${targetPath || id} deleted successfully.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error deleting folder';
    console.error('Delete folder error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
