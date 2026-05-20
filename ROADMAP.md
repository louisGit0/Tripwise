# Tripwise — Roadmap

Les fonctionnalités ci-dessous sont **hors scope V1** et prévues pour les versions suivantes.
Elles sont classées par priorité estimée et complexité d'implémentation.

---

## Court terme (V1.1)

### Péages routiers
- **Problème** : le coût réel d'un trajet inclut les péages, surtout en France (autoroutes).
- **Solution envisagée** : intégration de l'API [TollGuru](https://tollguru.com/) ou d'une base manuelle des tarifs ASFA mis à jour trimestriellement.
- **Approche alternative** : base de données statique des péages français (données ASFA publiques) avec calcul côté backend selon l'axe emprunté par la route Mapbox.
- **Complexité** : moyenne. TollGuru dispose d'une API compatible Mapbox Directions.

### Historique des calculs (session)
- Stocker les N derniers trajets calculés côté client (localStorage web / AsyncStorage mobile).
- Pas de persistence serveur — simple liste côté client, effacée à la déconnexion.
- **Complexité** : faible.

### Export PDF du résultat
- Générer un PDF récapitulatif du trajet (distance, durée, coût, carte statique Mapbox).
- Utile pour les notes de frais professionnelles.
- **Complexité** : faible (librairie `pdf-lib` ou `jsPDF` côté web).

---

## Moyen terme (V1.2)

### Historique persistant des trajets
- Nouvelle entité `TripHistory` liée à l'utilisateur.
- Endpoint `POST /trips/history` déclenché automatiquement après chaque calcul.
- Endpoint `GET /trips/history` avec pagination et filtres (véhicule, période, coût min/max).
- **Complexité** : moyenne (migration DB, module NestJS, UI list).

### Multi-devises
- Utile pour les trajets transfrontaliers (France → Espagne, Belgique, etc.).
- Récupération des taux de change via l'API publique [Frankfurter](https://www.frankfurter.app/) (BCE).
- Prix carburant affiché dans la devise locale du pays de destination.
- **Complexité** : moyenne (logique de conversion, UI selector).

### Comparateur de véhicules
- Calculer et comparer le coût d'un même trajet pour plusieurs véhicules simultanément.
- Affichage côte à côte des résultats avec le delta en euros.
- Utile pour aider à choisir entre deux voitures.
- **Complexité** : faible (appels parallèles `POST /trips/calculate`, UI comparaison).

### Partage de coût entre passagers
- Saisir le nombre de passagers → diviser le coût total.
- Pas de fonctionnalité sociale — simple division affichée dans le résultat.
- **Complexité** : très faible (calcul côté frontend uniquement).

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

### Intégration cartes statiques dans le partage
- Générer une image statique de la carte (Mapbox Static Images API) à joindre au partage.
- **Complexité** : faible.

### Notifications push — alertes prix carburant
- Notifier l'utilisateur quand le prix du carburant baisse sous un seuil configuré près de chez lui.
- Nécessite `expo-notifications` + tâche cron backend.
- **Complexité** : moyenne.

### PWA (web)
- Manifest + Service Worker pour le frontend web.
- Installation en tant qu'app sur mobile depuis le navigateur.
- Fonctionnement offline partiel (résultats récents mis en cache).
- **Complexité** : faible à moyenne.

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
- **Redis** : non nécessaire en V1 (cache in-memory suffisant) ; à introduire si plusieurs instances backend.
- **Refresh tokens** : JWT 7j actuellement (compromis UX/sécurité) ; à remplacer par access 15min + refresh 30j si usage professionnel.
- **Tests mobile** : Jest + React Native Testing Library non configurés en V1 (priorisation du delivery) ; à ajouter en V1.1.
