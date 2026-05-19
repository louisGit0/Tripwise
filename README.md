# Tripwise

Application de calcul du coût d'un trajet voiture — essence ou électrique — entre deux points.
Disponible en web et mobile avec un backend commun.

---

## Fonctionnalités

- **Calcul de coût** : saisie d'un départ et d'une arrivée, calcul automatique de la distance, de la durée et du coût selon le carburant du véhicule
- **Véhicules multiples** : gérez plusieurs voitures (thermique ou électrique) avec leur consommation réelle
- **Prix en temps réel** : carburant via prix-carburants.gouv.fr, bornes de recharge via IRVE
- **Favoris** : sauvegardez vos trajets fréquents
- **Partage** : partagez le résultat d'un trajet en un clic
- **Multilingue** : Français et Anglais
- **Thème** : light / dark mode

---

## Stack technique

| Couche | Technologie |
|--------|------------|
| Backend | Node.js · NestJS · TypeScript |
| Base de données | PostgreSQL |
| Web | Next.js 14 · App Router · Tailwind CSS |
| Mobile | Expo · React Native · TypeScript |
| Infra | Docker · Docker Compose |

---

## Structure du monorepo

```
Tripwise/
├── backend/          API NestJS
├── web/              Frontend Next.js
├── mobile/           Application Expo React Native
├── shared/           Types TypeScript partagés
├── docker-compose.yml
└── README.md
```

---

## Démarrage rapide

> Prérequis : Node.js 20+, Docker Desktop, Expo CLI

### 1. Cloner le dépôt

```bash
git clone <repo-url>
cd Tripwise
```

### 2. Variables d'environnement

Copiez les fichiers d'exemple dans chaque package :

```bash
cp backend/.env.example backend/.env
cp web/.env.example web/.env.local
```

Renseignez au minimum :
- `MAPBOX_ACCESS_TOKEN` — clé Mapbox (Directions API)
- `DATABASE_URL` — connexion PostgreSQL

### 3. Lancer le backend (Docker)

```bash
docker compose up -d
```

Le backend NestJS est accessible sur `http://localhost:3000`.  
PostgreSQL tourne sur le port `5432`.

### 4. Lancer le frontend web

```bash
cd web
npm install
npm run dev
```

Accessible sur `http://localhost:3001`.

### 5. Lancer l'application mobile

```bash
cd mobile
npm install
npx expo start
```

Scannez le QR code avec l'app Expo Go ou lancez un émulateur.

---

## APIs externes

| Service | Usage |
|---------|-------|
| [Mapbox Directions](https://docs.mapbox.com/api/navigation/directions/) | Calcul d'itinéraire |
| [prix-carburants.gouv.fr](https://data.prix-carburants.gouv.fr) | Prix des carburants France |
| [IRVE — data.gouv.fr](https://www.data.gouv.fr/fr/datasets/fichier-consolide-des-bornes-de-recharge-pour-vehicules-electriques/) | Bornes de recharge électrique |

---

## Licence

Projet personnel — tous droits réservés.
