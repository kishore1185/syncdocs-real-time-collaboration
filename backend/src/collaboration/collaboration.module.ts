import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { CollaborationGateway } from './collaboration.gateway';

@Module({
  imports: [
    UsersModule,
    PermissionsModule,
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
