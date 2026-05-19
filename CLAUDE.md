# CLAUDE.md — Mémoire persistante du projet Tripwise

> Ce fichier est destiné à l'IA (Claude Code) pour maintenir le contexte entre les sessions.
> Il est mis à jour à chaque décision technique ou évolution significative du projet.

---

## Projet

**Nom :** Tripwise
**Description :** Application de calcul du coût d'un trajet voiture (essence ou électricité) entre deux points. Exposée en web et mobile, avec un backend commun.
**Propriétaire :** louissoudy2@gmail.com
**Démarrage :** 2026-05-19

---

## Stack technique

### Backend
- Runtime : Node.js (LTS)
- Framework : NestJS (TypeScript strict)
- Base de données : PostgreSQL
- ORM : TypeORM v1 (installé via @nestjs/typeorm v11)
- Conteneurisation : Docker + Docker Compose

### Frontend Web
- Framework : Next.js 14+ (App Router)
- Langage : TypeScript strict
- UI : React + Tailwind CSS
- Rendu : SSR / RSC selon la page

### Mobile
- Framework : Expo (SDK latest) + React Native
- Langage : TypeScript strict
- Navigation : Expo Router (file-based)

### Shared
- Package TypeScript partagé contenant les types communs (DTOs, modèles, enums)
- Référencé en workspace depuis backend, web et mobile

### Infra
- Docker Compose : backend NestJS + PostgreSQL (+ Redis si besoin)
- Déploiement web : à définir (Vercel probable)
- Déploiement mobile : Expo EAS

---

## Architecture & structure des dossiers

```
Tripwise/
├── backend/          NestJS API REST (+ WebSocket si besoin)
├── web/              Next.js 14 App Router
├── mobile/           Expo React Native
├── shared/           Types TypeScript partagés (DTOs, enums, modèles)
├── docker-compose.yml
├── .gitignore
├── README.md
└── CLAUDE.md
```

### Conventions de nommage
- Dossiers : kebab-case
- Fichiers TypeScript : kebab-case pour les modules, PascalCase pour les composants React/RN
- Variables/fonctions : camelCase
- Classes/interfaces/types : PascalCase
- Constantes globales : SCREAMING_SNAKE_CASE

---

## APIs externes

| API | Usage | URL |
|-----|-------|-----|
| Mapbox Directions API | Calcul d'itinéraire, distance, durée | https://docs.mapbox.com/api/navigation/directions/ |
| prix-carburants.gouv.fr | Prix des carburants en France (essence, diesel, GPL…) | https://data.prix-carburants.gouv.fr |
| IRVE (data.gouv.fr) | Infrastructure de Recharge pour Véhicules Électriques | https://www.data.gouv.fr/fr/datasets/fichier-consolide-des-bornes-de-recharge-pour-vehicules-electriques/ |

---

## Fonctionnalités V1

### Authentification
- Email + mot de passe
- OAuth Google
- OAuth Apple (obligatoire iOS)
- JWT (access + refresh tokens)

### Gestion des véhicules
- Plusieurs véhicules par utilisateur
- Types : thermique (essence/diesel/GPL) et électrique
- Champs : nom, marque, modèle, type de carburant, consommation moyenne

### Calcul de trajet
- Saisie d'un départ et d'une arrivée (autocomplétion via Mapbox)
- Calcul de la distance et durée via Mapbox Directions
- Calcul du coût : distance × consommation × prix du carburant (ou kWh)
- Résultat affiché sur web et mobile

### Favoris
- Sauvegarde d'un trajet en favori
- Liste des favoris par utilisateur

### Partage
- Partage natif du résultat (Share API web + React Native Share)

### Internationalisation
- Langues : Français (défaut) + Anglais
- i18n côté web (next-intl ou next-i18next) et mobile (i18n-js ou expo-localization)

### UI/UX
- Light mode et Dark mode (système ou manuel)
- Couleur dominante : bleu
- Design system : Tailwind (web) + StyleSheet/NativeWind (mobile)

---

## Hors scope V1 (roadmap future)

