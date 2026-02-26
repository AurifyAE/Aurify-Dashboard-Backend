import mongoose, { Document, Schema } from "mongoose";

export interface ITemplateConfig extends Document {
  userId: string;
  templateId: string;
  config: any;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateConfigSchema = new Schema<ITemplateConfig>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    templateId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    config: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true },
);

TemplateConfigSchema.index({ userId: 1, templateId: 1 }, { unique: true });

const TemplateConfig = mongoose.model<ITemplateConfig>(
  "TemplateConfig",
  TemplateConfigSchema,
);

export default TemplateConfig;

