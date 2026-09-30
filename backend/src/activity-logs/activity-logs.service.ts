import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ActivityAction, ActivityLog, ActivityLogDocument } from './schemas/activity-log.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class ActivityLogsService {
  private readonly logger = new Logger(ActivityLogsService.name);

  constructor(
    @InjectModel(ActivityLog.name) private readonly model: Model<ActivityLogDocument>,
    private readonly usersService: UsersService,
  ) {}

  /** Fire-and-forget: an audit write must never break the user's action. */
  async record(entry: {
    documentId: string | Types.ObjectId;
    userId: string | Types.ObjectId;
    action: ActivityAction;
    pageId?: string | Types.ObjectId | null;
    details?: string;
  }) {
    try {
      await this.model.create({
        documentId: new Types.ObjectId(String(entry.documentId)),
        userId: new Types.ObjectId(String(entry.userId)),
        action: entry.action,
        pageId: entry.pageId ? new Types.ObjectId(String(entry.pageId)) : null,
        details: entry.details ?? '',
      });
    } catch (error) {
      this.logger.warn(`Could not record ${entry.action}: ${(error as Error).message}`);
    }
  }

  async list(documentId: string, limit = 100) {
    const logs = await this.model
      .find({ documentId: new Types.ObjectId(documentId) })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
    const users = await this.usersService.findManyByIds([...new Set(logs.map((l) => l.userId.toString()))].map((id) => new Types.ObjectId(id)));
    const names = new Map(users.map((u) => [u._id.toString(), u.fullName]));
    return logs.map((log) => ({
      id: log._id.toString(),
      documentId: log.documentId.toString(),
      pageId: log.pageId ? log.pageId.toString() : null,
      userId: log.userId.toString(),
      userName: names.get(log.userId.toString()) ?? 'Unknown user',
      action: log.action,
      details: log.details,
      timestamp: log.timestamp,
    }));
  }
}
