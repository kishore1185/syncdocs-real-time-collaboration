import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ActivityLog, ActivityLogSchema } from './schemas/activity-log.schema';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLogsController } from './activity-logs.controller';

@Module({
  imports: [
    UsersModule,
    PermissionsModule,
    MongooseModule.forFeature([{ name: ActivityLog.name, schema: ActivityLogSchema }]),
  ],
  controllers: [ActivityLogsController],
  providers: [ActivityLogsService],
  exports: [ActivityLogsService],
})
export class ActivityLogsModule {}
