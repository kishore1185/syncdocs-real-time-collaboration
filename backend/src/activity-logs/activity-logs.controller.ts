import { Controller, Get, Param, Query } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { PermissionsService } from '../permissions/permissions.service';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('documents/:documentId/activity')
export class ActivityLogsController {
  constructor(
    private readonly activityLogs: ActivityLogsService,
    private readonly permissions: PermissionsService,
  ) {}

  @Get()
  async list(
    @Param('documentId') documentId: string,
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
  ) {
    await this.permissions.require(documentId, user.userId, 'viewer');
    return this.activityLogs.list(documentId, Math.min(Number(limit) || 100, 200));
  }
}
