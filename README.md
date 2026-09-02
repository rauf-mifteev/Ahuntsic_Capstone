# Pilulier connecté avec vérification par image

Projet Capstone — pilulier connecté qui vérifie **par photo** qu'un médicament est
bien sorti de sa case, au lieu de seulement détecter l'ouverture du couvercle
(ce que font tous les piluliers connectés existants).

> Le boîtier physique est **simulé** pendant tout le projet (circuit ESP32 sur
> Wokwi + téléphone en guise de caméra/éclairage). Voir `docs/A1-perimetre.md`
> dans le dossier de documentation du projet pour le détail de ce choix.

## Équipe

| Membre | Rôle |
|---|---|
| Rauf Mifteev | Backend, API, base de données |
| Daniel Alain Dyky | Déploiement, intégration continue, circuit simulé, modèle, documentation technique |
| Chahrazad Tayibi | Application mobile, maquettes, design |

## Structure du dépôt

```
/api           Serveur Node.js + Express + MongoDB (API REST)
/mobile        Application mobile React Native (Expo)
/wokwi         Circuit ESP32 simulé sur Wokwi (C++ / Arduino)
/docs          Documentation du projet (cahier des charges, diagrammes, etc.)
.github/       Intégration continue (GitHub Actions)
```

## Démarrer le projet

### Prérequis

- Node.js 18 ou plus récent
- npm
- Un compte MongoDB Atlas (palier gratuit) pour la base de données
- Pour l'application mobile : Expo Go sur un téléphone, ou un émulateur

### API

```bash
cd api
npm install
cp .env.example .env      # puis remplir les valeurs (voir ci-dessous)
npm run dev                # démarre l'API en local sur http://localhost:3000
npm test                   # exécute les tests unitaires et d'intégration
```

Variables d'environnement (`api/.env`) :

| Variable | Rôle | Exemple |
|---|---|---|
| `PORT` | Port d'écoute HTTP | `3000` |
| `MONGODB_URI` | Chaîne de connexion MongoDB Atlas | `mongodb+srv://...` |
| `JWT_SECRET` | Clé de signature des jetons d'authentification | (chaîne aléatoire longue) |
| `JWT_EXPIRES_IN` | Durée de validité d'un jeton | `7d` |
| `CORS_ORIGIN` | Origine autorisée pour l'application mobile | `*` en développement |

Aucune valeur secrète n'est écrite dans le code : tout passe par ces variables
d'environnement (`api/src/config/env.js` centralise leur lecture et leur
validation au démarrage).

### Application mobile

```bash
cd mobile
npm install
cp .env.example .env       # EXPO_PUBLIC_API_URL doit pointer vers l'API (locale ou déployée)
npm start                  # ouvre Expo ; scanner le code avec Expo Go
```

### Circuit simulé (Wokwi)

Le dossier `/wokwi` contient le firmware ESP32 (`src/main.cpp`), le schéma du
circuit (`diagram.json`) et la configuration Wokwi (`wokwi.toml`). Voir
`wokwi/README.md` pour les instructions d'ouverture dans Wokwi et la
configuration de l'URL de l'API et du mot de passe Wi-Fi simulé.

## Déploiement

L'API est déployée en continu depuis la branche `main` (voir
`docs/sprint-1/03-deploiement.md` pour la procédure détaillée et l'adresse
publique). MongoDB Atlas héberge la base de données.

## Intégration continue

Chaque *push* et chaque *pull request* déclenchent `.github/workflows/ci.yml` :
installation des dépendances de l'API et exécution de la suite de tests Jest.
Une pull request ne peut pas être fusionnée dans `main` si la CI échoue (voir
la section « Réglages GitHub » ci-dessous).

## Réglages GitHub (à faire une fois, dans les paramètres du dépôt)

1. **Settings → Branches → Add branch protection rule** sur `main`.
2. Cocher *Require a pull request before merging* et *Require approvals* (≥ 1).
3. Cocher *Require status checks to pass before merging*, puis sélectionner le
   check `test` (celui défini dans `ci.yml`).
4. Cocher *Do not allow bypassing the above settings* si l'option est offerte.

## Documentation

Le dossier `docs/` (au sens du plan de documentation, section D5) contient les
livrables du projet. La documentation de conception (Partie A, diagrammes,
etc.) provient des livrables du Sprint 0 et est versionnée séparément.

## Outils d'IA utilisés

Voir `docs/D5-plan-documentation.md` pour la déclaration des outils d'IA
générative utilisés par l'équipe.
