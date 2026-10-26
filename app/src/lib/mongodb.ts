import mongoose from 'mongoose';

const rawUri = (process.env.MONGODB_URI || '').trim();
const MONGODB_URI = rawUri.replace(/^["']|["']$/g, '').trim();

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env.local (e.g. mongodb://localhost:27017/bookmark-swipe or MongoDB Atlas URI).'
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
    // Drop legacy strict unique index on url if it exists to allow multiple bookmarks
    if (cached.conn.connection.db) {
      cached.conn.connection.db.collection('bookmarks').dropIndex('url_1').catch(() => {
        // Index may not exist or already dropped, ignore
      });
    }
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
