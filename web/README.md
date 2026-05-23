# Tripwise — Frontend Web

Application Next.js 15 pour le calcul du coût de trajet voiture.

## Stack

- **Next.js 15** (App Router, TypeScript strict)
- **Tailwind CSS 3** (dark mode, palette `primary-*`)
- **next-intl** (i18n FR/EN, détection par cookie)
- **next-themes** (light / dark / system)
- **axios** (intercepteur JWT depuis cookie)
- **react-hook-form + zod** (formulaires)
- **mapbox-gl** (carte interactive, import dynamique SSR-safe)
- **lucide-react** (icônes)

## Prérequis

- Node.js 20+
- Backend NestJS démarré (voir `../backend/`)

## Installation

```bash
cd web
cp .env.example .env.local
# Remplir NEXT_PUBLIC_API_URL et NEXT_PUBLIC_MAPBOX_TOKEN
npm install
```

## Démarrage

```bash
npm run dev       # http://localhost:3001
npm run build     # build de production
npm run type-check # vérification TypeScript sans emit
npm run lint      # ESLint
npm run format    # Prettier
```

## Variables d'environnement

| Variable | Requis | Description |
|----------|--------|-------------|
| `NEXT_PUBLIC_API_URL` | Oui | URL du backend (ex. `http://localhost:3000/api/v1`) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Oui | Token Mapbox public |

### Sécurité token Mapbox

`NEXT_PUBLIC_MAPBOX_TOKEN` est visible dans le bundle JS client (normal pour mapbox-gl).
**Restreindre ce token aux domaines autorisés** dans le dashboard Mapbox :
[account.mapbox.com](https://account.mapbox.com) → Access tokens → URL restrictions.

## Architecture

```
src/
├── app/
│   ├── layout.tsx              # Root layout (Inter, next-intl, Providers)
│   ├── page.tsx                # Landing /
│   ├── login/                  # /login
│   ├── register/               # /register
│   ├── auth/callback/          # Callbacks OAuth (Google, Apple)
│   ├── api/auth/               # Routes BFF (set-cookie, logout)
│   └── app/                    # Section authentifiée
│       ├── layout.tsx          # Navigation (top desktop + bottom mobile)
│       ├── dashboard/          # Calculateur + carte
│       ├── vehicles/           # CRUD véhicules
│       ├── favorites/          # Liste favoris
│       └── settings/           # Thème + langue
├── components/
│   ├── AutocompleteInput.tsx   # Géocodage avec debounce
│   ├── MapboxMap.tsx           # Carte (client-only)
│   ├── AppNav.tsx              # Navigation
│   └── ui/                    # Button, Input, Select, Card, Modal
├── lib/
│   ├── api.ts                  # Axios + intercepteur JWT
│   └── auth.ts                 # register, login, logout, setAuthCookie
├── providers/
│   ├── Providers.tsx           # ThemeProvider + ToastProvider
│   └── ToastProvider.tsx       # Toasts (success/error/info, 4s)
├── hooks/
│   └── useDebounce.ts
├── i18n/
│   └── request.ts              # Détection locale (cookie)
└── types/
    └── api.ts                  # Types TypeScript frontend
```

## JWT & Authentification

Le JWT est stocké dans un cookie `access_token` (non-httpOnly, lisible par Axios).
Le middleware Next.js (`middleware.ts`) protège `/app/*` et redirige vers `/login` si absent.
