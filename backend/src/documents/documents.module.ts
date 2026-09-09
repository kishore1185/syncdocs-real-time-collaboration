import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentEntity, DocumentEntitySchema } from './schemas/document.schema';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PermissionsModule } from '../permissions/permissions.module';
import { PagesModule } from '../pages/pages.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DocumentEntity.name, schema: DocumentEntitySchema }]),
    PermissionsModule,
    PagesModule,
    ActivityLogsModule,
    UsersModule,
    NotificationsModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
