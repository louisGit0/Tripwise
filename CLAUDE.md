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
- Package TypeScript partagé : `shared/` à la racine du monorepo
- Exporte : enums (FuelType, AuthProvider, ChargingMode), interfaces (UserProfile, UserVehicle, Favorite, TripResult, etc.)
- Aucune dépendance framework — TypeScript pur
- Référencé via path alias `@tripwise/shared` dans backend/tsconfig.json
- Frontend/mobile peuvent l'importer directement (chemin relatif ou workspace)

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

## Trips — Endpoints & Mapbox

### Endpoints (JWT requis sur tous)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/v1/trips/geocode?q=...&country=fr&limit=5` | Proxie l'autocomplétion Mapbox (évite d'exposer le token au frontend) |
| POST | `/api/v1/trips/calculate` | Calcule distance + durée + géométrie pour un trajet |

### Corps de POST /trips/calculate
```json
{
  "origin":      { "lat": 48.8566, "lng": 2.3522, "label": "Paris" },
  "destination": { "lat": 43.2965, "lng": 5.3698, "label": "Marseille" },
  "userVehicleId": "uuid"
}
```

### Corps de POST /trips/calculate (champs électrique)
```json
{
  "origin": ..., "destination": ..., "userVehicleId": "uuid",
  "chargingMode": "home" | "public" | "mix",
  "chargingMixRatio": 0.5
}
```
`chargingMode` optionnel pour les thermiques (ignoré). Défaut `"home"` pour les électriques.
`chargingMixRatio` : proportion de charge à domicile (0.0–1.0), uniquement pour `"mix"`.

### Réponse (véhicule thermique — avec cost)
```json
{
  "distance":  { "meters": 450000, "km": 450 },
  "duration":  { "seconds": 14400, "formatted": "4h" },
  "geometry":  { "type": "LineString", "coordinates": [...] },
  "waypoints": [...],
  "vehicle":   { "id", "nickname", "brand", "model", "fuelType", "consumption" },
  "cost": {
    "type": "fuel",
    "fuelType": "SP95_E10",
    "consumptionLitres": 24.3,
    "pricePerLitre": 1.754,
    "priceSource": {
      "originStation": { "stationName", "address", "price", "distanceKm", "source" },
      "destinationStation": { "stationName", "address", "price", "distanceKm", "source" },
      "source": "api"
    },
    "totalCost": 42.62
  }
}
```
- `source` peut être `"api"` (données Opendatasoft) ou `"fallback"` (prix moyens hardcodés)

### Réponse (véhicule électrique — avec cost)
```json
{
  "distance": ..., "duration": ..., "geometry": ..., "waypoints": ..., "vehicle": ...,
  "cost": {
    "type": "electric",
    "consumptionKwh": 67.05,
    "pricePerKwh": 0.2272,
    "chargingMode": "home",
    "totalCost": 15.23,
    "nearbyStations": [ ...max 20 bornes le long du trajet... ],
    "disclaimer": "Les tarifs affichés sont ceux configurés dans votre profil véhicule. Le coût réel sur une borne publique peut différer."
  }
}
```

### Configuration Mapbox
- Token : `MAPBOX_TOKEN` dans `.env`
- Créer/copier sur **https://account.mapbox.com** → "Access tokens"
- Quota indicatif plan gratuit : ~100 000 req/mois (Geocoding et Directions)
  — **à vérifier dans le dashboard Mapbox**, les limites peuvent évoluer
- Le `MapboxService` est déclaré `@Global()` : disponible dans tous les modules sans ré-import

### Tests e2e
```bash
npx jest --config test/jest-e2e.json --testPathPatterns="trips" --forceExit
# 30 tests (MapboxService + FuelPricesService + ChargingStationsService entièrement mockés)
```

---

## Charging Stations — Endpoints & API

### Endpoints (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/v1/charging-stations/nearby?lat=...&lng=...&radius=5` | Bornes dans un rayon (défaut 5 km, max 50 km) |
| POST | `/api/v1/charging-stations/along-route` | Bornes à moins de `maxDistanceMeters` (défaut 2000 m) d'un itinéraire |

### Corps POST /along-route
```json
{
  "geometry": { "type": "LineString", "coordinates": [[lng, lat], ...] },
  "maxDistanceMeters": 2000
}
```

### Réponse (tableau de bornes)
```json
[{
  "id": "FR*VER*E123",
  "name": "Supercharger Paris",
  "operator": "Tesla",
  "address": "20 Bd Diderot, Paris",
  "lat": 48.8448,
  "lng": 2.3737,
  "powerKw": 250,
  "connectorTypes": ["CCS"],
  "openingHours": "24/7",
  "isFreeAccess": false,
  "distanceKm": 1.2
}]
```

⚠️ **La base IRVE ne contient PAS les tarifs** — uniquement localisation, puissance, connecteurs.

### Source des données IRVE
- **Dataset** : Base nationale des IRVE — publié sur data.gouv.fr
- **API** : `https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/bornes-irve/records`
- **Filtre géo** : `within_distance(coordonneesXY, geom'POINT(lng lat)', Xkm)`
- **Pas de clé API** requise
- **Volume** : ~42 000 points de charge, ~18 500 stations (vérifié le 2026-05-20)
- **Schema** : https://schema.data.gouv.fr/etalab/schema-irve-statique/
- **Cache in-memory** : TTL 1h, clé `lat:lng:radius`
- Algorithme along-route : échantillonne ≤10 points de la LineString, requête API par point, déduplique par `id_pdc_itinerance`

### Tests e2e
```bash
npx jest --config test/jest-e2e.json --testPathPatterns="charging-stations" --forceExit
# 10 tests (ChargingStationsService entièrement mocké)
```

---

## Fuel Prices — Endpoints & API

### Endpoint (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/v1/fuel-prices/nearest?lat=...&lng=...&fuelType=...` | Station la plus proche avec prix actuel pour le carburant demandé |

### Paramètres
- `lat`, `lng` : coordonnées WGS84 (float)
- `fuelType` : un de `SP95 | SP95_E10 | SP98 | DIESEL | E85 | GPL` (`ELECTRIC` rejeté → 400)

### Réponse
```json
{
  "stationName": "Total Paris",
  "address": "1 rue de Rivoli, Paris",
  "price": 1.749,
  "lastUpdate": "2024-01-01T00:00:00.000Z",
  "distanceKm": 0.3,
  "source": "api"
}
```

### API primaire (Opendatasoft)
- **URL** : `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records`
- Filtre géographique : `distance(geom, geom'POINT(lng lat)', 20km)`
- Prix retournés en millièmes d'euro (ex : `1750` → `1.750 €/L`)
- Mise à jour toutes les 10 minutes
- Timeout : 8 secondes

### Prix de repli (fallback hardcodés)
Utilisés si l'API est indisponible ou retourne 0 résultat :
| Carburant | Prix €/L |
|-----------|----------|
| SP95 | 1.75 |
| SP95_E10 | 1.72 |
| SP98 | 1.85 |
| DIESEL | 1.68 |
| E85 | 0.88 |
| GPL | 0.92 |

### Cache en mémoire
- TTL : 1 heure
- Clé : `"lat:lng:fuelType:count"` (lat/lng arrondis à 4 décimales)
- Pas de Redis — simple `Map<string, CacheEntry>` en mémoire de processus

### Tests e2e
```bash
npx jest --config test/jest-e2e.json --testPathPatterns="fuel-prices" --forceExit
# 7 tests (FuelPricesService entièrement mocké)
```

---

## Favorites — Endpoints

### Endpoints (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/v1/favorites` | Liste des favoris de l'utilisateur (tri par date DESC) |
| GET | `/api/v1/favorites/:id` | Détail d'un favori |
| POST | `/api/v1/favorites` | Crée un favori |
| PATCH | `/api/v1/favorites/:id` | Modifie le nom |
| DELETE | `/api/v1/favorites/:id` | Supprime (204) |

