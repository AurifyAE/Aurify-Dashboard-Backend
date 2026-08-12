import mongoose, { Document, Schema } from 'mongoose';

export type EventProcessingStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface IEventProcessing extends Document {
  eventId: string;
  eventKey: string;
  status: EventProcessingStatus;
  attempts: number;
  error?: string;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const EventProcessingSchema = new Schema<IEventProcessing>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventKey: { type: String, required: true },
    status: {
      type: String,
      enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PROCESSING',
      index: true,
    },
    attempts: { type: Number, default: 1 },
    error: { type: String },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Index for finding stale processing locks efficiently
EventProcessingSchema.index({ status: 1, updatedAt: 1 });

const EventProcessing = mongoose.model<IEventProcessing>(
  'EventProcessing',
  EventProcessingSchema
);

export default EventProcessing;
