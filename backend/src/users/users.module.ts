import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';
import { DocumentEntity, DocumentEntitySchema } from '../documents/schemas/document.schema';
import { Page, PageSchema } from '../pages/schemas/page.schema';
import { Permission, PermissionSchema } from '../permissions/schemas/permission.schema';
import { ActivityLog, ActivityLogSchema } from '../activity-logs/schemas/activity-log.schema';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: DocumentEntity.name, schema: DocumentEntitySchema },
      { name: Page.name, schema: PageSchema },
      { name: Permission.name, schema: PermissionSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
