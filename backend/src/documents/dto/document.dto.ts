import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;
}

export class RenameDocumentDto {
  @IsString()
  @MinLength(1, { message: 'Please give the document a title.' })
  @MaxLength(160)
  title!: string;
}

export class JoinRoomDto {
  @IsString()
  @Matches(/^SYNC-[A-Z0-9]{6}$/i, { message: 'Room IDs look like SYNC-A7K29P.' })
  roomId!: string;
}
