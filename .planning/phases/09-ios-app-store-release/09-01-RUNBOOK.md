---
phase: 09-ios-app-store-release
plan: 01
type: runbook
audience: user (account/credential-gated steps EAS + App Store Connect)
created: 2026-06-03
---

# Phase 9 — iOS Release · RUNBOOK (étapes à exécuter par toi)

> L'agent a préparé tout le code/la config (voir « Fait par l'agent » plus bas).
> Ce runbook couvre ce qui exige **tes identifiants Apple/EAS** et ne peut pas être automatisé.
> Toutes les commandes EAS se lancent **depuis `mobile/`**.

## Pré-requis
- Compte **Apple Developer Program** actif (✅ tu l'as).
- EAS CLI : `npm install -g eas-cli` puis `eas login` (vérifie : `eas whoami`).
- Un **iPhone physique** pour le smoke TestFlight (Sign in with Apple ne marche pas en simulateur).

---

## A. Lier le projet EAS (une fois)
```bash
cd mobile
eas init
```
`eas init` affiche un **projectId**. Comme on utilise `app.config.ts` (config dynamique), ajoute-le
manuellement dans `app.config.ts` :
```ts
extra: {
  eas: { projectId: '<projectId-affiché>' },
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
  mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '',
},
```

## B. Variables d'environnement de PRODUCTION (une fois) — CRITIQUE
Sans ça, le build prod pointe sur `localhost` et l'app est inutilisable. Le profil `production`
de `eas.json` lit l'environnement `production` (déjà configuré : `"environment": "production"`).
```bash
# Remplace par TON URL Render réelle (celle utilisée par le web sur Vercel) :
eas env:create --environment production --name EXPO_PUBLIC_API_URL \
  --value "https://<ton-app>.onrender.com/api/v1" --visibility plaintext

# Token Mapbox PUBLIC (pk.…) — restreins-le ensuite au bundle id dans le dashboard Mapbox :
eas env:create --environment production --name EXPO_PUBLIC_MAPBOX_TOKEN \
  --value "pk.xxxxx" --visibility sensitive

# Token Mapbox SECRET (sk.…, scope DOWNLOADS:READ) — nécessaire au build du plugin @rnmapbox :
eas env:create --environment production --name MAPBOX_DOWNLOAD_TOKEN \
  --value "sk.xxxxx" --visibility secret
```
Vérifie : `eas env:list --environment production`.
Puis dans **account.mapbox.com → Access tokens** : restreins le token public à
`com.verygoodtrip.app` (URL/app restrictions).

## C. Fiche App Store Connect (une fois)
1. **developer.apple.com** → Certificates, Identifiers & Profiles → Identifiers →
   enregistre l'App ID **`com.verygoodtrip.app`** et **active la capability « Sign In with Apple »**.
2. **appstoreconnect.apple.com** → Apps → **＋ New App** :
   - Plateforme : iOS · Nom : **verygoodtrip** · Langue principale : **Français**
   - Bundle ID : `com.verygoodtrip.app` · SKU : `com.verygoodtrip.app`
3. Récupère et envoie-moi (ou renseigne dans `mobile/eas.json`) :
   - **Apple ID (ASC App ID)** : le numéro affiché sur la fiche → `submit.production.ios.ascAppId`
   - **Team ID** : developer.apple.com → Membership → `submit.production.ios.appleTeamId`

## D. Clé API App Store Connect (pour `eas submit`, évite la 2FA)
ASC → **Users and Access → Integrations → App Store Connect API → Keys** → génère une clé
(rôle **App Manager**). Télécharge le **`.p8` (une seule fois)**, note **Key ID** + **Issuer ID**.
Ne commit JAMAIS le `.p8`. Renseigne dans `eas.json` (ou passe en flags au submit) :
```jsonc
"submit": { "production": { "ios": {
  "ascApiKeyPath": "./asc-api-key.p8",   // hors git (.gitignore)
  "ascApiKeyId": "<KEY_ID>",
  "ascApiKeyIssuerId": "<ISSUER_ID>",
  "appleTeamId": "<TEAM_ID>",
  "ascAppId": "<ASC_APP_ID>"
}}}
```
> Ajoute `asc-api-key.p8` et `*.p8` à `mobile/.gitignore` si absent.

## E. Build de production
```bash
cd mobile
eas build --platform ios --profile production
```
À la 1re exécution, EAS propose de **gérer les credentials** (certificat de distribution +
provisioning profile) → accepte « Let EAS manage ». Connexion Apple requise.

## F. Smoke TestFlight (recommandé, avant review)
Installe le build sur un **iPhone physique** via TestFlight et vérifie :
- inscription e-mail **et** Sign in with Apple,
- calcul d'un trajet (→ confirme que l'app tape bien le backend **prod**, pas localhost),
- photos de véhicules qui se chargent,
- **Paramètres → Zone de danger → Supprimer mon compte** (doit déconnecter + effacer).

## G. Soumission
```bash
eas submit --platform ios --profile production --latest
```
Puis dans App Store Connect, remplis la fiche (voir `09-CONTEXT.md` D-44) :
- **Nom / Sous-titre / Mots-clés / Texte promotionnel** (D-44)
- **Catégorie** : Travel (secondaire Navigation) · **Âge** : 4+ · **Prix** : Gratuit
- **URL Politique de confidentialité** : `https://<domaine>/privacy`
- **URL Support** : `https://<domaine>/support`
- **App Privacy** (nutrition labels) : recopie la section « App Privacy » de `09-CONTEXT.md`
- **Captures** : 5 captures iPhone FR en **6.7"** (1290×2796) **et** **6.5"** (1242×2688)
- **App Review Information** : fournis un **compte de démo** (e-mail + mot de passe d'un user
  réel avec véhicules + trajets seedés) + les notes reviewer (D-44)
- Conformité export : déjà gérée (`ITSAppUsesNonExemptEncryption: false`) → aucune question.
Clique **Submit for Review**.

---

## Fait par l'agent (Wave 1 + 2 — déjà committé)
- **Suppression de compte in-app** (exigence Apple 5.1.1) : `DELETE /api/v1/users/me` (JWT, cascade
  véhicules/favoris/trajets, 204, e2e) + entrée « Supprimer mon compte » avec confirmation dans
  **Paramètres web** et **Paramètres mobile**.
- **Pages légales** publiques : `/privacy` (RGPD) + `/support` (FAQ + contact) sur le web Vercel.
- **`app.config.ts`** : `ITSAppUsesNonExemptEncryption: false`, `supportsTablet: false` (release iPhone-first).
- **`eas.json`** : profil `production` lié à l'environnement `production` (injecte les env vars ci-dessus).
- Métadonnées App Store + App Privacy : rédigées dans `09-CONTEXT.md` (D-44).

## Reste 100 % côté toi (gated)
A.projectId · B.env vars + restriction Mapbox · C.fiche ASC (+ Team ID/ASC App ID) ·
D.clé .p8 · E.build · F.smoke · G.submit + captures + compte démo.
