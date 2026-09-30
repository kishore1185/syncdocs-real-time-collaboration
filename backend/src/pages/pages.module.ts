import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Page, PageSchema } from './schemas/page.schema';
import { DocumentEntity, DocumentEntitySchema } from '../documents/schemas/document.schema';
import { PagesService } from './pages.service';
import { PagesController } from './pages.controller';
import { PermissionsModule } from '../permissions/permissions.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Page.name, schema: PageSchema },
      { name: DocumentEntity.name, schema: DocumentEntitySchema },
    ]),
    PermissionsModule,
    ActivityLogsModule,
    UsersModule,
  ],
  controllers: [PagesController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
