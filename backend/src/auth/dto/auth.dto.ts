import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: 'Please enter your full name.' })
  @MaxLength(80)
  fullName!: string;

  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Your SyncDocs password must be at least 8 characters.' })
  @MaxLength(128)
  password!: string;

  @IsString()
  confirmPassword!: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Please enter your SyncDocs password.' })
  password!: string;
}
