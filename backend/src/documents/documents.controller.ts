import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ObjectIdPipe } from '../common/pipes/object-id.pipe';
import { CreateDocumentDto, JoinRoomDto, RenameDocumentDto } from './dto/document.dto';

/**
 * Identity always comes from the verified JWT (`user.userId`) — a client-supplied
 * user id is never trusted. Every handler re-checks the role server-side.
 */
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDocumentDto) {
    return this.documents.create(user.userId, dto.title);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('q') q?: string) {
    return q ? this.documents.search(user.userId, q) : this.documents.listForUser(user.userId);
  }

  /** Join by shareable Room ID; grants viewer access when the user has none. */
  @Post('join')
  @HttpCode(200)
  join(@CurrentUser() user: AuthUser, @Body() dto: JoinRoomDto) {
    return this.documents.joinByRoomId(dto.roomId, user.userId);
  }

  @Get(':documentId')
  get(@Param('documentId', ObjectIdPipe) documentId: string, @CurrentUser() user: AuthUser) {
    return this.documents.get(documentId, user.userId);
  }

  /** Editor payload: document metadata + pages + current save state. */
  @Get(':documentId/open')
  open(@Param('documentId', ObjectIdPipe) documentId: string, @CurrentUser() user: AuthUser) {
    return this.documents.open(documentId, user.userId);
  }

  @Patch(':documentId')
  rename(
    @Param('documentId', ObjectIdPipe) documentId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: RenameDocumentDto,
  ) {
    return this.documents.rename(documentId, user.userId, dto.title);
  }

  @Delete(':documentId')
  @HttpCode(200)
  remove(@Param('documentId', ObjectIdPipe) documentId: string, @CurrentUser() user: AuthUser) {
    return this.documents.remove(documentId, user.userId);
  }
}