### Corps de POST /favorites
```json
{
  "name": "Maison → Bureau",
  "originLabel": "Paris 12e",
  "originLat": 48.8448,
  "originLng": 2.3737,
  "destinationLabel": "La Défense",
  "destinationLat": 48.8921,
  "destinationLng": 2.2358,
  "vehicleId": "uuid"
}
```
`vehicleId` optionnel (référence à un UserVehicle).

### Règles métier
- 403 si le favori n'appartient pas à l'utilisateur connecté
- PATCH : seul le champ `name` est modifiable
- DELETE retourne 204 (no content)

### Tests e2e
```bash
npx jest --config test/jest-e2e.json --testPathPatterns="favorites" --forceExit
# 19 tests (I18nService @Optional → null en test, fallback sur la clé i18n)
```

---

## i18n — Internationalisation backend

### Configuration
- Librairie : `nestjs-i18n`
- Langue par défaut : `fr`
- Détection : `?lang=fr|en` (query param) ou header `Accept-Language`
- Fichiers de traduction : `src/i18n/fr/messages.json` et `src/i18n/en/messages.json`
- En production, les JSON sont copiés dans `dist/i18n/` via la config `assets` dans `nest-cli.json`

### Clés disponibles
- `messages.auth.*` — erreurs d'authentification
- `messages.favorites.*` — favoris (not_found, forbidden)
- `messages.vehicles.*` — véhicules (not_found, model_not_found, forbidden, electric_prices_required)
- `messages.trips.*` — trajets
- `messages.fuel_prices.*` — prix carburants
- `messages.validation.*` — validations DTO
- `messages.common.*` — erreurs génériques

### Utilisation dans un service
```typescript
// @Optional() permet au service de fonctionner sans I18nModule (tests)
constructor(@Optional() private readonly i18n: I18nService | null) {}

private async t(key: string, lang: string) {
  if (this.i18n) return this.i18n.translate<string>(key, { lang });
  return key; // fallback : retourne la clé brute
}
```

Le contrôleur détecte la langue depuis la requête et la passe au service :
```typescript
private detectLang(req: Request): string {
  const q = req.query['lang'];
  if (typeof q === 'string' && ['fr','en'].includes(q)) return q;
  const accept = req.headers['accept-language'];
  if (accept) { const l = accept.split(',')[0].split('-')[0]; if (['fr','en'].includes(l)) return l; }
  return 'fr';
}
```

---

## Shared Types

### Structure
```
shared/
├── package.json          @tripwise/shared, private, pas de build step
├── tsconfig.json         module: ESNext, moduleResolution: bundler
└── src/
    ├── index.ts          re-exporte tout
    ├── enums/
    │   └── index.ts      FuelType, AuthProvider, ChargingMode
    └── types/
        ├── user.types.ts    UserProfile, AuthResponse, LoginRequest, RegisterRequest
        ├── vehicle.types.ts VehicleModel, UserVehicle, AddVehicleRequest, ...
        ├── favorite.types.ts Favorite, CreateFavoriteRequest, UpdateFavoriteRequest
        └── trip.types.ts    TripCalculateRequest, TripResult, FuelCost, ElectricCost, ...
```

### Utilisation depuis le backend
Le path alias est configuré dans `backend/tsconfig.json` :
```json
"paths": {
  "@tripwise/shared": ["../shared/src/index.ts"],
  "@tripwise/shared/*": ["../shared/src/*"]
}
```

Et dans `backend/test/jest-e2e.json` (moduleNameMapper pour ts-jest).

### Utilisation depuis web/mobile
Importer directement via chemin relatif ou yarn/npm workspace :
```typescript
import { FuelType, TripResult } from '../../shared/src';
// ou avec workspace : import { FuelType } from '@tripwise/shared';
```

---

## Web — Frontend Next.js

### Démarrage
```bash
cd web
cp .env.example .env.local   # remplir les valeurs
npm run dev                  # http://localhost:3001 (ou 3000 si backend arrêté)
```

### Variables d'environnement
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | URL du backend NestJS (défaut : `http://localhost:3000/api/v1`) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Token Mapbox public (utilisé côté client par mapbox-gl) |

