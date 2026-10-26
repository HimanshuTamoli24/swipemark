import { NextResponse } from 'next/server';
import { AnyBulkWriteOperation } from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import Bookmark, { BookmarkStatus, IBookmark } from '@/models/Bookmark';

const SAMPLE_BOOKMARKS = [
  {
    title: 'Next.js Documentation & App Router Guide',
    url: 'https://nextjs.org/docs',
    folder: 'Development / Next.js',
  },
  {
    title: 'Tailwind CSS - Modern Utility-First CSS Framework',
    url: 'https://tailwindcss.com',
    folder: 'Development / CSS',
  },
  {
    title: 'GitHub Trending Repositories Today',
    url: 'https://github.com/trending',
    folder: 'Daily / Tech',
  },
  {
    title: 'TypeScript Official Handbook & Deep Dive',
    url: 'https://www.typescriptlang.org/docs',
    folder: 'Development / TypeScript',
  },
  {
    title: 'Hacker News - Y Combinator Discussions',
    url: 'https://news.ycombinator.com',
    folder: 'Daily / News',
  },
  {
    title: 'MDN Web Docs - HTML, CSS & JavaScript API Reference',
    url: 'https://developer.mozilla.org',
    folder: 'Reference / Web',
  },
  {
    title: 'Vite - Next Generation Frontend Tooling',
    url: 'https://vitejs.dev',
    folder: 'Development / Tools',
  },
  {
    title: 'Lucide Icons - Clean & Consistent Icon Library',
    url: 'https://lucide.dev',
    folder: 'Design / Icons',
  },
  {
    title: 'MongoDB Atlas Cloud Database Manual',
    url: 'https://www.mongodb.com/docs/atlas',
    folder: 'Database / MongoDB',
  },
  {
    title: 'Smashing Magazine - Web Design & Development Articles',
    url: 'https://www.smashingmagazine.com',
    folder: 'Design / Articles',
  },
  {
    title: 'React 19 Release Notes & Server Components',
    url: 'https://react.dev/blog/2024/04/25/react-19',
    folder: 'Development / React',
  },
  {
    title: 'Figma - Collaborative Interface Design Tool',
    url: 'https://www.figma.com',
    folder: 'Design / Tools',
  },
];

export async function POST() {
  try {
    await connectToDatabase();

    const operations: AnyBulkWriteOperation<IBookmark>[] = SAMPLE_BOOKMARKS.map((item) => {
      const parsed = new URL(item.url);
      return {
        updateOne: {
          filter: { url: item.url },
          update: {
            $setOnInsert: {
              title: item.title,
              url: item.url,
              folder: item.folder,
              status: 'unreviewed' as BookmarkStatus,
              favicon: `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`,
              dateAdded: new Date(),
            },
          },
          upsert: true,
        },
      };
    });

    const result = await Bookmark.bulkWrite(operations, { ordered: false });

    return NextResponse.json({
      success: true,
      insertedCount: result.upsertedCount,
      totalSamples: SAMPLE_BOOKMARKS.length,
      message: `Loaded ${result.upsertedCount} sample bookmarks into Bookmark Swipe.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error seeding bookmarks';
    console.error('Seed bookmarks error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
