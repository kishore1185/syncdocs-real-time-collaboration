import { Controller, Post, Get, Delete, Param, UseInterceptors, UploadedFile, Res, BadRequestException, UseGuards, Req, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImagesService } from './images.service';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('images')
@UseGuards(JwtAuthGuard)
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  }))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File, 
    @Body('documentId') documentId: string,
    @Req() req: any
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (!documentId) {
      throw new BadRequestException('documentId is required');
    }
    const imageId = await this.imagesService.uploadImage(file, documentId, req.user.userId);
    return { id: imageId, url: `/api/images/${imageId}` };
  }

  @Get(':id')
  async getImage(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const { stream, contentType } = await this.imagesService.getImageStream(id, req.user.userId);
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    stream.pipe(res);
  }

  @Delete(':id')
  async deleteImage(@Param('id') id: string, @Req() req: any) {
    await this.imagesService.deleteImage(id, req.user.userId);
    return { success: true };
  }
}
