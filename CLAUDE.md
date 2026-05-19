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

## Journal des décisions & mises à jour

### 2026-05-19 — Initialisation du projet
- Création de la structure monorepo (backend, web, mobile, shared)
- Stack décidée : NestJS + PostgreSQL + Next.js 14 + Expo
- APIs externes identifiées : Mapbox, prix-carburants.gouv.fr, IRVE
- ORM choisi : TypeORM (via @nestjs/typeorm)
- Dépôt git initialisé avec commit initial

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
