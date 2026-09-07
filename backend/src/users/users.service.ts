import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
}

export const toPublicUser = (user: UserDocument): PublicUser => ({
  id: user._id.toString(),
  fullName: user.fullName,
  email: user.email,
});

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  findById(id: string | Types.ObjectId) {
    return this.userModel.findById(id).exec();
  }

  findManyByIds(ids: Types.ObjectId[]) {
    return this.userModel.find({ _id: { $in: ids } }).exec();
  }

  create(data: { fullName: string; email: string; passwordHash: string }) {
    return this.userModel.create({ ...data, email: data.email.toLowerCase().trim() });
  }

  async search(term: string, limit = 10): Promise<PublicUser[]> {
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const users = await this.userModel
      .find({ $or: [{ fullName: rx }, { email: rx }] })
      .limit(limit)
      .exec();
    return users.map(toPublicUser);
  }
}
