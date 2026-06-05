import mongoose, { Document, Schema } from "mongoose";

export interface IPublishedLayoutVersion extends Document {
  layoutId: string;
  merchantId: string;
  status: "published";
  version: number;
  snapshot: Record<string, unknown>;
}

export interface IScreenRecord extends Document {
  merchantId: string;
  screenSlug: string;
  layoutId: string;
  themeId?: string;
  live: boolean;
  liveUrl: string;
  assignedDevices: string[];
}

const PublishedLayoutVersionSchema = new Schema<IPublishedLayoutVersion>(
  {
    layoutId: { type: String, required: true, index: true },
    merchantId: { type: String, required: true, index: true },
    status: { type: String, enum: ["published"], default: "published" },
    version: { type: Number, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

const ScreenRecordSchema = new Schema<IScreenRecord>(
  {
    merchantId: { type: String, required: true, index: true },
    screenSlug: { type: String, required: true, lowercase: true, trim: true },
    layoutId: { type: String, required: true, index: true },
    themeId: { type: String, trim: true },
    live: { type: Boolean, default: true, index: true },
    liveUrl: { type: String, required: true },
    assignedDevices: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

PublishedLayoutVersionSchema.index({ merchantId: 1, layoutId: 1, version: -1 });
ScreenRecordSchema.index({ merchantId: 1, screenSlug: 1 }, { unique: true });

export const PublishedLayoutVersion = mongoose.model<IPublishedLayoutVersion>(
  "PublishedLayoutVersion",
  PublishedLayoutVersionSchema
);

export const ScreenRecord = mongoose.model<IScreenRecord>("ScreenRecord", ScreenRecordSchema);
