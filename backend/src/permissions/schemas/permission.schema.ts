import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PermissionDocument = HydratedDocument<Permission>;

export type DocumentRole = 'owner' | 'editor' | 'viewer';
export const DOCUMENT_ROLES: DocumentRole[] = ['owner', 'editor', 'viewer'];

@Schema({ collection: 'permissions', timestamps: true })
export class Permission {
  @Prop({ type: Types.ObjectId, ref: 'DocumentEntity', required: true, index: true })
  documentId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, enum: DOCUMENT_ROLES })
  role!: DocumentRole;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  grantedBy!: Types.ObjectId;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);

PermissionSchema.index({ documentId: 1, userId: 1 }, { unique: true });
PermissionSchema.index({ userId: 1, updatedAt: -1 });
