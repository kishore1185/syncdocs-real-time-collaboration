import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export type NotificationType =
  | 'DOCUMENT_SHARED'
  | 'PERMISSION_CHANGED'
  | 'COLLABORATOR_JOINED'
  | 'MENTION';

export const NOTIFICATION_TYPES: NotificationType[] = [
  'DOCUMENT_SHARED',
  'PERMISSION_CHANGED',
  'COLLABORATOR_JOINED',
  'MENTION',
];

@Schema({ collection: 'notifications', timestamps: { createdAt: 'createdAt', updatedAt: false } })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'DocumentEntity', default: null })
  documentId!: Types.ObjectId | null;

  @Prop({ required: true, enum: NOTIFICATION_TYPES })
  type!: NotificationType;

  @Prop({ required: true })
  message!: string;

  @Prop({ default: false })
  isRead!: boolean;

  @Prop({ type: Date })
  createdAt!: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
