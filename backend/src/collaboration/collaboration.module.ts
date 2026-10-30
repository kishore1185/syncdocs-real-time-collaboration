import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { CollaborationGateway } from './collaboration.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { Page, PageSchema } from '../pages/schemas/page.schema';

@Module({
  imports: [
    UsersModule,
    PermissionsModule,
    MongooseModule.forFeature([{ name: Page.name, schema: PageSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  providers: [CollaborationGateway],
  exports: [CollaborationGateway],
})
export class CollaborationModule {}