- Calcul des péages (API Mappy / Ici)
- Historique automatique des trajets (géolocalisation background)
- Multi-devises (pour trajets internationaux)
- Comparateur de véhicules
- Covoiturage / partage de coût entre utilisateurs

---

## Conventions de code

- TypeScript strict (`"strict": true` dans tous les tsconfig)
- ESLint configuré (règles NestJS + React + Expo selon le package)
- Prettier avec configuration commune à la racine
- Pas de `any` implicite
- Pas de `console.log` en production (eslint no-console)
- Tests : Jest (backend), React Testing Library (web), à définir (mobile)

---

## Backend — Commandes utiles

### Démarrage en local (sans Docker)
```bash
cd backend
cp .env.example .env   # remplir les valeurs
npm run start:dev      # hot-reload via NestJS watch
```

### Démarrage via Docker Compose (recommandé)
```bash
# Depuis la racine du projet :
cp backend/.env.example backend/.env   # remplir les valeurs
docker compose up -d                   # lance postgres + pgadmin + backend
docker compose logs -f backend         # suivre les logs
```

Services exposés :
| Service | URL |
|---------|-----|
| Backend API | http://localhost:3000/api/v1 |
| Health check | http://localhost:3000/api/v1/health |
| pgAdmin | http://localhost:5050 (admin@tripwise.local / admin) |
| PostgreSQL | localhost:5432 |

### Migrations TypeORM
```bash
cd backend

# Générer une migration depuis les entités
npm run migration:generate -- src/database/migrations/NomDeLaMigration

# Appliquer les migrations
npm run migration:run

# Annuler la dernière migration
npm run migration:revert

# Lister l'état des migrations
npm run migration:show
```

### Modules NestJS créés (V1 squelettes)
| Module | Rôle |
|--------|------|
| `auth` | Authentification (email, Google, Apple), JWT |
| `users` | Gestion des comptes utilisateurs |
| `vehicles` | Véhicules thermiques et électriques par utilisateur |
| `trips` | Calcul de trajet (distance, durée, coût) |
| `favorites` | Sauvegarde de trajets favoris |
| `fuel-prices` | Récupération des prix carburants (prix-carburants.gouv.fr) |
| `charging-stations` | Bornes de recharge (IRVE / data.gouv.fr) |

Chaque module dispose d'un controller et d'un service vide, prêts à être implémentés.

### Seed — catalogue de véhicules
```bash
cd backend

# Prérequis : DB lancée et migrations appliquées
npm run migration:run

# Insérer les 41 véhicules initiaux (idempotent : ignoré si la table est non vide)
npx ts-node -r tsconfig-paths/register src/seeds/vehicle-models.seed.ts
```

### Entités TypeORM créées
| Entité | Fichier | Table SQL |
|--------|---------|-----------|
| `User` | `users/entities/user.entity.ts` | `users` |
| `VehicleModel` | `vehicles/entities/vehicle-model.entity.ts` | `vehicle_models` |
| `UserVehicle` | `vehicles/entities/user-vehicle.entity.ts` | `user_vehicles` |
| `Favorite` | `favorites/entities/favorite.entity.ts` | `favorites` |

Relations :
- `User` → `UserVehicle` : OneToMany (cascade delete)
- `User` → `Favorite` : OneToMany (cascade delete)
- `UserVehicle` → `VehicleModel` : ManyToOne (eager)
- `Favorite` → `UserVehicle` : ManyToOne nullable (SET NULL on delete)

Migration initiale : `src/database/migrations/1747699200000-InitialSchema.ts`

---

## Vehicles — Endpoints

### Catalogue (public)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/v1/vehicles/catalog` | Liste paginée de VehicleModel. Query : `search` (brand+model), `fuelType`, `page`, `limit` |
| GET | `/api/v1/vehicles/catalog/:id` | Détail d'un VehicleModel |

