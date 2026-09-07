import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { toPublicUser, UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('The two passwords do not match.');
    }
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account already exists for this email address.');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.usersService.create({
      fullName: dto.fullName.trim(),
      email: dto.email,
      passwordHash,
    });
    return this.issue(user._id.toString(), user.email, toPublicUser(user));
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Incorrect email or SyncDocs password.');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Incorrect email or SyncDocs password.');
    return this.issue(user._id.toString(), user.email, toPublicUser(user));
  }

  /** Verifies a raw JWT — used by the collaboration WebSocket handshake. */
  async verifyToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; email: string }>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      const user = await this.usersService.findById(payload.sub);
      return user ? toPublicUser(user) : null;
    } catch {
      return null;
    }
  }

  private async issue(sub: string, email: string, user: ReturnType<typeof toPublicUser>) {
    const accessToken = await this.jwtService.signAsync({ sub, email });
    return { accessToken, user };
  }
}
