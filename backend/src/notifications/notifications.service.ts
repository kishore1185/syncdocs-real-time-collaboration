import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name) private readonly model: Model<NotificationDocument>,
  ) {}

  async push(entry: {
    userId: string | Types.ObjectId;
    documentId?: string | Types.ObjectId | null;
    type: NotificationType;
    message: string;
  }) {
    try {
      await this.model.create({
        userId: new Types.ObjectId(String(entry.userId)),
        documentId: entry.documentId ? new Types.ObjectId(String(entry.documentId)) : null,
        type: entry.type,
        message: entry.message,
      });
    } catch (error) {
      this.logger.warn(`Could not create notification: ${(error as Error).message}`);
    }
  }

  async list(userId: string, limit = 50) {
    const items = await this.model
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
    return items.map((n) => ({
      id: n._id.toString(),
      documentId: n.documentId ? n.documentId.toString() : null,
      type: n.type,
      message: n.message,
      isRead: n.isRead,
      createdAt: n.createdAt,
    }));
  }

  unreadCount(userId: string) {
    return this.model.countDocuments({ userId: new Types.ObjectId(userId), isRead: false }).exec();
  }

  async markRead(userId: string, notificationId: string) {
    await this.model
      .updateOne(
        { _id: new Types.ObjectId(notificationId), userId: new Types.ObjectId(userId) },
        { $set: { isRead: true } },
      )
      .exec();
  }

  async markAllRead(userId: string) {
    await this.model
      .updateMany({ userId: new Types.ObjectId(userId), isRead: false }, { $set: { isRead: true } })
      .exec();
  }
}
