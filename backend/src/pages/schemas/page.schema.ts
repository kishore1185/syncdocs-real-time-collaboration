import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PageDocument = HydratedDocument<Page>;

@Schema({ collection: 'pages', timestamps: true })
export class Page {
  @Prop({ type: Types.ObjectId, ref: 'DocumentEntity', required: true, index: true })
  documentId!: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  pageNumber!: number;

  /** Rendered HTML snapshot of the page, persisted by debounced autosave. */
  @Prop({ default: '' })
  content!: string;

  /** Binary Yjs state vector/update for CRDT recovery on reconnect. */
  @Prop({ type: Buffer, default: null })
  ystate!: Buffer | null;

  @Prop({ default: false })
  isLocked!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  lockedBy!: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  lockPasswordHash!: string | null;
}

export const PageSchema = SchemaFactory.createForClass(Page);

PageSchema.index({ documentId: 1, pageNumber: 1 }, { unique: true });
PageSchema.index({ content: 'text' });
