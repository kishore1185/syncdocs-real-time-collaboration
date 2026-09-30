import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { Types } from 'mongoose';

/** Rejects malformed ids before they reach Mongoose (avoids CastError 500s). */
@Injectable()
export class ObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !Types.ObjectId.isValid(value) || String(new Types.ObjectId(value)) !== value) {
      throw new BadRequestException('That link does not look valid.');
    }
    return value;
  }
}
