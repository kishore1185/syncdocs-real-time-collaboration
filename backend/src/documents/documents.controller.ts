import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ObjectIdPipe } from '../common/pipes/object-id.pipe';
import { CreateDocumentDto, RenameDocumentDto } from './dto/document.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDocumentDto) {
    return this.documents.create(user.userId, dto.title);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.documents.listForUser(user.userId);
  }

  @Get(':documentId')
  get(@Param('documentId', ObjectIdPipe) documentId: string, @CurrentUser() user: AuthUser) {
    return this.documents.get(documentId, user.userId);
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
