import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { customAlphabet } from 'nanoid';
import { DocumentEntity, DocumentEntityDocument } from './schemas/document.schema';
import { PermissionsService } from '../permissions/permissions.service';
import { PagesService } from '../pages/pages.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { UsersService } from '../users/users.service';
import { DocumentRole, Permission, PermissionDocument } from '../permissions/schemas/permission.schema';

/** Unambiguous alphabet (no 0/O, 1/I/L) so Room IDs can be read aloud. */
const roomSuffix = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 6);

export interface DocumentView {
  id: string;
  roomId: string;
  title: string;
  owner: { id: string; fullName: string };
  role: DocumentRole;
  pageCount: number;
  lastSavedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(DocumentEntity.name) private readonly documentModel: Model<DocumentEntityDocument>,
    @InjectModel(Permission.name) private readonly permissionModel: Model<PermissionDocument>,
    private readonly permissions: PermissionsService,
    private readonly pages: PagesService,
    private readonly activityLogs: ActivityLogsService,
    private readonly usersService: UsersService,
  ) {}

  async create(userId: string, title?: string): Promise<DocumentView> {
    const ownerId = new Types.ObjectId(userId);
    const cleanTitle = (title ?? '').trim() || 'Untitled document';

    let doc: DocumentEntityDocument | null = null;
    for (let attempt = 0; attempt < 5 && !doc; attempt++) {
      try {
        doc = await this.documentModel.create({ title: cleanTitle, ownerId, roomId: `SYNC-${roomSuffix()}` });
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error; // roomId collision → retry
      }
    }
    if (!doc) throw new ConflictException('Could not create a document right now. Please try again.');

    await this.permissions.grant(doc._id, ownerId, 'owner', ownerId);
    const firstPage = await this.pages.createFirstPage(doc._id);

    void this.activityLogs.record({
      documentId: doc._id,
      userId,
      action: 'DOCUMENT_CREATED',
      details: `Created "${cleanTitle}" (${doc.roomId})`,
    });
    void this.activityLogs.record({ documentId: doc._id, userId, pageId: firstPage._id, action: 'PAGE_CREATED', details: 'Added page 1' });

    return (await this.toViews([doc], new Map([[doc._id.toString(), 'owner']])))[0];
  }

  /** Every document the user holds any role on — never anything else. */
  async listForUser(userId: string): Promise<DocumentView[]> {
    const perms = await this.permissions.documentIdsForUser(userId);
    if (perms.length === 0) return [];
    const roles = new Map(perms.map((p) => [p.documentId.toString(), p.role]));
    const docs = await this.documentModel
      .find({ _id: { $in: perms.map((p) => p.documentId) } })
      .sort({ updatedAt: -1 })
      .exec();
    return this.toViews(docs, roles);
  }

  async get(documentId: string, userId: string): Promise<DocumentView> {
    const role = await this.permissions.require(documentId, userId, 'viewer');
    const doc = await this.documentModel.findById(documentId).exec();
    if (!doc) throw new NotFoundException('Document not found, or you do not have access to it.');
    return (await this.toViews([doc], new Map([[documentId, role]])))[0];
  }

  /** Room ID lookup — public metadata only, no permission is granted here. */
  async findByRoomId(roomId: string) {
    const doc = await this.documentModel.findOne({ roomId: roomId.toUpperCase().trim() }).exec();
    if (!doc) throw new NotFoundException('No document exists with that Room ID.');
    return doc;
  }

  async rename(documentId: string, userId: string, title: string): Promise<DocumentView> {
    const role = await this.permissions.require(documentId, userId, 'editor');
    const clean = title.trim();
    const doc = await this.documentModel.findById(documentId).exec();
    if (!doc) throw new NotFoundException('Document not found.');
    const previous = doc.title;
    if (previous !== clean) {
      doc.title = clean;
      await doc.save();
      void this.activityLogs.record({
        documentId,
        userId,
        action: 'DOCUMENT_RENAMED',
        details: `Renamed "${previous}" to "${clean}"`,
      });
    }
    return (await this.toViews([doc], new Map([[documentId, role]])))[0];
  }

  /** Owner-only. Removes pages and permissions; activity logs are kept as the audit trail. */
  async remove(documentId: string, userId: string): Promise<{ id: string; deleted: true }> {
    await this.permissions.require(documentId, userId, 'owner');
    const doc = await this.documentModel.findById(documentId).exec();
    if (!doc) throw new NotFoundException('Document not found.');

    // Record first so the log entry survives even though the document row disappears.
    await this.activityLogs.record({
      documentId,
      userId,
      action: 'DOCUMENT_DELETED',
      details: `Deleted "${doc.title}" (${doc.roomId})`,
    });

    await this.pages.deleteAllForDocument(doc._id);
    await this.permissionModel.deleteMany({ documentId: doc._id }).exec();
    await this.documentModel.deleteOne({ _id: doc._id }).exec();
    return { id: documentId, deleted: true };
  }

  private async toViews(
    docs: DocumentEntityDocument[],
    roles: Map<string, DocumentRole>,
  ): Promise<DocumentView[]> {
    const ownerIds = [...new Set(docs.map((d) => d.ownerId.toString()))].map((id) => new Types.ObjectId(id));
    const owners = await this.usersService.findManyByIds(ownerIds);
    const ownerNames = new Map(owners.map((u) => [u._id.toString(), u.fullName]));

    const counts = await this.pages['pageModel']
      .aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { documentId: { $in: docs.map((d) => d._id) } } },
        { $group: { _id: '$documentId', count: { $sum: 1 } } },
      ])
      .exec();
    const pageCounts = new Map(counts.map((c) => [c._id.toString(), c.count]));

    return docs.map((d) => {
      const id = d._id.toString();
      return {
        id,
        roomId: d.roomId,
        title: d.title,
        owner: { id: d.ownerId.toString(), fullName: ownerNames.get(d.ownerId.toString()) ?? 'Unknown user' },
        role: roles.get(id) ?? 'viewer',
        pageCount: pageCounts.get(id) ?? 0,
        lastSavedAt: d.lastSavedAt,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      };
    });
  }
}
