import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFolder extends Document {
  title: string;
  fullPath: string;
  chromeId?: string;
  chromeParentId?: string;
  browser?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const FolderSchema = new Schema<IFolder>(
  {
    title: {
      type: String,
      required: [true, 'Folder title is required'],
      trim: true,
    },
    fullPath: {
      type: String,
      required: [true, 'Full path is required'],
      trim: true,
      index: true,
    },
    browser: {
      type: String,
      default: 'Chrome',
      index: true,
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
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models && mongoose.models.Folder) {
  delete mongoose.models.Folder;
}

const Folder: Model<IFolder> = mongoose.model<IFolder>('Folder', FolderSchema);

export default Folder;
