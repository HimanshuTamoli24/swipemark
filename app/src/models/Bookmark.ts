import mongoose, { Schema, Document, Model } from 'mongoose';

export type BookmarkStatus = 'unreviewed' | 'saved' | 'skipped';
export type BrowserType = 'Chrome' | 'Brave' | 'Firefox' | 'Edge' | 'Opera' | 'Safari' | 'Other';

export interface IBookmark extends Document {
  title: string;
  url: string;
  folder: string;
  status: BookmarkStatus;
  browser: BrowserType;
  favicon?: string;
  chromeId?: string;
  chromeParentId?: string;
  index?: number;
  dateAdded?: Date;
  reviewedAt?: Date;
  savedAt?: Date;
  skippedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BookmarkSchema = new Schema<IBookmark>(
  {
    title: {
      type: String,
      required: [true, 'Bookmark title is required'],
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'Bookmark URL is required'],
      trim: true,
      index: true, // Non-unique to allow multiple bookmarks across browsers and folders
    },
    folder: {
      type: String,
      default: 'Bookmarks Bar',
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['unreviewed', 'saved', 'skipped'],
      default: 'unreviewed',
      index: true,
    },
    browser: {
      type: String,
      default: 'Chrome',
      enum: ['Chrome', 'Brave', 'Firefox', 'Edge', 'Opera', 'Safari', 'Other'],
      index: true,
    },
    favicon: {
      type: String,
      default: '',
    },
    chromeId: {
      type: String,
      default: '',
      index: true,
    },
    chromeParentId: {
      type: String,
      default: '',
    },
    index: {
      type: Number,
      default: 0,
    },
    dateAdded: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
    },
    savedAt: {
      type: Date,
    },
    skippedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to deduplicate only within the same browser, folder, and URL
BookmarkSchema.index({ url: 1, folder: 1, browser: 1 });

// Helper function to extract domain and construct favicon url if not provided
BookmarkSchema.pre('save', function (next) {
  if (!this.favicon && this.url) {
    try {
      const parsedUrl = new URL(this.url);
      this.favicon = `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`;
    } catch {
      this.favicon = '';
    }
  }
  next();
});

if (mongoose.models && mongoose.models.Bookmark) {
  delete mongoose.models.Bookmark;
}

const Bookmark: Model<IBookmark> = mongoose.model<IBookmark>('Bookmark', BookmarkSchema);

// Safely drop obsolete unique url_1 index if it was previously created
if (mongoose.connection && mongoose.connection.readyState === 1) {
  Bookmark.collection.dropIndex('url_1').catch(() => {
    // Ignore if index doesn't exist
  });
}

export default Bookmark;