### Véhicules utilisateur (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/v1/vehicles/me` | Liste les UserVehicle de l'utilisateur (avec VehicleModel) |
| POST | `/api/v1/vehicles/me` | Ajoute un véhicule. Body : `{ vehicleModelId, nickname?, homeElectricityPrice?, publicChargingPrice? }` |
| PATCH | `/api/v1/vehicles/me/:id` | Modifie nickname ou tarifs électricité |
| DELETE | `/api/v1/vehicles/me/:id` | Supprime (204) |

### Règles métier
- Véhicule **ELECTRIC** : `homeElectricityPrice` et `publicChargingPrice` requis à la création (> 0)
- Véhicule **non-ELECTRIC** : ces deux champs sont forcés à `null` côté service
- 403 si on tente de modifier/supprimer un véhicule appartenant à un autre utilisateur

### Tests e2e
```bash
npx jest --config test/jest-e2e.json --testPathPatterns="vehicles" --forceExit
# 20 tests
```

---

## Auth — Endpoints & configuration

### Endpoints disponibles

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/v1/auth/register` | Non | Création compte local (email + password) |
| POST | `/api/v1/auth/login` | Non | Connexion locale |
| GET | `/api/v1/auth/google` | Non | Redirection vers Google OAuth |
| GET | `/api/v1/auth/google/callback` | Non | Callback Google → JWT |
| GET | `/api/v1/auth/apple` | Non | Redirection vers Apple Sign In |
| GET | `/api/v1/auth/apple/callback` | Non | Callback Apple → JWT |
| GET | `/api/v1/auth/me` | JWT Bearer | Profil utilisateur connecté |

### JWT
- Payload : `{ sub: userId, email, provider }`
- Durée : 7 jours (configurable via `JWT_REFRESH_EXPIRES_IN`)
- Secret : `JWT_SECRET` (obligatoire, ≥ 64 caractères en production)
- Utilisation : `Authorization: Bearer <token>`

### Guard et décorateur réutilisables
```typescript
// Protéger un endpoint
@UseGuards(JwtAuthGuard)
@Get('mon-endpoint')
maRoute(@CurrentUser() user: User) { ... }
```

### Configuration Google OAuth
Pour activer `GET /auth/google` :
1. Créer un projet sur Google Cloud Console
2. Activer l'API "Google+ API" ou "Google Identity"
3. Créer des identifiants OAuth 2.0 (type : "Application Web")
4. Ajouter les URIs de redirection autorisées : `http://localhost:3000/api/v1/auth/google/callback`
5. Renseigner dans `.env` : `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_CALLBACK_URL`

### Configuration Apple Sign In
Pour activer `GET /auth/apple` :
1. Disposer d'un compte Apple Developer Program (99 $/an)
2. Dans App Store Connect → Certificats, identifiants et profils :
   - Créer un **Service ID** (ex: `com.yourapp.web`) → c'est le `APPLE_OAUTH_CLIENT_ID`
   - Activer "Sign In with Apple" sur ce Service ID
   - Enregistrer l'URL de callback : `https://votre-domaine.com/api/v1/auth/apple/callback`
     ⚠️ Apple exige HTTPS et un domaine enregistré — localhost ne fonctionne pas en production
   - Créer une **clé privée** (.p8) avec Sign In with Apple activé → donne `APPLE_OAUTH_KEY_ID`
3. Récupérer le **Team ID** depuis la page Account → Membership
4. Renseigner dans `.env` : `APPLE_OAUTH_CLIENT_ID`, `APPLE_OAUTH_TEAM_ID`, `APPLE_OAUTH_KEY_ID`, `APPLE_OAUTH_PRIVATE_KEY`, `APPLE_OAUTH_CALLBACK_URL`

**Note :** Apple Sign In ne renvoie l'email qu'au premier login. Les logins suivants ne contiennent que le `sub` (identifiant Apple unique). Le backend gère ce cas via `idToken.sub`.

### Tests e2e
```bash
cd backend

# Lancer les tests auth (SQLite en mémoire, sans Docker)
npx jest --config test/jest-e2e.json --testPathPatterns="auth" --forceExit

# 11 tests : register, login, /auth/me, validations DTO, cas d'erreur
```

