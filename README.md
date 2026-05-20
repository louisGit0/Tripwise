# Tripwise

Application de calcul du coût d'un trajet voiture — essence ou électrique — entre deux points.
Disponible en web (Next.js) et mobile (Expo React Native) avec un backend NestJS commun.

---

## Fonctionnalités

- **Calcul de coût** : départ + arrivée via autocomplétion Mapbox, calcul de distance, durée et coût réel selon le carburant du véhicule
- **Véhicules multiples** : gérez plusieurs voitures (thermique ou électrique) avec consommation individuelle
- **Prix en temps réel** : essence/diesel via prix-carburants.gouv.fr, bornes via la base IRVE nationale
- **Favoris** : sauvegardez et réutilisez vos trajets fréquents
- **Partage** : partagez le résultat en un clic (web : clipboard / Share API, mobile : Share natif)
- **Multilingue** : Français et Anglais (i18n complet)
- **Thème** : light / dark mode sur web et mobile

---

## Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Backend | NestJS + TypeScript strict | 11 |
| Base de données | PostgreSQL + TypeORM | 16 / 1.x |
| Web | Next.js App Router + Tailwind CSS | 16 |
| Mobile | Expo + React Native | SDK 54 / 0.81 |
| Types partagés | Package TypeScript pur | — |
| Infra | Docker Compose | — |

---

## Prérequis

| Outil | Version minimale | Lien |
|-------|-----------------|------|
| Node.js | 20 LTS | https://nodejs.org |
| Docker Desktop | 4.x | https://docker.com |
| Expo CLI / EAS CLI | latest | `npm i -g expo-cli eas-cli` |
| Compte Mapbox | gratuit (100k req/mois) | https://account.mapbox.com |
| Google Cloud Console | pour OAuth Google | https://console.cloud.google.com |
| Apple Developer Program | 99 $/an — pour Sign In with Apple iOS | https://developer.apple.com |

> **Note :** Mapbox et Google sont obligatoires pour un fonctionnement complet. Apple est requis uniquement pour publier sur l'App Store avec Sign In with Apple.

---

## Structure du monorepo

```
Tripwise/
├── backend/                NestJS API REST (port 3000)
│   ├── src/
│   │   ├── auth/           Authentification : email, Google, Apple + JWT
│   │   ├── users/          Comptes utilisateurs
│   │   ├── vehicles/       Véhicules (catalogue + véhicules utilisateur)
│   │   ├── trips/          Calcul de trajet + proxy geocode Mapbox
│   │   ├── favorites/      Favoris CRUD
│   │   ├── fuel-prices/    Prix carburants (Opendatasoft, cache 1h)
│   │   ├── charging-stations/ Bornes IRVE (Opendatasoft, cache 1h)
│   │   └── mapbox/         MapboxService @Global (geocode + directions)
│   └── test/               Tests e2e (SQLite in-memory, 96 tests)
├── web/                    Next.js 16 App Router (port 3001)
│   └── src/app/
│       ├── (auth)/         /login, /register, callbacks OAuth
│       └── app/            /dashboard, /vehicles, /favorites, /settings
├── mobile/                 Expo SDK 54 + React Native 0.81
│   └── app/
│       ├── (auth)/         login, register
│       └── (tabs)/         dashboard, vehicles, favorites, settings
├── shared/                 Types TypeScript partagés (@tripwise/shared)
├── docker-compose.yml      postgres 16 + pgAdmin + backend NestJS
├── package.json            Scripts monorepo (concurrently)
└── README.md
```

---

## Installation pas à pas

### 1. Cloner le dépôt

```bash
git clone <repo-url>
cd Tripwise
```

### 2. Variables d'environnement

```bash
# Backend
cp backend/.env.example backend/.env

# Web
cp web/.env.example web/.env.local

# Mobile
cp mobile/.env.example mobile/.env
```