### ⚠️ Sécurité token Mapbox public
`NEXT_PUBLIC_MAPBOX_TOKEN` est visible dans le bundle JS client — c'est normal pour `mapbox-gl`.
Pour limiter l'abus, **restreindre ce token aux domaines autorisés** dans le dashboard Mapbox :
[account.mapbox.com](https://account.mapbox.com) → Access tokens → Token → URL restrictions
Ajouter les domaines : `http://localhost:3000`, `https://votre-domaine.com`

### Structure des pages
```
src/
├── middleware.ts               Middleware Next.js 15 — protège /app/*, redirige les authentifiés
├── i18n/request.ts            Détection locale via cookie
├── types/api.ts               Types TypeScript frontend (GeoPoint, UserVehicle, TripResult…)
├── hooks/useDebounce.ts       Hook debounce générique
├── lib/api.ts                 Axios (injecte JWT cookie, redirect 401→/login)
├── lib/auth.ts                register(), login(), logout()
├── providers/
│   ├── Providers.tsx          ThemeProvider + ToastProvider
│   └── ToastProvider.tsx      Context toast (success/error/info, 4s)
├── components/
│   ├── AutocompleteInput.tsx  Champ avec suggestions geocode (debounce 300ms)
│   ├── MapboxMap.tsx          Carte mapbox-gl (dynamic ssr:false) — route + bornes électriques
│   ├── AppNav.tsx             Navigation top (desktop) + bottom (mobile) — 4 onglets
│   ├── LogoutButton.tsx
│   └── ui/
│       ├── Button.tsx         (variant, size, loading)
│       ├── Input.tsx          (label, error, hint)
│       ├── Select.tsx         (options[], placeholder)
│       ├── Card.tsx           (padding: none|sm|md|lg)
│       └── Modal.tsx          (open, onClose, title, footer)
└── app/
    ├── globals.css            Variables CSS light/dark
    ├── layout.tsx             Root layout (Inter, Providers)
    ├── page.tsx               / — Landing
    ├── login/page.tsx         /login — Email + Google + Apple
    ├── register/page.tsx      /register — Email + Google + Apple
    ├── auth/callback/
    │   ├── google/page.tsx    Reçoit ?token=, set cookie, → /app/dashboard
    │   └── apple/page.tsx     Idem
    ├── api/auth/
    │   ├── set-cookie/route.ts  POST → httpOnly cookie 7j
    │   └── logout/route.ts      POST → delete cookie
    └── app/
        ├── layout.tsx           Layout authentifié (nav top + bottom mobile)
        ├── dashboard/page.tsx   Autocomplete + véhicule + mode recharge + Mapbox + résultats
        ├── vehicles/page.tsx    Liste + ajout (catalogue search) + édition + suppression
        ├── favorites/page.tsx   Liste + "Utiliser ce trajet" (deep-link dashboard) + suppression
        └── settings/page.tsx    Thème (3 modes) + langue (FR/EN) + déconnexion
```

### Architecture auth frontend
- JWT **jamais** dans localStorage — uniquement cookie httpOnly
- Login/register → POST `/api/auth/set-cookie` (route Next.js BFF)
- `proxy.ts` (Next.js 16) protège `/app/*` — redirect vers `/login` si pas de cookie
- OAuth : redirect vers `${API_URL}/auth/google` → callback page reçoit `?token=` → set cookie
- Axios intercepte chaque requête : lit `access_token` cookie → header `Authorization`

### Dashboard — Fonctionnalités
- **Autocomplétion** : `AutocompleteInput` → GET `/trips/geocode?q=...` avec debounce 300ms
- **Sélecteur véhicule** : chargé depuis GET `/vehicles/me`
- **Mode recharge** (électrique uniquement) : home / public / mix avec slider ratio
- **Calcul** : POST `/trips/calculate` → résultats + carte Mapbox
- **Carte Mapbox** : route polyline bleue + markers origine/destination + markers bornes (bleu cercle)
- **Favoris deep-link** : `handleUse(f)` passe les coords + vehicleId en query params vers `/app/dashboard?originLabel=...`
- **Partager** : `navigator.share` (mobile) ou copie dans presse-papiers + toast
- **Résultat** : distance, durée, consommation, prix unitaire, coût total (highlight)
- **Disclaimer électrique** : affiché dans un bandeau ambre si type=electric

### Vehicles — Fonctionnalités
- Add modal : recherche catalogue (GET `/vehicles/catalog?search=...`) → sélection → nickname + prix électriques
- Edit modal : nickname + tarifs électriques (PATCH `/vehicles/me/:id`)
- Delete : confirmation modal → DELETE `/vehicles/me/:id`

### Vehicles — Fonctionnalités web
- Add modal : recherche catalogue (GET `/vehicles/catalog?search=...`) → sélection → nickname + prix électriques
- Edit modal : nickname + tarifs électriques (PATCH `/vehicles/me/:id`)
- Delete : confirmation modal → DELETE `/vehicles/me/:id`

### Prochaine étape possible (web)
- Carte en pleine page (Mapbox GL, style satellite)
- Historique des calculs (session)
- PWA (manifest, service worker)

---

## Mobile — Application Expo

### Démarrage
```bash
cd mobile
cp .env.example .env   # remplir les valeurs
npx expo start         # QR code → Expo Go (sans carte) ou dev build
```

### Build natif (requis pour Mapbox + Apple Sign In)
```bash
# Dev build (simulateur iOS)
eas build --profile development --platform ios

# Preview (simulateur iOS)
eas build --profile preview --platform ios

# Production
eas build --profile production --platform all
```

### Variables d'environnement
| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | URL du backend NestJS |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Token Mapbox public (runtime, visible dans le bundle) |
| `MAPBOX_DOWNLOAD_TOKEN` | Token Mapbox **secret** (build-time uniquement, EAS) |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Client ID Google pour expo-auth-session |

### Structure des fichiers
```
mobile/
├── app.config.ts            Plugins : expo-secure-store, @rnmapbox/maps, expo-apple-authentication
├── eas.json                 Profils build EAS (development / preview / production)
├── constants/theme.ts       Palette Primary, Colors light/dark, Fonts, FontSizes, Spacing, Radius
├── app/
│   ├── _layout.tsx          Root layout : AuthProvider + StatusBar + Toast
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx        Email/password + Google (WebBrowser OAuth)
│   │   └── register.tsx     Email/password
│   └── (tabs)/
│       ├── _layout.tsx      Bottom tab bar (4 tabs)
│       ├── dashboard.tsx    Autocomplete + véhicule + mode recharge + Mapbox + résultats + favoris
│       ├── vehicles.tsx     CRUD véhicules (catalogue search modal + edit modal)
│       ├── favorites.tsx    Liste favoris + "use trip" (deep-link dashboard) + suppression
│       └── settings.tsx     Thème (Appearance API) + langue (i18next) + déconnexion
└── src/
    ├── api/client.ts        Axios : getToken() pour Authorization, deleteToken() si 401
    ├── auth/storage.ts      SecureStore wrappers : saveToken, getToken, deleteToken
    ├── context/AuthContext.tsx  Auth state + useSegments routing (auth) ↔ (tabs)
    ├── hooks/useDebounce.ts
    ├── i18n/
    │   ├── index.ts         i18next init avec expo-localization
    │   └── translations/    fr.ts + en.ts
    ├── types/api.ts         Types partagés frontend (GeoPoint, UserVehicle, TripResult…)
    └── components/
        ├── AutocompleteInput.tsx   Geocode avec debounce 300ms (FlatList dropdown)
        ├── MapboxMap.tsx           @rnmapbox/maps + fallback placeholder (Expo Go)
        └── ui/
            ├── Button.tsx    (variant: primary|secondary|ghost|destructive, size, loading)
            ├── Input.tsx     (label, error, hint, focus border)
            └── Card.tsx      (padding: none|sm|md|lg)
```

### Auth mobile
- JWT dans `expo-secure-store` (chiffré, hors sandbox JS)
- `AuthContext` : lit le token au démarrage → useSegments pour router vers `(auth)` ou `(tabs)`
- Google OAuth : `expo-web-browser.openAuthSessionAsync` → backend `/auth/google` → deep link `tripwise://auth/callback?token=...`
- Apple Sign In : `expo-apple-authentication` (iOS natif, physique uniquement en prod)

### Limitations connues
- **@rnmapbox/maps** : incompatible Expo Go → placeholder affiché (texte d'info). Utiliser `eas build --profile development` pour tester la carte.
- **Apple Sign In** : nécessite un device iOS physique en build de production. En simulateur/dev, le flow est disponible mais Apple peut bloquer.
- **MAPBOX_DOWNLOAD_TOKEN** : secret build-time (scope `DOWNLOADS:READ`), **ne pas préfixer `EXPO_PUBLIC_`**, configuré dans les secrets EAS (`eas secret:create`).
- **Token Mapbox public** `EXPO_PUBLIC_MAPBOX_TOKEN` : visible dans le bundle JS — restreindre aux app IDs autorisés dans le dashboard Mapbox.

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

### 2026-05-27 — Prompt 5 — V1 livrée, prête pour déploiement

#### Nettoyage — code mort supprimé
| Fichier supprimé | Raison |
|-----------------|--------|
| `web/src/app/design-system/page.tsx` | Page de démo, aucune valeur en production |
| `web/src/components/AppNav.tsx` | Plus importé nulle part (remplacé par `AppLayout`) |
| `web/src/components/LogoutButton.tsx` | Plus importé nulle part |
| `web/src/components/ui/Button.tsx` | Importé uniquement par les fichiers supprimés ci-dessus |
| `web/src/app/app/vehicles/page.tsx` | Remplacé par redirect HTTP 308 → `/app/garage` dans `next.config.ts` |

#### UX / Polish
- **Empty state Garage** : skeleton `animate-pulse` (3 lignes) pendant le chargement + bouton CTA "Ajouter au garage" dans l'état vide
- **Dashboard onboarding banner** : affiché si `!statsLoading && vehicles.length === 0` — titre, description, lien vers `/app/garage/add`
- **Favicon SVG** : `/web/public/favicon.svg` — carré arrondi bleu (`#3b82f6`, `rx="14"`) + lettermark "T" blanc
- **Metadata OG/Twitter** : `title`, `description`, `openGraph`, `twitter` dans `web/src/app/layout.tsx`
- **i18n** : 3 clés ajoutées — `dashboard.onboardingTitle`, `dashboard.onboardingDesc`, `dashboard.onboardingCta` — symétrique FR + EN

#### Sécurité & configuration
- `backend/src/main.ts` : bloc de commentaires `TODO (déploiement Vercel)` avant `app.enableCors()` — CORS, cookies, synchronize, JWT_SECRET
- `.gitignore` : audit complet ✅ — `.env`, `.env.local`, `*.p8`, `*.key`, `node_modules`, `.next`, `dist` tous exclus
- `.env.example` backend et web : complets et à jour
- `README.md` et `ROADMAP.md` : mis à jour pour refléter l'état final V1

#### État final V1
| Vérification | Résultat |
|-------------|----------|
| Backend e2e (136 tests, 9 suites) | ✅ |
| Backend `tsc --noEmit` | ✅ |
| Web `tsc --noEmit` | ✅ |
| Web `next build` (18 routes) | ✅ |
| Aucun `console.log` en production | ✅ |
| i18n FR/EN symétrique | ✅ |
| `.env` exclu du git | ✅ |

#### Routes web actives (18)
```
/                          Landing (public)
/login                     Connexion
/register                  Inscription
/auth/callback/google      Callback OAuth Google
/auth/callback/apple       Callback OAuth Apple
/api/auth/set-cookie       BFF : pose le cookie JWT
/api/auth/logout           BFF : efface le cookie JWT
/app/dashboard             Tableau de bord
/app/trips                 Historique des trajets
/app/trips/[id]            Détail d'un trajet
/app/trips/result          Résultat d'un calcul
/app/garage                Liste des véhicules
/app/garage/[id]           Détail / édition véhicule
/app/garage/add            Ajout véhicule (2 étapes)
/app/favorites             Favoris
/app/fuel-prices           Configuration des prix
/app/settings              Paramètres
→ /app/vehicles            Redirect 308 → /app/garage
```

---

### 2026-05-27 — Fix : TypeORM DECIMAL → string (Postgres)

#### Problème
PostgreSQL retourne les colonnes `DECIMAL` / `NUMERIC` sous forme de **chaînes JS** dans les résultats bruts TypeORM. TypeORM ne les coerce pas automatiquement en `number`. Les pages qui rechargent des données depuis la DB (ex : `/app/trips/:id`) levaient `trip.totalCost.toFixed is not a function` à la ligne 200, car `totalCost` était `"42.50"` (string) et non `42.5` (number).

Les pages issues de `/trips/calculate` fonctionnaient car les calculs se font en mémoire (valeurs JS natives).

#### Solution : `transformer` TypeORM sur toutes les colonnes DECIMAL

**Fichier créé** : `backend/src/common/column-transformers.ts`
```typescript
export const decimalTransformer = {
  to:   (value: number | null) => value,
  from: (value: string | number | null | undefined): number | null => {
    if (value === null || value === undefined) return null;
    const n = parseFloat(String(value));
    return isNaN(n) ? null : n;
  },
};
```

**Entités modifiées** (toutes les colonnes `type: 'decimal'`) :
| Entité | Colonnes traitées |
|--------|------------------|
| `vehicle-model.entity.ts` | `consumption`, `batteryCapacityKwh`, `tankCapacityLiters` |
| `user-vehicle.entity.ts` | `homeElectricityPrice`, `publicChargingPrice`, `homeChargingRatio` |
| `trip.entity.ts` | `originLat`, `originLng`, `destinationLat`, `destinationLng`, `distanceKm`, `consumptionPer100`, `totalConsumption`, `pricePerUnit`, `totalCost`, `tollsCost` |
| `favorite.entity.ts` | `originLat`, `originLng`, `destinationLat`, `destinationLng` |

**Aucun `Number(x).toFixed()` workaround** trouvé dans le frontend — tous les appels `.toFixed()` sont directs, ce qui est correct maintenant.

**SQLite (tests e2e)** : `parseFloat(number)` retourne le nombre tel quel — aucun impact sur les assertions existantes.

#### Vérifications
- `tsc --noEmit` backend → 0 erreur ✅
- `npx jest --config test/jest-e2e.json --forceExit` → **136/136 tests passent** ✅
- `tsc --noEmit` web → 0 erreur ✅
- `npm run build` web → **20/20 routes compilées** ✅

---

### 2026-05-26 — Correctifs post-Prompt 4B (4 bugs)

#### BUG 1 — AutocompleteInput dropdown invisible
- **Root cause** : `AutocompleteInput.tsx` utilisait des classes CSS de l'ancien design system (`bg-[var(--card)]`, `border-[var(--border)]`, `text-[var(--foreground)]`, `hover:bg-primary-50 dark:hover:bg-primary-900/20`, `focus:ring-primary-500`). Ces variables CSS ne sont pas définies dans le thème Carbon → fond transparent, texte invisible.
- **Fix** : Réécriture complète des classes CSS vers les équivalents Carbon (`bg-carbon-surface`, `border-carbon-hairline`, `text-carbon-ink`, `text-carbon-muted`, `hover:bg-carbon-surface2`, `focus:ring-carbon-accent`). Ajout de `rounded-xl` pour les items dropdown avec séparateurs `border-b border-carbon-hairline`.

#### BUG 2 — Toast invisible (même root cause)
- **Root cause** : `ToastProvider.tsx` utilisait `bg-[var(--card)]` (transparent dans Carbon), `text-[var(--muted)]`, `border-green-200 dark:border-green-800` (dark: prefix ignoré par Carbon).
- **Fix** : Réécriture Carbon → `bg-carbon-surface`, `text-carbon-ink`, `text-carbon-muted`, couleurs de bordure statiques Tailwind (`border-emerald-500/40`, `border-red-500/40`, `border-blue-500/40`). Z-index monté à `z-[200]`. Ajout `pointer-events-none` sur le conteneur / `pointer-events-auto` sur chaque toast.

#### BUG 3 — IntlError : garage.add résolu en objet
- **Root cause** : `garage/page.tsx` appelle `t('add')` avec `t = useTranslations('garage')`. Le Prompt 4B a transformé `garage.add` en objet avec des sous-clés (`step1Title`, etc.) au lieu d'une chaîne simple. next-intl lève `INSUFFICIENT_PATH: Message at 'garage.add' resolved to 'object'`.
- **Fix** : Changé `{t('add')}` → `{t('addTitle')}` (la clé `garage.addTitle = "Ajouter au garage"` est une chaîne plate existante).

#### BUG 4 — Audit global des classes non-Carbon
- **`ui/Input.tsx`** : Réécriture Carbon. Utilisé dans garage/[id], garage/add, trips/[id]. Label en `text-xs font-semibold tracking-wider uppercase text-carbon-muted`.
- **`ui/Modal.tsx`** : Réécriture Carbon. Z-index à `z-[150]`. Fond `bg-carbon-surface`, bordures `border-carbon-hairline`, `rounded-card`.
- **`ui/Select.tsx`** : Réécriture Carbon. Utilisé dans le dashboard (sélecteur de véhicule).
- **`ui/Card.tsx`** : Réécriture Carbon (`bg-carbon-surface border-carbon-hairline rounded-card`).
- **`auth/callback/google/page.tsx`** + **apple** : `text-[var(--muted)]` → `text-carbon-muted`, `text-primary-600` → `text-carbon-accent`.
- **`components/AppNav.tsx`** et **`ui/Button.tsx`** : Laissés tels quels — dead code (non importés nulle part).
- **`vehicles/page.tsx`** : Laissé tel quel — route 308-redirectée vers `/app/garage`, jamais rendue.

#### Vérifications
- `tsc --noEmit` → 0 erreur ✅
- `next build` → 20/20 routes compilées, 0 erreur ESLint ✅

---

### 2026-05-26 — Prompt 4B — Nouveaux écrans web V2

#### Contexte
Création de 7 nouveaux écrans authentifiés dans l'app Next.js. Contraintes strictes : backend non modifié, design system Carbon non modifié, aucun nouveau package npm, TypeScript strict, 0 erreur.

#### Nouveaux fichiers créés / modifiés

| Fichier | Type | Description |
|---------|------|-------------|
| `web/src/app/app/trips/page.tsx` | REMPLACÉ | Historique complet des trajets |
| `web/src/app/app/trips/[id]/page.tsx` | CRÉÉ | Détail d'un trajet sauvegardé |
| `web/src/app/app/trips/result/page.tsx` | CRÉÉ | Page de résultat calcul + sauvegarde |
| `web/src/app/app/garage/[id]/page.tsx` | CRÉÉ | Détail/édition d'un véhicule |
| `web/src/app/app/garage/add/page.tsx` | CRÉÉ | Ajout véhicule en 2 étapes |
| `web/src/app/app/dashboard/page.tsx` | REMPLACÉ | Dashboard enrichi (mode adresse/distance + suggestions) |
| `web/src/app/app/fuel-prices/page.tsx` | CRÉÉ | Configuration des prix carburant |

#### `/app/trips` — Historique
- Stats strip (totalCost, totalDistance, avgCostKm) via `GET /trips/stats`
- Chips filtre : `all | ev | gas | diesel | gpl` → param `fuelCategory`
- Regroupement mensuel via `groupByMonth()` (`tripDate.slice(0,7)`)
- Pagination "Charger plus" (`page < totalPages`)
- Chaque ligne → `router.push('/app/trips/${trip.id}')`

#### `/app/trips/[id]` — Détail trajet
- `use(params)` pour resolver `Promise<{ id: string }>` (Next.js 15)
- `GET /trips/${id}` au montage
- Auto-save note : `useDebounce(noteValue, 1000)` + pattern `savedNoteRef` pour éviter le premier fire
- Archive toggle : `PATCH /trips/:id { isArchived: !trip.isArchived }`
- Refaire : construit URL avec params → `router.push('/app/dashboard?originLabel=...')`
- Suppression : modal → `DELETE /trips/:id` → retour liste

#### `/app/trips/result` — Résultat calcul
- Lit `sessionStorage['tripwise.pendingTrip']` → type `PendingTripSession`
- Coût hero 104px (`text-[104px] font-bold font-display`)
- Barres de comparaison multi-énergie (triées par coût croissant)
- Stepper passagers 1–9 (coût divisé par passagers)
- Save → `POST /trips/save` → navigation vers `/app/trips/${savedTrip.id}`
- Désactivé si `mode === 'distance'` (pas de coords → pas de sauvegarde)
- "Nouveau trajet" → vide sessionStorage → `/app/dashboard`

#### `/app/garage/[id]` — Détail véhicule
- Pas d'endpoint dédié : fetch `GET /vehicles/me` + `.find((v) => v.id === id)`
- Stats strip : tripsCount / totalDistance / totalSpent / costPerKm (si tripsCount > 0)
- Formulaire : nickname, licensePlate, consommation (lecture seule), prix EV si électrique
- Save → `PATCH /vehicles/me/${id}` + re-fetch pour refresh
- Default toggle : Star si déjà défaut ; sinon CTAButton → `PATCH /vehicles/me/${id}/set-default`
- Danger zone : `border-red-500/20`, suppression avec modal

#### `/app/garage/add` — Ajout véhicule (2 étapes)
- Étape 1 : `Input` debounced 300ms → `GET /vehicles/catalog?search=...&limit=20` → `CatalogPage`
- Étape 2 : preview du modèle + champs (nickname, licensePlate, prix EV si électrique)
- Validation : EV → homeElectricityPrice et publicChargingPrice requis
- Submit → `POST /vehicles/me` → `/app/garage/${data.id}`

#### `/app/dashboard` — Enrichissement
- `SegmentedControl` Adresses / Distance en haut du calculateur
- **Mode Adresses** : `AutocompleteInput` départ + arrivée → `POST /trips/calculate` + `POST /trips/calculate-multi` en parallèle → `PendingTripSession` dans sessionStorage → redirect `/app/trips/result`
- **Mode Distance** : input 56px + chips rapides (50/200/465/800 km) → calcul client-side avec `localStorage['tripwise.userPrices']` → même sessionStorage + redirect
- **Suggestions** : `GET /favorites` → 5 premiers → clic `applySuggestion(fav)` pour préremplir départ/arrivée
- Recent trips cliquables : `router.push('/app/trips/${trip.id}')`
- Supprimé : affichage inline des résultats, `MapboxMap`, modal favori, bouton partager

#### `/app/fuel-prices` — Configuration prix
- Charge `GET /prices/defaults` pour afficher les prix temps réel
- Édition libre des prix par carburant (localStorage `tripwise.userPrices`)
- Auto-save à chaque changement + toast confirmation
- `PriceRow` composant interne réutilisable

#### Décisions techniques
- **`useSuggestion` → `applySuggestion`** : renommé pour respecter la règle `react-hooks/rules-of-hooks` (le nom `use*` déclenche la règle même sur les fonctions utilitaires)
- **`// 404` dans JSX** : wrappé en `{"// 404"}` pour éviter `react/jsx-no-comment-textnodes`
- **Pattern `savedNoteRef`** : `useRef<string | null>(null)`, initialisé quand le trip charge, permet au debounce de ne pas déclencher un PATCH lors du premier rendu
- **sessionStorage `tripwise.pendingTrip`** : bridge entre dashboard et result page — évite les URL params pour les objets volumineux (GeoJSON)
- **Distance mode** : calcul 100% client (localStorage prices), `PendingTripSession.mode = 'distance'`, sauvegarde désactivée (pas de coords)

#### Types modifiés (`web/src/types/api.ts`)
- `UserVehicle` : ajout `licensePlate: string | null`

#### i18n ajouté (`messages/fr.json` + `messages/en.json`)
- `dashboard.modeAddress`, `dashboard.modeDistance`, `dashboard.distancePlaceholder`, `dashboard.suggestionsTitle`, `dashboard.useSuggestion`, `dashboard.distanceChips`
- `trips.history.*`, `trips.detail.*`, `trips.result.*`
- `garage.detail.*`, `garage.add.*`
- `prices.*`

#### Vérifications
- `tsc --noEmit` → 0 erreur ✅
- `next build` → 20/20 routes compilées, 0 erreur ESLint ✅

---

### 2026-05-25 — Corrections post-Prompt 4A (4 bugs)

#### BUG 1 — Sidebar manquante
- **Root cause** : `web/src/app/app/layout.tsx` importait encore l'ancien composant `AppNav` (barre horizontale). Le nouveau `AppLayout` existait dans `layouts/AppLayout.tsx` mais n'était pas câblé.
- **Fix** : `app/app/layout.tsx` remplacé pour importer et utiliser `AppLayout`.
- **AppLayout** (`web/src/components/layouts/AppLayout.tsx`) : sidebar fixe 220px (desktop ≥1024px), topbar fixe, burger + drawer (mobile <1024px), 5 items nav (DASHBOARD/TRAJETS/GARAGE/CARBURANT·PRIX/PARAMÈTRES), StatusDot + version en bas, bouton "+ NOUVEAU TRAJET" dans la topbar.
- Breakpoint : `lg` (1024px) — `hidden lg:flex` pour la sidebar, `lg:hidden` pour le burger et le drawer.
- Item actif : fond blue-500/10 + border hairline + dot accent à droite.
- `/app/favorites` active l'item TRAJETS (favoris = trajets sauvegardés).

#### BUG 2 — NaN € dans le KPI "Économies vs Essence"
- **Root cause** : `TripStats.savedVsGas` était typé `number` côté frontend alors que le backend retourne `{ amount: number; percent: number }`. `fmtEur.format(object)` produisait "NaN €".
- **Fix** : type corrigé dans `web/src/types/api.ts` + rendu dashboard utilise `stats?.savedVsGas?.amount ?? 0`.

#### BUG 3 — Hydration error dans /app/settings
- **Root cause** : `useTheme()` de next-themes retourne `undefined` côté serveur → className conditionnel différent entre SSR et client.
- **Fix** : pattern `mounted` dans `settings/page.tsx` — skeleton neutre rendu jusqu'à `useEffect(() => setMounted(true), [])`, puis UI complète côté client uniquement.

#### BUG 4 — Pill landing "Open source"
- **Fix** : `landing.badge` → `"Gratuit · Sans pub"` (FR) / `"Free · No ads"` (EN) dans `messages/fr.json` et `messages/en.json`.

#### Nouvelle page créée
- `web/src/app/app/trips/page.tsx` — placeholder "bientôt disponible" avec icône History, eyebrow "Trajets", titre "Historique".

#### Vérifications
- `tsc --noEmit` → 0 erreur ✅
- `next build` → 17/17 routes compilées ✅
- Tour visuel complet : dashboard (KPI 0,00 € ✅), trajets (placeholder ✅), garage (GARAGE actif ✅), favoris (TRAJETS actif ✅), settings (toggle thème sans hydration ✅)
- Redirect `/app/vehicles` → `/app/garage` : HTTP 308 confirmé visuellement ✅
- Responsive : structure DOM vérifiée via JS (`lg:hidden` burger + `hidden lg:flex` sidebar) ✅

### 2026-05-22 — Extension schéma DB + package shared

#### Entités étendues
- **`vehicle_models`** : ajout de `battery_capacity_kwh numeric(5,2) NULL` et `tank_capacity_liters numeric(5,1) NULL` (valeurs indicatives constructeur, commentées)
- **`user_vehicles`** : ajout de `license_plate varchar(20) NULL`, `is_default boolean NOT NULL DEFAULT false`, `home_charging_ratio numeric(3,2) NULL DEFAULT 0.70`

#### Nouvelle entité `Trip`
- Fichier : `backend/src/trips/entities/trip.entity.ts`
- Table : `trips` (créée par la migration `1747700000000-AddTripsAndExtendVehicles.ts`)
- Colonnes : origin/destination (label+lat+lng), distance_km, duration_seconds, fuel_type (réutilise `vehicle_models_fuel_type_enum`), energy_unit (nouvel enum `energy_unit_enum` : 'L' | 'kWh'), consumption_per_100, total_consumption, price_per_unit, total_cost, charging_mode (varchar NULL), trip_date (timestamp), is_archived, created_at
- 3 index : `IDX_trips_user_date` (user_id, trip_date DESC), `IDX_trips_user_archived` (user_id, is_archived), `IDX_trips_user_fuel` (user_id, fuel_type)
- FK : user_id → users (CASCADE), vehicle_id → user_vehicles (SET NULL)
- **NON enregistré automatiquement** — aucun endpoint d'écriture dans TripsModule (fonctionnalité future)

#### Utilitaire `FuelCategory`
- Fichier : `backend/src/common/fuel-type-categories.ts`
- Exporte `FuelCategory` (type alias `'gas' | 'diesel' | 'ev' | 'gpl'`) et `toCategory(fuelType: FuelType): FuelCategory`
- gas = SP95/SP95_E10/SP98/E85 · diesel = DIESEL · ev = ELECTRIC · gpl = GPL

#### Seed — UPSERT idempotent
- `vehicle-models.seed.ts` remplacé par une logique UPSERT par (brand, model, year) via `findOneBy` + `IsNull()` pour year null
- 41 véhicules complétés avec `batteryCapacityKwh` (EVs) et `tankCapacityLiters` (thermiques) — valeurs indicatives constructeur

#### Package `@tripwise/shared` (créé)
- Répertoire `shared/` à la racine — pas de build step, TypeScript pur
- `shared/src/enums/index.ts` : FuelType, AuthProvider, ChargingMode, EnergyUnit
- `shared/src/types/fuel-category.types.ts` : FuelCategory, toCategory
- `shared/src/types/user.types.ts` : UserProfile, LoginRequest, RegisterRequest, AuthResponse
- `shared/src/types/vehicle.types.ts` : VehicleModelEntry, UserVehicle, AddVehicleRequest, UpdateVehicleRequest, VehicleCatalogQuery
- `shared/src/types/trip.types.ts` : TripCalculateRequest, TripResult, FuelCost, ElectricCost, SavedTrip, GeoPoint, StationInfo, ChargingStation, TripDistance, TripDuration, TripVehicleInfo
- `shared/src/types/favorite.types.ts` : Favorite, CreateFavoriteRequest, UpdateFavoriteRequest
- `shared/src/index.ts` : barrel re-export de tout
- Path alias déjà configuré dans `backend/tsconfig.json` et `backend/test/jest-e2e.json`

#### Vérifications
- `npx tsc --noEmit` → 0 erreur ✅
- `npx jest --config test/jest-e2e.json --forceExit` → 96/96 tests passent ✅
- `npm run migration:run` → à lancer quand Docker est démarré (DB indisponible au moment de la session)

### 2026-05-22 — Prompt 2 Carbon design : historique trips + stats + multi-énergie

#### Nouveaux fichiers backend
- `src/common/calculation-constants.ts` : constantes France 2026 (consommation et prix de référence gaz/diesel/EV)
- `src/common/default-prices.ts` : objet `DEFAULT_PRICES` exporté (utilisé par PricesService et TripsService)
- `src/database/migrations/1747701000000-AddTripMetaFields.ts` : 3 nouveaux champs sur `trips` — `note TEXT NULL`, `passengers_count SMALLINT DEFAULT 1`, `tolls_cost NUMERIC(8,2) DEFAULT 0`
- `src/prices/prices.service.ts`, `prices.controller.ts`, `prices.module.ts` : module `PricesModule` — endpoint `GET /prices/defaults` (JWT requis)
- `src/trips/dto/save-trip.dto.ts` : DTO de sauvegarde de trajet
- `src/trips/dto/history-query.dto.ts` : pagination + filtre fuelCategory/month/includeArchived
- `src/trips/dto/update-trip.dto.ts` : modification note/isArchived/tripDate
- `src/trips/dto/stats-query.dto.ts` : filtre month optionnel
- `src/trips/dto/calculate-multi.dto.ts` : comparaison multi-énergie
- `test/trips-crud.e2e-spec.ts` : 25 tests e2e (save, history, stats, GET/:id, PATCH/:id, DELETE/:id)
- `test/prices.e2e-spec.ts` : 3 tests e2e (auth, shape, valeurs numériques)

#### Modules modifiés
- `Trip` entity : 3 nouvelles colonnes (note, passengersCount, tollsCost)
- `VehiclesModule` : TypeOrmModule.forFeature inclut `Trip` (pour stats agrégées par véhicule)
- `VehiclesService` : `findUserVehicles` retourne stats agrégées (tripsCount, totalDistance, totalSpent, costPerKm) via GROUP BY ; `addUserVehicle` utilise une transaction pour la logique `isDefault` ; nouvelle méthode `setDefaultVehicle`
- `VehiclesController` : ajout `PATCH me/:id/set-default` (avant `PATCH me/:id`)
- `TripsModule` : TypeOrmModule.forFeature inclut `Trip` + `UserVehicle` ; imports VehiclesModule, FuelPricesModule, ChargingStationsModule
- `TripsService` : 6 nouvelles méthodes (saveTrip, getHistory, getTripById, updateTrip, deleteTrip, getStats) + `calculateMulti` (comparaison gas/diesel/ev avec prix réels ou fallback) ; méthode helper `categoryToFuelTypes`
- `TripsController` : routes statiques avant `:id` (geocode, history, stats, calculate, calculate-multi, save) puis routes paramétrées (GET/:id, PATCH/:id, DELETE/:id)
- `AppModule` : PricesModule ajouté
- DTOs véhicules : `AddUserVehicleDto` et `UpdateUserVehicleDto` étendus (licensePlate, isDefault, homeChargingRatio)
- Tous les fichiers e2e (7 suites existantes) : entité `Trip` ajoutée dans la liste `entities` TypeORM

#### Nouveaux endpoints
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/v1/prices/defaults` | Renvoie les prix de référence (JWT requis) |
| POST | `/api/v1/trips/save` | Sauvegarde un trajet calculé (201) |
| GET | `/api/v1/trips/history` | Historique paginé (filtre fuelCategory, month, includeArchived) |
| GET | `/api/v1/trips/stats` | Stats agrégées mensuelles (totalCost, totalDistance, tripCount, savedVsGas, dailyExpenses) |
| POST | `/api/v1/trips/calculate-multi` | Compare coût gaz / diesel / EV pour le même trajet |
| GET | `/api/v1/trips/:id` | Détail d'un trajet sauvegardé |
| PATCH | `/api/v1/trips/:id` | Modifie note, isArchived ou tripDate |
| DELETE | `/api/v1/trips/:id` | Supprime un trajet (204) |
| PATCH | `/api/v1/vehicles/me/:id/set-default` | Définit le véhicule par défaut |

#### Tests e2e
- Suite complète (9 fichiers) : **136/136 tests passent** ✅
- `npx jest --config test/jest-e2e.json --forceExit`

### 2026-05-25 — Refonte écrans web V2 — Carbon Design System

#### Contexte
Refonte complète des écrans existants Next.js avec le système de composants atomiques Carbon (Prompt 3). Aucun nouveau écran créé, backend non modifié.

#### Composants atomiques Carbon créés (`web/src/components/ui/`)
| Composant | Description |
|-----------|-------------|
| `TWAppIcon.tsx` | Icône app stylisée (carré arrondi bleu + T blanc) |
| `Wordmark.tsx` | Logotype "Tripwise" en Space Grotesk, tailles sm/md/lg |
| `Pill.tsx` | Badge coloré avec `color`, `dot`, `size` props |
| `CTAButton.tsx` | Bouton principal `variant: accent/ghost/danger`, `size: sm/md/lg`, `icon` |
| `SectionCard.tsx` | Carte avec title slot, `padding: none/sm/md/lg` |
| `Eyebrow.tsx` | Label uppercase espacé (surtitre de section) |
| `Hairline.tsx` | Séparateur `<hr>` Carbon (`border-carbon-hairline`) |
| `KPICell.tsx` | Cellule métrique (label + valeur + delta +/- coloré) |
| `BrandAvatar.tsx` | Avatar initiales marque véhicule (fond carbon-surface2) |
| `FuelBadge.tsx` | Badge type carburant coloré (emerald/amber/sky/violet) |
| `Sparkline.tsx` | Mini graphique SVG linéaire avec gradient fill |

#### Tokens Carbon CSS (ajoutés dans `globals.css`)
```css
--c-bg, --c-surface, --c-surface2, --c-ink, --c-ink2, --c-muted,
--c-faint, --c-hairline, --c-accent
```
Tailwind : classes `bg-carbon-*`, `text-carbon-*`, `border-carbon-*`
Polices : `Space Grotesk` (display), `JetBrains Mono` (numériques)
`darkMode: ['selector', '[data-theme="dark"]']` + `attribute="data-theme"` dans ThemeProvider

#### Écrans refaits
| Écran | Route | Changements clés |
|-------|-------|-----------------|
| Landing | `/` | Server component, TWAppIcon + Wordmark, Pills, SectionCard features |
| Login | `/login` | TWAppIcon header, CTAButton accent, GoogleIcon/AppleIcon SVG inline |
| Register | `/register` | `confirmPassword` + Zod `.refine()` pour validation match |
| AppLayout | app layout | 5 nav items (dashboard/trips/garage/fuel-prices/settings), dot indicator actif, version `v2.4 — BUILD 0521` |
| Dashboard | `/app/dashboard` | KPI grid (4 KPICell) depuis `/trips/stats`, Sparkline dailyExpenses, trips récents (8) depuis `/trips/history`, `Intl.NumberFormat fr-FR` |
| Garage | `/app/garage` | Renommé depuis vehicles, stats strip (tripsCount/totalDistance/totalSpent/costPerKm), BrandAvatar + FuelBadge, Pill "Par défaut" |
| Favorites | `/app/favorites` | SectionCard(padding="none") par row, index badge, CTAButton "Utiliser" |
| Settings | `/app/settings` | 3 SectionCard (Appearance/Language/Account), CTAButton danger logout |

#### Redirect ajouté
```typescript
// next.config.ts
{ source: '/app/vehicles', destination: '/app/garage', permanent: true } // HTTP 308
```

#### Types ajoutés (`web/src/types/api.ts`)
- `TripStats` : totalCost, totalDistance, tripCount, savedVsGas, dailyExpenses
- `SavedTrip` : historique trajet complet avec fuelType, energyUnit, totalCost, etc.
- `UserVehicleWithStats` : étend UserVehicle avec tripsCount, totalDistance, totalSpent, costPerKm, isDefault

#### Clés i18n ajoutées (`messages/fr.json` + `messages/en.json`)
`garage.*`, `dashboard.*`, `auth.confirmPassword`, `auth.passwordMismatch`, `settings.appearance`, `settings.accountSection`, `settings.version`, `nav.collapseMenu`, `common.noData`, `landing.*`, `favorites.from/to`

#### Corrections bugs
- `Sparkline.tsx` : `useId()` déplacé avant le `return null` anticipé (règle hooks React)
- `FuelBadge` : utilise couleurs Tailwind concrètes (emerald/amber/sky/violet) — pas de CSS var + opacity modifier (incompatible Tailwind v3)
- `garage/page.tsx` : type union `GarageVehicle = UserVehicle | UserVehicleWithStats` + type guards `hasStats()` / `isDefaultVehicle()`

#### Vérifications finales
- `tsc --noEmit` → 0 erreur ✅
- `next build` → 16/16 routes compilées, 0 erreur ESLint ✅

### 2026-05-23 — Consolidation : restauration mobile + commit des changements en attente

#### Contexte
- Session précédente interrompue (contexte saturé) pendant la phase de nettoyage du répertoire `mobile/src/`
- Les fichiers `mobile/src/*.ts(x)` avaient été supprimés de l'arbre de travail mais pas remplacés
- Le code des tabs/auth mobile référençait ces fichiers supprimés → app cassée

#### Actions effectuées
- **Restauration** : `git restore mobile/src/` — fichiers `mobile/src/` récupérés depuis le dernier commit
- **Vérifications** : 136/136 tests e2e ✅, `tsc --noEmit` backend ✅ et web ✅
- **CLAUDE.md** : `proxy.ts` renommé en `middleware.ts` dans la structure, `AppNav.tsx` documenté
- **Commit** : tous les changements en attente (backend extensions, shared types, web refactor) regroupés

### 2026-05-21 — Frontend web `web/` créé et build validé
- **Création effective** du répertoire `web/` (Next.js 15.3.9 App Router, TypeScript strict, Tailwind CSS 3, next-intl 4, next-themes 0.4, mapbox-gl 3, axios, react-hook-form + zod, lucide-react 1)
- **14 routes compilées**, build 100% propre (0 erreur TypeScript, 0 warning ESLint)
- **Dépendances** : versions réelles vérifiées via `npm view` (next@15.3.9, next-intl@4.12.0, lucide-react@1.16.0, etc.)
- **lucide-react v1** : renames appliqués — `Loader2`→`LoaderCircle`, `CheckCircle`→`CircleCheck`, `XCircle`→`CircleX`, `AlertCircle`→`CircleAlert`
- **mapbox-gl CSS** : import statique en tête de `MapboxMap.tsx` (pas de `await import()` dans useEffect — incompatible TypeScript)
- **useCallback** : `loadVehicles` et `loadFavorites` wrappés pour corriger l'avertissement `exhaustive-deps` (qui devient erreur en build Next.js)
- **Auth** : JWT dans cookie non-httpOnly (BFF `/api/auth/set-cookie`), middleware protège `/app/*`, axios intercepte et injecte `Authorization: Bearer`
- **Sécurité token Mapbox** : `NEXT_PUBLIC_MAPBOX_TOKEN` visible dans le bundle client — **restreindre aux domaines autorisés** dans dashboard Mapbox (account.mapbox.com → Access tokens → URL restrictions)
- **Variables d'env** nécessaires dans `web/.env.local` : `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_MAPBOX_TOKEN`

### 2026-05-20 — Étape finale : sécurité, qualité, tests, documentation
- **Rate limiting** : @nestjs/throttler installé ; ThrottlerGuard global (100 req/min par IP) ; /auth/login et /auth/register surchargés à 5 req/min via @Throttle()
- **Guards vérifiés** : tous les endpoints protégés par JwtAuthGuard sauf /auth/* (LocalAuthGuard/GoogleAuthGuard/AppleAuthGuard), /vehicles/catalog (public), /health (public)
- **CORS** : déjà restreint via CORS_ORIGINS (variable env, séparée par virgule) — vérifié dans main.ts
- **.gitignore** : .env exclus, *.p8 exclu — aucun secret commité
- **Tests unitaires** : `src/trips/trips.service.spec.ts` — 19 tests couvrant computeFuelCost, computeElectricCost, formatDuration (modes home/public/mix, ratio, arrondi, fallback)
- **Tests e2e** : 96/96 passent (7 suites), vérifiés après ajout du ThrottlerModule
- **Scripts npm cohérents** : `format`, `type-check` ajoutés dans web et mobile ; `build:preview`, `build:prod` dans mobile
- **Monorepo racine** : `package.json` créé avec `concurrently` — scripts `dev`, `dev:all`, `build`, `lint`, `format`, `test`, `test:e2e`, `db:up`, `db:migrate`, `setup`
- **README.md** : rédaction complète (présentation, stack, prérequis, installation pas à pas, variables d'env, commandes, sécurité, limitations, liens API)
- **ROADMAP.md** : créé — évolutions court/moyen/long terme (péages, historique, multi-devises, flotte, PWA)
- **CLAUDE.md** : journal mis à jour

### 2026-05-20 — Application mobile Expo (SDK 54)
- Expo SDK 54, Expo Router v6, React 19, React Native 0.81.5, new architecture activée
- StyleSheet API (pas NativeWind) pour éviter incompatibilités React 19 / new arch
- Auth : JWT dans expo-secure-store, AuthContext avec useSegments() pour routing (auth)↔(tabs)
- Google OAuth : expo-web-browser.openAuthSessionAsync → backend /auth/google → deep link tripwise://
- Apple Sign In : expo-apple-authentication (iOS natif, device physique en prod)
- Mapbox : @rnmapbox/maps avec fallback placeholder si Expo Go (Constants.appOwnership === 'expo')
- i18n : i18next + react-i18next + expo-localization, langues FR/EN, detectedLang via getLocales()[0]
- Thème : useColorScheme() + Appearance.setColorScheme() pour override manuel
- 4 onglets : dashboard (calcul + carte + favoris), vehicles (CRUD + catalog search), favorites (list + deep-link), settings
- EAS Build configuré : development (developmentClient) / preview (simulateur iOS) / production
- MAPBOX_DOWNLOAD_TOKEN : secret build-time, configurer via `eas secret:create`
- ⚠️ @rnmapbox/maps incompatible Expo Go — utiliser `eas build --profile development`
- ⚠️ Token public EXPO_PUBLIC_MAPBOX_TOKEN visible dans le bundle — restreindre aux app IDs Mapbox

### 2026-05-20 — Frontend web — fonctionnalités cœur
- Dashboard : autocomplétion via `AutocompleteInput` (GET /trips/geocode, debounce 300ms), sélecteur véhicule, mode recharge électrique (home/public/mix + slider), POST /trips/calculate, résultats avec carte Mapbox
- Carte Mapbox : `MapboxMap.tsx` (dynamic ssr:false), route LineString bleue, markers origine/destination, markers bornes (popup nom+adresse+kW)
- Favoris deep-link : clic "Utiliser" → `/app/dashboard?originLabel=...&originLat=...&originLng=...&destinationLabel=...&destinationLat=...&destinationLng=...&vehicleId=...`
- Favoris : suppression avec confirmation modal, texte i18n
- Vehicles : add modal (recherche catalogue avec debounce), edit modal, delete modal — tous avec états de chargement
- Partage : `navigator.share` (mobile) ou clipboard + toast "Copié"
- i18n : tous les textes via `useTranslations` (next-intl), fichiers fr.json + en.json complets
- Next.js 16 : `middleware.ts` renommé en `proxy.ts`, export `proxy()` (Next.js 16 breaking change)
- ⚠️ Token Mapbox public (`NEXT_PUBLIC_MAPBOX_TOKEN`) visible côté client — restreindre aux domaines dans dashboard Mapbox
- Build : 14 routes compilées sans erreur ni avertissement

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

### 2026-05-19 — Module Trips + MapboxService
- MapboxService (@Global) : geocode (Mapbox Geocoding v5) + getDirections (Directions v5)
- fetch natif Node 24 — pas d'axios
- Gestion erreurs Mapbox : 401 (token invalide), 429 (quota), réseau, code non-Ok
- Quota Mapbox : ~100k req/mois sur plan gratuit — à vérifier sur account.mapbox.com
- GET /trips/geocode : proxy autocomplétion (filtre country, limit 1-10)
- POST /trips/calculate : distance + durée (formatée) + géométrie GeoJSON + véhicule + cost
- 404 si userVehicleId n'appartient pas à l'utilisateur connecté
- @IsDefined() sur origin/destination pour valider les champs manquants
- enableImplicitConversion: true dans ValidationPipe des tests (query params int)
- Tests e2e trips : 30/30 (MapboxService + FuelPricesService + ChargingStationsService mockés)

### 2026-05-20 — Frontend Web (Next.js 15)
- Next.js 15 App Router, TypeScript strict, Tailwind CSS 4, ESLint
- Dépendances : next-intl, next-themes, axios, react-hook-form + zod + @hookform/resolvers, mapbox-gl, lucide-react
- Palette Tailwind custom `primary-50..900` (bleu), variables CSS light/dark (`--background`, `--foreground`, `--card`, `--border`, etc.)
- Police Inter (next/font/google), variable CSS `--font-inter`
- JWT stocké dans cookie httpOnly via route API Next.js `/api/auth/set-cookie` (BFF pattern)
- Middleware `/app/*` → redirige vers `/login` si cookie absent
- i18n : `next-intl`, détection via cookie `locale`, messages FR/EN dans `messages/`
- Thème : `next-themes`, sélection light/dark/system dans paramètres
- Pages créées : `/` (landing), `/login`, `/register`, `/auth/callback/google`, `/auth/callback/apple`, `/app/layout`, `/app/dashboard`, `/app/vehicles`, `/app/favorites`, `/app/settings`
- Composants UI : Button, Input, Select, Card, Modal, LogoutButton
- ToastProvider (context) : success/error/info, auto-dismiss 4s
- Providers wrapper : ThemeProvider + ToastProvider
- lib/api.ts : axios avec intercepteur JWT depuis cookie + redirect /login si 401
- lib/auth.ts : register(), login(), logout()
- .env.example : NEXT_PUBLIC_API_URL + NEXT_PUBLIC_MAPBOX_TOKEN
- Carte interactive et calcul de trajet : prochaine étape
- Build : 14 routes compilées sans erreur (TS + Next.js)

### 2026-05-20 — Favorites, i18n, Shared Types
- Module Favorites : CRUD complet (GET list/one, POST, PATCH name, DELETE 204)
- 403 ForbiddenException pour l'accès aux favoris d'un autre utilisateur
- i18n : nestjs-i18n installé, I18nModule configuré dans AppModule, résolution Accept-Language + ?lang=
- Fichiers de traduction : src/i18n/fr/messages.json + en/messages.json (6 namespaces)
- Pattern @Optional() pour I18nService → service fonctionne sans le module (tests)
- nest-cli.json : assets i18n copiés dans dist/ à la compilation
- Shared types : package @tripwise/shared à la racine (TypeScript pur, pas de build)
- Enums FuelType, AuthProvider, ChargingMode ; interfaces User, Vehicle, Favorite, Trip
- Path alias @tripwise/shared dans backend/tsconfig.json + moduleNameMapper dans jest-e2e.json
- Tests e2e : 19/19 favorites — suite complète : 96/96 (7 suites)

### 2026-05-20 — Module Charging Stations
- API : ODRÉ Opendatasoft `bornes-irve` — filtre `within_distance()`, pas de clé API
- ⚠️ Base IRVE sans tarifs — prix proviennent du profil véhicule utilisateur
- findStationsNearPoint : cache 1h, rayon 5 km par défaut
- findStationsAlongRoute : échantillonnage ≤10 points de la LineString GeoJSON
- GET /charging-stations/nearby + POST /along-route (POST car body GeoJSON)
- Extension POST /trips/calculate véhicule électrique :
  - chargingMode : 'home' | 'public' | 'mix' (défaut 'home')
  - chargingMixRatio : proportion home (0-1) pour mode 'mix'
  - cost.type='electric' avec consumptionKwh, pricePerKwh, totalCost, nearbyStations (max 20), disclaimer
  - disclaimer : "Les tarifs affichés sont ceux configurés dans votre profil véhicule. Le coût réel sur une borne publique peut différer."
- Tests e2e : 10/10 charging-stations + 8 nouveaux trips electric — suite complète : 77/77 (6 suites)

### 2026-05-19 — Module Fuel Prices
- API primaire : Opendatasoft `prix-des-carburants-en-france-flux-instantane-v2`
- Filtre géographique `distance()` Opendatasoft (rayon 20 km), tri par distance
- Prix API en millièmes d'euro (÷1000 pour obtenir €/L)
- Cache in-memory Map avec TTL 1h (clé lat:lng:fuelType:count)
- Fallback prix moyens hardcodés si API indisponible ou sans résultat
- FuelType.ELECTRIC exclu du endpoint (400 si passé en query)
- POST /trips/calculate étendu : véhicule thermique → champ `cost` avec consumptionLitres, pricePerLitre, priceSource (originStation + destinationStation), totalCost
- Véhicule électrique : pas de champ `cost`
- FuelPricesModule exporté → importé dans TripsModule
- Tests e2e : 7/7 fuel-prices (FuelPricesService mocké)

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
