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

  findByProviderId(provider: AuthProvider, providerId: string): Promise<User | null> {
    return this.userRepo.findOneBy({ provider, providerId });
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

  /**
   * Met à jour le pseudo (display_name) de l'utilisateur courant uniquement.
   * Prend l'id de l'utilisateur authentifié et le nouveau pseudo — jamais un id
   * arbitraire (protection IDOR : l'appelant ne passe que @CurrentUser().id).
   */
  async updateProfile(userId: string, displayName: string): Promise<User> {
    await this.userRepo.update(userId, { displayName });
    return this.userRepo.findOneByOrFail({ id: userId });
  }

  /**
   * Supprime définitivement le compte de l'utilisateur courant et toutes ses
   * données liées. Les FK `user_vehicles.user_id`, `favorites.user_id` et
   * `trips.user_id` sont en `onDelete: CASCADE` → un seul DELETE sur `users`
   * efface en cascade véhicules, favoris et trajets.
   *
   * Exigé par Apple (App Store Guideline 5.1.1 (v)) : toute app proposant la
   * création de compte / Sign in with Apple DOIT offrir la suppression de compte
   * dans l'app. Prend l'id de @CurrentUser() — jamais un id arbitraire (IDOR-safe).
   */
  async deleteAccount(userId: string): Promise<void> {
    await this.userRepo.delete(userId);
  }
}
