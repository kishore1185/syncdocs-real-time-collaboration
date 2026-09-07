import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DocumentRole, Permission, PermissionDocument } from './schemas/permission.schema';
import { UsersService } from '../users/users.service';

const RANK: Record<DocumentRole, number> = { viewer: 1, editor: 2, owner: 3 };

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(Permission.name) private readonly model: Model<PermissionDocument>,
    private readonly usersService: UsersService,
  ) {}

  async roleFor(documentId: string | Types.ObjectId, userId: string): Promise<DocumentRole | null> {
    const doc = await this.model
      .findOne({ documentId: new Types.ObjectId(String(documentId)), userId: new Types.ObjectId(userId) })
      .exec();
    return doc ? doc.role : null;
  }

  /** Throws unless the user holds at least `minimum` on the document. */
  async require(
    documentId: string | Types.ObjectId,
    userId: string,
    minimum: DocumentRole,
  ): Promise<DocumentRole> {
    const role = await this.roleFor(documentId, userId);
    if (!role) throw new NotFoundException('Document not found, or you do not have access to it.');
    if (RANK[role] < RANK[minimum]) {
      throw new ForbiddenException(
        minimum === 'owner'
          ? 'Only the document owner can do that.'
          : 'You have view-only access to this document.',
      );
    }
    return role;
  }

  grant(documentId: Types.ObjectId, userId: Types.ObjectId, role: DocumentRole, grantedBy: Types.ObjectId) {
    return this.model
      .findOneAndUpdate(
        { documentId, userId },
        { $set: { role, grantedBy } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async revoke(documentId: string, userId: string) {
    await this.model
      .deleteOne({ documentId: new Types.ObjectId(documentId), userId: new Types.ObjectId(userId) })
      .exec();
  }

  documentIdsForUser(userId: string) {
    return this.model.find({ userId: new Types.ObjectId(userId) }).exec();
  }

  async collaborators(documentId: string) {
    const perms = await this.model.find({ documentId: new Types.ObjectId(documentId) }).exec();
    const users = await this.usersService.findManyByIds(perms.map((p) => p.userId));
    const byId = new Map(users.map((u) => [u._id.toString(), u]));
    return perms.map((p) => {
      const user = byId.get(p.userId.toString());
      return {
        userId: p.userId.toString(),
        fullName: user?.fullName ?? 'Unknown user',
        email: user?.email ?? '',
        role: p.role,
      };
    });
  }
}
