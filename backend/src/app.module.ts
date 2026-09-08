import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DocumentsModule } from './documents/documents.module';
import { PagesModule } from './pages/pages.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
        autoIndex: true,
      }),
    }),
    AuthModule,
    UsersModule,
    PermissionsModule,
    DocumentsModule,
    PagesModule,
    ActivityLogsModule,
    NotificationsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
