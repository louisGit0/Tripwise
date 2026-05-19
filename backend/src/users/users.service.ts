import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, AuthProvider } from './entities/user.entity';

interface CreateUserData {
  email: string;
  passwordHash: string | null;
  displayName?: string | null;
  provider: AuthProvider;
  providerId?: string;
}

interface LinkOAuthData {
  provider: AuthProvider;
  providerId: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.userRepo.findOneBy({ id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOneBy({ email });
  }

  create(data: CreateUserData): Promise<User> {
    const user = this.userRepo.create({
      email: data.email,
      passwordHash: data.passwordHash,
      displayName: data.displayName ?? null,
      provider: data.provider,
      providerId: data.providerId ?? null,
    });
    return this.userRepo.save(user);
  }

  async linkOAuthProvider(userId: string, data: LinkOAuthData): Promise<User> {
    await this.userRepo.update(userId, {
      provider: data.provider,
      providerId: data.providerId,
    });
    return this.userRepo.findOneByOrFail({ id: userId });
  }
}
