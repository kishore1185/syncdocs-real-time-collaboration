import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ActivityLogDocument = HydratedDocument<ActivityLog>;

export type ActivityAction =
  | 'DOCUMENT_CREATED'
  | 'DOCUMENT_RENAMED'
  | 'PAGE_CREATED'
  | 'PAGE_UPDATED'
  | 'PAGE_LOCKED'
  | 'PAGE_UNLOCKED'
  | 'COLLABORATOR_JOINED'
  | 'COLLABORATOR_LEFT'
  | 'DOCUMENT_SHARED'
  | 'PERMISSION_UPDATED';

export const ACTIVITY_ACTIONS: ActivityAction[] = [
  'DOCUMENT_CREATED',
  'DOCUMENT_RENAMED',
  'PAGE_CREATED',
  'PAGE_UPDATED',
  'PAGE_LOCKED',
  'PAGE_UNLOCKED',
  'COLLABORATOR_JOINED',
  'COLLABORATOR_LEFT',
  'DOCUMENT_SHARED',
  'PERMISSION_UPDATED',
];

/** Audit trail only. This is NOT version history: no document snapshots are kept here. */
@Schema({ collection: 'activity_logs', timestamps: { createdAt: 'timestamp', updatedAt: false } })
export class ActivityLog {
  @Prop({ type: Types.ObjectId, ref: 'DocumentEntity', required: true, index: true })
  documentId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Page', default: null })
  pageId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, enum: ACTIVITY_ACTIONS })
  action!: ActivityAction;

  @Prop({ type: String, default: '' })
  details!: string;

  @Prop({ type: Date })
  timestamp!: Date;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

ActivityLogSchema.index({ documentId: 1, timestamp: -1 });
