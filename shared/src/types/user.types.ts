import { AuthProvider } from '../enums/index.js';

/** Profil utilisateur exposé par l'API (sans passwordHash). */
export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  locale: string;
  provider: AuthProvider;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserProfile;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