Renseignez les valeurs dans chaque fichier (voir section **Variables d'environnement** ci-dessous).

### 3. Installer les dépendances

```bash
# Depuis la racine (installe les 3 packages en une commande)
npm run setup

# Ou manuellement :
npm install --prefix backend
npm install --prefix web
npm install --prefix mobile
```

### 4. Démarrer l'infrastructure (PostgreSQL + backend)

```bash
docker compose up -d
```

Services lancés :

| Service | URL |
|---------|-----|
| Backend API | http://localhost:3000/api/v1 |
| Health check | http://localhost:3000/api/v1/health |
| pgAdmin | http://localhost:5050 |
| PostgreSQL | localhost:5432 |

### 5. Appliquer les migrations et le seed

```bash
# Migrations (crée les tables)
npm run db:migrate

# Seed (insère le catalogue de 41 véhicules — idempotent)
cd backend && npx ts-node -r tsconfig-paths/register src/seeds/vehicle-models.seed.ts
```

### 6. Lancer le frontend web

```bash
# Option A — via la racine (lance backend + web ensemble)
npm run dev

# Option B — indépendant
cd web && npm run dev
# → http://localhost:3001
```

### 7. Lancer l'application mobile

```bash
cd mobile
npx expo start
# Scannez le QR code avec Expo Go (sans carte Mapbox)
# — ou —
eas build --profile development --platform ios  # pour la carte Mapbox
```

> **Expo Go** : la carte Mapbox ne s'affiche pas (placeholder informatif à la place). Utilisez un **dev build EAS** pour avoir la carte native.

---

## Variables d'environnement

### `backend/.env`

| Variable | Description | Obligatoire |
|----------|-------------|-------------|
| `DB_HOST` | Hôte PostgreSQL | oui |
| `DB_PORT` | Port PostgreSQL (défaut : 5432) | oui |
| `DB_USERNAME` | Utilisateur PostgreSQL | oui |
| `DB_PASSWORD` | Mot de passe PostgreSQL | oui |
| `DB_NAME` | Nom de la base | oui |
| `JWT_SECRET` | Clé secrète JWT (≥ 64 chars en prod) | oui |
| `MAPBOX_TOKEN` | Token Mapbox (Directions + Geocoding) | oui |
| `CORS_ORIGINS` | Origines autorisées, séparées par virgule | oui |
| `GOOGLE_OAUTH_CLIENT_ID` | Client ID Google Cloud OAuth 2.0 | non* |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Secret Google Cloud OAuth 2.0 | non* |
| `GOOGLE_OAUTH_CALLBACK_URL` | URL de callback Google | non* |
| `APPLE_OAUTH_CLIENT_ID` | Service ID Apple | non* |
| `APPLE_OAUTH_TEAM_ID` | Team ID Apple Developer | non* |
| `APPLE_OAUTH_KEY_ID` | Key ID Apple (.p8) | non* |
| `APPLE_OAUTH_PRIVATE_KEY` | Contenu de la clé privée .p8 | non* |
| `APPLE_OAUTH_CALLBACK_URL` | URL de callback Apple | non* |

*Non obligatoire en local si vous n'utilisez pas le login OAuth correspondant.

### `web/.env.local`

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | URL du backend NestJS |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Token Mapbox public (visible dans le bundle) |

### `mobile/.env`

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | URL du backend NestJS |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Token Mapbox public (runtime) |
| `MAPBOX_DOWNLOAD_TOKEN` | Token Mapbox secret (build-time EAS uniquement) |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Client ID Google pour expo-auth-session |

---

## Commandes utiles

### Backend

```bash
cd backend

npm run start:dev          # Démarrage hot-reload (sans Docker)
npm run build              # Compilation TypeScript → dist/
npm run test               # Tests unitaires Jest
npm run test:e2e           # Tests e2e (SQLite in-memory, sans PG)
npm run lint               # ESLint + fix
npm run format             # Prettier

npm run migration:generate -- src/database/migrations/NomMigration
npm run migration:run
npm run migration:revert
```

### Web

```bash
cd web
npm run dev                # http://localhost:3001
npm run build              # Build production Next.js
npm run lint               # ESLint via next lint
npm run format             # Prettier
npm run type-check         # tsc --noEmit
```

### Mobile

```bash
cd mobile
npx expo start             # Expo Go (sans carte)
npm run ios                # Simulateur iOS
npm run build:preview      # EAS build iOS simulateur
npm run build:prod         # EAS build production (iOS + Android)
npm run lint               # expo lint
npm run type-check         # tsc --noEmit
```

### Monorepo (racine)

```bash
npm run dev                # backend + web en parallèle (concurrently)
npm run dev:all            # backend + web + mobile
npm run build              # Build backend + web
npm run test               # Tests unitaires backend
npm run test:e2e           # Tests e2e backend
npm run lint               # Lint tous les packages
npm run db:up              # Lance seulement PostgreSQL (Docker)
npm run db:migrate         # Applique les migrations
```

---

## Sécurité

- **JWT** : tokens signés HS256, durée 7 jours, stockés dans `httpOnly cookie` (web) et `expo-secure-store` (mobile)
- **Rate limiting** : 100 req/min par IP sur tous les endpoints, réduit à **5 req/min** sur `/auth/login` et `/auth/register`
- **CORS** : restreint aux domaines listés dans `CORS_ORIGINS`
- **Helmet** : headers HTTP de sécurité activés
- **Validation** : `class-validator` + `whitelist: true` sur tous les DTOs

---

## Tests

```bash
cd backend

# 19 tests unitaires (TripsService — calcul coût carburant + électrique)
npx jest --testPathPatterns="trips.service.spec" --no-coverage

# 96 tests e2e (7 suites : app, auth, vehicles, trips, favorites, fuel-prices, charging-stations)
npx jest --config test/jest-e2e.json --forceExit
```

---

## Limitations connues

| Limitation | Détail |
|-----------|--------|
| **Carte Mapbox — Expo Go** | `@rnmapbox/maps` incompatible Expo Go → placeholder affiché. Nécessite un dev build EAS. |
| **Apple Sign In** | Fonctionne uniquement sur device iOS physique en build de production. |
| **Token Mapbox public** | Visible dans le bundle JS/mobile — normal pour mapbox-gl. À restreindre aux domaines/app IDs autorisés dans le dashboard Mapbox. |
| **Prix IRVE** | La base nationale IRVE ne contient pas les tarifs de recharge — seuls les prix configurés dans le profil véhicule sont utilisés. |
| **Apple OAuth HTTPS** | Apple Sign In web exige un domaine HTTPS enregistré — localhost ne fonctionne pas en production. |
| **Péages** | Non inclus dans le calcul de coût (roadmap). |

---

## Roadmap

Voir [ROADMAP.md](./ROADMAP.md) pour le détail des évolutions prévues.

---

## APIs externes — liens directs

| API | Documentation | Quota gratuit |
|-----|--------------|---------------|
| Mapbox Geocoding v5 | https://docs.mapbox.com/api/search/geocoding/ | ~100k req/mois |
| Mapbox Directions v5 | https://docs.mapbox.com/api/navigation/directions/ | ~100k req/mois |
| Prix carburants (Opendatasoft) | https://data.economie.gouv.fr | Illimité — données publiques |
| IRVE bornes recharge | https://odre.opendatasoft.com | Illimité — données publiques |

---

## Licence

Projet personnel — tous droits réservés.  
Contact : louissoudy2@gmail.com
