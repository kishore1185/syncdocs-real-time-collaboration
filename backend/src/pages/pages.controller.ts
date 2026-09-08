import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { PagesService } from './pages.service';
import { PermissionsService } from '../permissions/permissions.service';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ObjectIdPipe } from '../common/pipes/object-id.pipe';
import { LockPageDto, UnlockPageDto, UpdatePageContentDto } from './dto/page.dto';

/**
 * All routes are JWT-protected by the global guard. Identity comes from the token only;
 * document access is re-checked server-side on every call.
 */
@Controller('documents/:documentId/pages')
export class PagesController {
  constructor(
    private readonly pages: PagesService,
    private readonly permissions: PermissionsService,
  ) {}

  @Get()
  async list(@Param('documentId', ObjectIdPipe) documentId: string, @CurrentUser() user: AuthUser) {
    await this.permissions.require(documentId, user.userId, 'viewer');
    return this.pages.list(documentId);
  }

  @Post()
  async create(@Param('documentId', ObjectIdPipe) documentId: string, @CurrentUser() user: AuthUser) {
    await this.permissions.require(documentId, user.userId, 'editor');
    return this.pages.create(documentId, user.userId);
  }

  @Get('save-state')
  async documentSaveState(@Param('documentId', ObjectIdPipe) documentId: string, @CurrentUser() user: AuthUser) {
    await this.permissions.require(documentId, user.userId, 'viewer');
    return this.pages.documentSaveState(documentId);
  }

  @Get(':pageId')
  async get(
    @Param('documentId', ObjectIdPipe) documentId: string,
    @Param('pageId', ObjectIdPipe) pageId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.permissions.require(documentId, user.userId, 'viewer');
    return this.pages.get(documentId, pageId);
  }

  /** Debounced autosave target. Responds with { status: 'saving', lastSavedAt }. */
  @Put(':pageId/content')
  @HttpCode(202)
  async updateContent(
    @Param('documentId', ObjectIdPipe) documentId: string,
    @Param('pageId', ObjectIdPipe) pageId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePageContentDto,
  ) {
    await this.permissions.require(documentId, user.userId, 'editor');
    return this.pages.queueContent(documentId, pageId, user.userId, dto.content, dto.ystate);
  }

  @Get(':pageId/save-state')
  async saveState(
    @Param('documentId', ObjectIdPipe) documentId: string,
    @Param('pageId', ObjectIdPipe) pageId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.permissions.require(documentId, user.userId, 'viewer');
    return this.pages.saveState(documentId, pageId);
  }

  /** Forces any pending write to disk right now (used on tab close / before export). */
  @Post(':pageId/flush')
  @HttpCode(200)
  async flush(
    @Param('documentId', ObjectIdPipe) documentId: string,
    @Param('pageId', ObjectIdPipe) pageId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.permissions.require(documentId, user.userId, 'editor');
    await this.pages.flush(pageId);
    return this.pages.saveState(documentId, pageId);
  }

  @Post(':pageId/lock')
  @HttpCode(200)
  async lock(
    @Param('documentId', ObjectIdPipe) documentId: string,
    @Param('pageId', ObjectIdPipe) pageId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: LockPageDto,
  ) {
    await this.permissions.require(documentId, user.userId, 'editor');
    return this.pages.lock(documentId, pageId, user.userId, dto.password);
  }

  @Post(':pageId/unlock')
  @HttpCode(200)
  async unlock(
    @Param('documentId', ObjectIdPipe) documentId: string,
    @Param('pageId', ObjectIdPipe) pageId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UnlockPageDto,
  ) {
    await this.permissions.require(documentId, user.userId, 'editor');
    return this.pages.unlock(documentId, pageId, user.userId, dto.password);
  }
}
