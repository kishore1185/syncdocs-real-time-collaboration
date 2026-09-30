import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { DocumentEntity, DocumentEntityDocument } from '../documents/schemas/document.schema';
import { Page, PageDocument } from '../pages/schemas/page.schema';
import { Permission, PermissionDocument } from '../permissions/schemas/permission.schema';
import { ActivityLog, ActivityLogDocument } from '../activity-logs/schemas/activity-log.schema';
import { Notification, NotificationDocument } from '../notifications/schemas/notification.schema';

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
}

export const toPublicUser = (user: UserDocument): PublicUser => ({
  id: user._id.toString(),
  fullName: user.fullName,
  email: user.email,
});

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(DocumentEntity.name) private readonly documentModel: Model<DocumentEntityDocument>,
    @InjectModel(Page.name) private readonly pageModel: Model<PageDocument>,
    @InjectModel(Permission.name) private readonly permissionModel: Model<PermissionDocument>,
    @InjectModel(ActivityLog.name) private readonly activityLogModel: Model<ActivityLogDocument>,
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  findById(id: string | Types.ObjectId) {
    return this.userModel.findById(id).exec();
  }

  findManyByIds(ids: Types.ObjectId[]) {
    return this.userModel.find({ _id: { $in: ids } }).exec();
  }

  create(data: { fullName: string; email: string; passwordHash: string }) {
    return this.userModel.create({ ...data, email: data.email.toLowerCase().trim() });
  }

  async search(term: string, limit = 10): Promise<PublicUser[]> {
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const users = await this.userModel
      .find({ $or: [{ fullName: rx }, { email: rx }] })
      .limit(limit)
      .exec();
    return users.map(toPublicUser);
  }

  async remove(userId: string): Promise<void> {
    const uid = new Types.ObjectId(userId);
    
    // Find documents where the user is the owner
    const ownedDocs = await this.documentModel.find({ ownerId: uid }).exec();
    const ownedDocIds = ownedDocs.map((doc) => doc._id);

    // Delete all pages for documents owned by the user
    if (ownedDocIds.length > 0) {
      await this.pageModel.deleteMany({ documentId: { $in: ownedDocIds } }).exec();
      // Delete all permissions associated with those documents
      await this.permissionModel.deleteMany({ documentId: { $in: ownedDocIds } }).exec();
      // Delete the documents themselves
      await this.documentModel.deleteMany({ _id: { $in: ownedDocIds } }).exec();
      // Delete activity logs related to these documents (optional, but good for cleanup)
      await this.activityLogModel.deleteMany({ documentId: { $in: ownedDocIds } }).exec();
    }

    // Delete permissions the user holds on other documents
    await this.permissionModel.deleteMany({ userId: uid }).exec();

    // Delete activity logs where the user is the actor
    await this.activityLogModel.deleteMany({ userId: uid }).exec();

    // Delete notifications targeting this user
    await this.notificationModel.deleteMany({ userId: uid }).exec();

    // Finally, delete the user record
    await this.userModel.deleteOne({ _id: uid }).exec();
  }
}
