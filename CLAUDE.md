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
- ORM : à définir (Prisma ou TypeORM — décision en attente)
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

## Journal des décisions & mises à jour

### 2026-05-19 — Initialisation du projet
- Création de la structure monorepo (backend, web, mobile, shared)
- Stack décidée : NestJS + PostgreSQL + Next.js 14 + Expo
- APIs externes identifiées : Mapbox, prix-carburants.gouv.fr, IRVE
- ORM non encore choisi (Prisma vs TypeORM — à trancher lors de l'init backend)
- Dépôt git initialisé avec commit initial
- backend/, web/ et mobile/ non encore scaffoldés (étape suivante)
