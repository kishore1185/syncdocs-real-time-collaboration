import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { Permission, PermissionSchema } from './schemas/permission.schema';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([{ name: Permission.name, schema: PermissionSchema }]),
  ],
  providers: [PermissionsService],
  exports: [PermissionsService, MongooseModule],
})
export class PermissionsModule {}
