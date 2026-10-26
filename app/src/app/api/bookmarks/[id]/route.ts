import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Bookmark from '@/models/Bookmark';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { status, title, folder, chromeParentId, index } = body;

    await connectToDatabase();

    const updateData: Record<string, unknown> = {};

    // 1. Status update
    if (status !== undefined) {
      if (!['unreviewed', 'saved', 'skipped'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be unreviewed, saved, or skipped' },
          { status: 400 }
        );
      }
      updateData.status = status;

      if (status === 'saved') {
        updateData.savedAt = new Date();
        updateData.reviewedAt = new Date();
      } else if (status === 'skipped') {
        updateData.skippedAt = new Date();
        updateData.reviewedAt = new Date();
      } else if (status === 'unreviewed') {
        updateData.reviewedAt = null;
        updateData.savedAt = null;
        updateData.skippedAt = null;
      }
    }

    // 2. Title update (Rename)
    if (title !== undefined && typeof title === 'string') {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        return NextResponse.json({ error: 'Bookmark title cannot be empty' }, { status: 400 });
      }
      updateData.title = trimmedTitle;
    }

    // 3. Folder update (Move)
    if (folder !== undefined && typeof folder === 'string') {
      updateData.folder = folder.trim();
    }

    if (chromeParentId !== undefined) {
      updateData.chromeParentId = String(chromeParentId);
    }

    if (index !== undefined && typeof index === 'number') {
      updateData.index = index;
    }

    const updated = await Bookmark.findByIdAndUpdate(id, updateData, { new: true });

    if (!updated) {
      return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      bookmark: {
        id: updated._id.toString(),
        title: updated.title,
        url: updated.url,
        folder: updated.folder,
        status: updated.status,
        favicon: updated.favicon,
        chromeId: updated.chromeId,
        chromeParentId: updated.chromeParentId,
        index: updated.index,
        dateAdded: updated.dateAdded,
        reviewedAt: updated.reviewedAt,
        savedAt: updated.savedAt,
        skippedAt: updated.skippedAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error updating bookmark';
    console.error('Update bookmark error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await connectToDatabase();

    const deleted = await Bookmark.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Bookmark deleted',
      deletedBookmark: {
        id: deleted._id.toString(),
        chromeId: deleted.chromeId,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error deleting bookmark';
    console.error('Delete bookmark error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
