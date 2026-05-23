import type { AuthProvider } from '../enums/index';

/** Profil utilisateur exposé par l'API */
export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  locale: string;
  provider: AuthProvider;
  createdAt: string;
}

/** Corps de la requête de connexion */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Corps de la requête d'inscription */
export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}

/** Réponse renvoyée après une authentification réussie */
export interface AuthResponse {
  accessToken: string;
  user: UserProfile;
}
