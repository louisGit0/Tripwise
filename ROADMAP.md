# Tripwise — Roadmap

Les fonctionnalités ci-dessous sont **hors scope V1** et prévues pour les versions suivantes.
Elles sont classées par priorité estimée et complexité d'implémentation.

---

## V1 — Fonctionnalités livrées ✅

Pour mémoire, voici ce qui a été inclus dans la V1 :

- Calcul de trajet (autocomplétion Mapbox, distance, durée, coût réel)
- Comparaison multi-énergie automatique (essence / diesel / électrique)
- Gestion de plusieurs véhicules avec véhicule par défaut
- Prix carburant en temps réel (Opendatasoft) + bornes IRVE
- Historique de trajets persistant (sauvegarde, archivage, notes, stats mensuelles)
- Favoris avec réutilisation en un clic
- Partage de coût par passager (jusqu'à 9 passagers)
- Configuration des prix carburant personnalisés
- Authentification email + OAuth Google + OAuth Apple (iOS)
- Web (Next.js 15) + Mobile (Expo SDK 54)
- Internationalisation FR/EN complète

---

## Court terme (V1.1)

### Péages routiers
- **Problème** : le coût réel d'un trajet inclut les péages, surtout en France (autoroutes).
- **Solution envisagée** : intégration de l'API [TollGuru](https://tollguru.com/) ou d'une base manuelle des tarifs ASFA mis à jour trimestriellement.
- **Approche alternative** : base de données statique des péages français (données ASFA publiques) avec calcul côté backend selon l'axe emprunté par la route Mapbox.
- **Complexité** : moyenne. TollGuru dispose d'une API compatible Mapbox Directions.

### Export PDF du résultat
- Générer un PDF récapitulatif du trajet (distance, durée, coût, carte statique Mapbox).
- Utile pour les notes de frais professionnelles.
- **Complexité** : faible (librairie `pdf-lib` ou `jsPDF` côté web).

### Tests mobile (React Native Testing Library)
- Jest + React Native Testing Library non configurés en V1 (priorisation du delivery).
- Cibler 60%+ de couverture sur les hooks et utilitaires mobiles.
- **Complexité** : faible.

### Mode hors-ligne partiel (web)
- Mettre en cache les derniers résultats dans IndexedDB.
- Afficher un bandeau "Hors ligne" et servir les données en cache.
- **Complexité** : faible.

---

## Moyen terme (V1.2)

### PWA (web)
- Manifest + Service Worker pour le frontend Next.js.
- Installation en tant qu'app sur mobile depuis le navigateur.
- Fonctionnement offline partiel (résultats récents, favoris mis en cache).
- **Complexité** : faible à moyenne.

### Multi-devises
- Utile pour les trajets transfrontaliers (France → Espagne, Belgique, Suisse…).
- Récupération des taux de change via l'API publique [Frankfurter](https://www.frankfurter.app/) (BCE).
- Prix carburant affiché dans la devise locale du pays de destination.
- **Complexité** : moyenne (logique de conversion, UI selector).

### Carte plein écran et style satellite
- Option d'affichage de la carte Mapbox en plein écran avec style satellite.
- Visualisation améliorée du tracé du trajet.
- **Complexité** : faible.

### Intégration cartes statiques dans le partage
- Générer une image statique de la carte (Mapbox Static Images API) à joindre au partage.
- **Complexité** : faible.

### Notifications push — alertes prix carburant
- Notifier l'utilisateur quand le prix du carburant baisse sous un seuil configuré près de chez lui.
- Nécessite `expo-notifications` + tâche cron backend.
- **Complexité** : moyenne.

---

## Long terme (V2)

### Géolocalisation background et historique automatique
- Détecter automatiquement les déplacements en voiture (distance, vitesse).
- Enregistrer les trajets sans saisie manuelle.
- Nécessite `expo-location` avec permission `BACKGROUND` et une stratégie de détection (distance parcourue, vitesse, mode de transport).
- **Complexité** : élevée (confidentialité des données, autonomie batterie, précision).

### Application desktop (Electron ou Tauri)
- Réutiliser le frontend web Next.js dans un shell Electron/Tauri pour une app desktop.
- Utile pour les gestionnaires de flotte.
- **Complexité** : moyenne (packaging uniquement, pas de nouveau code métier).

### Gestion de flotte (B2B)
- Compte entreprise avec plusieurs conducteurs.
- Tableau de bord administrateur : kilométrages, coûts par véhicule, remboursements.
- **Complexité** : élevée (multi-tenant, rôles, rapports).

### Refresh tokens (sécurité renforcée)
- Remplacer le JWT 7j par access token 15min + refresh token 30j.
- Nécessite un endpoint `POST /auth/refresh` et une gestion côté client.
- **Complexité** : moyenne.

### Redis (mise à l'échelle)
- Remplacer le cache in-memory des prix carburants et des bornes IRVE par Redis.
- Nécessaire si plusieurs instances backend (déploiement en cluster).
- **Complexité** : faible (configuration uniquement).

---

## APIs envisagées

| Fonctionnalité | API candidate | Modèle tarifaire |
|----------------|--------------|-----------------|
| Péages | TollGuru | Freemium (10k req/mois gratuit) |
| Péages (alternative) | ASFA (données statiques) | Gratuit (données publiques) |
| Taux de change | Frankfurter / BCE | Gratuit |
| Carte statique | Mapbox Static Images | Inclus dans quota Mapbox |
| Notifications | Expo Push Notifications | Gratuit |
| Prix carburant EU | European Commission Oil Bulletin | Gratuit (hebdomadaire) |

---

## Décisions différées

- **Multi-tenant / SaaS** : non envisagé avant une validation du marché.
- **Redis** : non nécessaire en V1 (cache in-memory suffisant pour une instance) ; à introduire si déploiement multi-instances.
- **Refresh tokens** : JWT 7j actuellement (compromis UX/sécurité acceptable pour un usage personnel) ; à remplacer par access 15min + refresh 30j si usage professionnel.
- **Tests mobile** : non configurés en V1 (priorisation du delivery) ; à ajouter en V1.1.
- **WebSocket (temps réel)** : non nécessaire en V1 ; envisageable pour les alertes prix ou le mode collaboratif en V2.
