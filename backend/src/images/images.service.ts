import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class ImagesService implements OnModuleInit {
  private gridFs!: GridFSBucket;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly permissionsService: PermissionsService,
  ) {}

  onModuleInit() {
    this.gridFs = new GridFSBucket(this.connection.db!, {
      bucketName: 'images',
    });
  }

  async uploadImage(file: Express.Multer.File, documentId: string, userId: string): Promise<string> {
    // Require editor access or above to upload
    await this.permissionsService.require(documentId, userId, 'editor');
    
    return new Promise((resolve, reject) => {
      const uploadStream = this.gridFs.openUploadStream(file.originalname, {
        contentType: file.mimetype,
        metadata: { documentId, uploaderId: userId },
      });

      uploadStream.on('error', (err) => reject(err));
      uploadStream.on('finish', () => resolve(uploadStream.id.toString()));

      uploadStream.end(file.buffer);
    });
  }

  async getImageStream(id: string, userId: string): Promise<{ stream: NodeJS.ReadableStream; contentType: string }> {
    if (!ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid image ID');
    }
    const objectId = new ObjectId(id);
    const files = await this.gridFs.find({ _id: objectId }).toArray();
    
    if (!files || files.length === 0) {
      throw new NotFoundException('Image not found');
    }
    const file = files[0];
    const documentId = file.metadata?.documentId;
    
    if (!documentId) {
      throw new NotFoundException('Image not found');
    }
    
    // Require viewer access to read
    await this.permissionsService.require(documentId, userId, 'viewer');

    const stream = this.gridFs.openDownloadStream(objectId);
    return { stream, contentType: file.contentType || 'application/octet-stream' };
  }

  async deleteImage(id: string, userId: string): Promise<void> {
    if (!ObjectId.isValid(id)) return;
    const objectId = new ObjectId(id);
    
    const files = await this.gridFs.find({ _id: objectId }).toArray();
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const documentId = file.metadata?.documentId;
    if (!documentId) return;
    
    try {
      await this.permissionsService.require(documentId, userId, 'editor');
      await this.gridFs.delete(objectId);
    } catch {
      // ignore
    }
  }
}