---

## Journal des décisions & mises à jour

### 2026-05-19 — Initialisation du projet
- Création de la structure monorepo (backend, web, mobile, shared)
- Stack décidée : NestJS + PostgreSQL + Next.js 14 + Expo
- APIs externes identifiées : Mapbox, prix-carburants.gouv.fr, IRVE
- ORM choisi : TypeORM (via @nestjs/typeorm)
- Dépôt git initialisé avec commit initial

### 2026-05-19 — Module Auth complet
- Stratégies Passport : local (email/password), JWT, Google OAuth 2.0, Apple Sign In
- Dépendances : @nestjs/jwt, @nestjs/passport, passport, passport-local, passport-jwt, passport-google-oauth20, passport-apple, bcrypt
- DTOs : RegisterDto (email valide, password ≥8 chars + 1 chiffre), LoginDto
- AuthService : register (bcrypt salt 12), validateLocalUser, login, findOrCreateOAuthUser (liaison compte si email existant)
- JwtAuthGuard + @CurrentUser() decorator réutilisables
- GET /auth/me protégé — retourne profil sans passwordHash
- Logique liaison : si email OAuth existe déjà en local → linkOAuthProvider (pas de doublon)
- simple-enum utilisé dans les entités (compatible SQLite pour tests, migration PG utilise native enum)
- Tests e2e : 11 tests (register, login, /me, validations, cas d'erreur) — SQLite in-memory + mock OAuth

### 2026-05-19 — Module Vehicles
- VehiclesService : findCatalog (recherche LIKE brand+model, filtre fuelType, pagination), findOneModel, findUserVehicles, addUserVehicle, updateUserVehicle, removeUserVehicle
- Validation métier : électrique → homeElectricityPrice et publicChargingPrice requis ; thermique → ces champs forcés à null
- 403 ForbiddenException si userId ne correspond pas au propriétaire du UserVehicle
- relations TypeORM v1 : objet `{ vehicleModel: true }` (pas tableau)
- Tests e2e : 20/20 (catalogue, CRUD, 403, 404, validations, auth)
- app.e2e-spec.ts remplacé par un test health-check (SQLite, sans PG)
- Suite e2e complète : 32/32 tests passent (3 suites : app, auth, vehicles)

### 2026-05-19 — Entités TypeORM et migration initiale
- Entités créées : User, VehicleModel, UserVehicle, Favorite
- Enums : AuthProvider (local/google/apple), FuelType (SP95/SP95_E10/SP98/DIESEL/E85/GPL/ELECTRIC)
- Migration manuelle : 1747699200000-InitialSchema.ts (SQL explicite, up + down)
- Seed : 41 véhicules courants en France avec consommations indicatives WLTP (src/seeds/vehicle-models.seed.ts)
- Correction : définite assignment assertions (!) sur toutes les propriétés d'entités (strict TS)
- Note : migration:generate nécessite une DB active — préférer la migration manuelle en CI/CD sans DB

### 2026-05-19 — Scaffold backend NestJS
- NestJS scaffoldé avec @nestjs/cli
- Dépendances installées : @nestjs/config, @nestjs/typeorm, typeorm, pg, class-validator, class-transformer, helmet, dotenv
- TypeScript strict activé (strict: true)
- main.ts configuré : helmet, CORS, ValidationPipe global, logger
- app.module.ts : ConfigModule global + TypeOrmModule async (synchronize: false)
- src/config/database.config.ts et app.config.ts (registerAs)
- src/database/data-source.ts pour la CLI TypeORM
- src/health/health.controller.ts → GET /api/v1/health → { status: 'ok', timestamp }
- 7 modules créés avec controller + service vides : auth, users, vehicles, trips, favorites, fuel-prices, charging-stations
- backend/Dockerfile : multi-stage Node 20 Alpine (build → runner)
- docker-compose.yml : postgres 16 + pgadmin (port 5050) + backend (port 3000)
- .env.example créé avec toutes les variables (DB, JWT, Mapbox, Google OAuth, Apple OAuth, CORS)
