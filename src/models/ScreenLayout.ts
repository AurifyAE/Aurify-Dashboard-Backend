import mongoose, { Document, Schema } from 'mongoose';

export type LayoutStatus = 'draft' | 'published' | 'archived';

export interface IScreenLayout extends Document {
  layoutId: string;
  merchantId: string;
  name: string;
  screenSlug: string;
  themeId?: string;
  header: Record<string, unknown>;
  body: Record<string, unknown>;
  sidebar: Record<string, unknown>;
  footer: Record<string, unknown>;
  widgets: string[];
  styles: Record<string, unknown>;
  status: LayoutStatus;
}

const ScreenLayoutSchema = new Schema<IScreenLayout>(
  {
    layoutId: { type: String, required: true, unique: true, index: true },
    merchantId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    screenSlug: { type: String, required: true, lowercase: true, trim: true, default: 'main' },
    themeId: { type: String, trim: true },
    header: { type: Schema.Types.Mixed, default: {} },
    body: { type: Schema.Types.Mixed, default: {} },
    sidebar: { type: Schema.Types.Mixed, default: {} },
    footer: { type: Schema.Types.Mixed, default: {} },
    widgets: [{ type: String, trim: true }],
    styles: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  },
  { timestamps: true }
);

ScreenLayoutSchema.index({ merchantId: 1, screenSlug: 1 }, { unique: true });

const ScreenLayout = mongoose.model<IScreenLayout>('ScreenLayout', ScreenLayoutSchema);
export default ScreenLayout;
