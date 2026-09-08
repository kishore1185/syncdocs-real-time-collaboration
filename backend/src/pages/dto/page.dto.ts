import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdatePageContentDto {
  /** Rendered HTML snapshot of the page. */
  @IsString()
  @MaxLength(2_000_000, { message: 'This page is too large to save.' })
  content!: string;

  /** Base64-encoded Yjs update (optional, for CRDT recovery). */
  @IsOptional()
  @IsString()
  ystate?: string;
}

export class LockPageDto {
  @IsString()
  @MinLength(4, { message: 'Lock passwords must be at least 4 characters.' })
  @MaxLength(128)
  password!: string;
}

export class UnlockPageDto {
  @IsString()
  @MinLength(1, { message: 'Please enter the lock password.' })
  @MaxLength(128)
  password!: string;
}
