import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DocumentEntityDocument = HydratedDocument<DocumentEntity>;

@Schema({ collection: 'documents', timestamps: true })
export class DocumentEntity {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId!: Types.ObjectId;

  /** Collaboration room identifier, e.g. SYNC-A7K29P. Never the document _id. */
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  roomId!: string;

  @Prop({ type: Date, default: null })
  lastSavedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const DocumentEntitySchema = SchemaFactory.createForClass(DocumentEntity);

DocumentEntitySchema.index({ roomId: 1 }, { unique: true });
DocumentEntitySchema.index({ ownerId: 1, updatedAt: -1 });
DocumentEntitySchema.index({ title: 'text' });
