# Pilulier connecté avec vérification par image

Projet Capstone — pilulier connecté qui vérifie **par photo** qu'un médicament est
bien sorti de sa case, au lieu de seulement détecter l'ouverture du couvercle
(ce que font tous les piluliers connectés existants).

> Le boîtier physique est **simulé** pendant tout le projet (circuit ESP32 sur
> Wokwi + téléphone en guise de caméra/éclairage). Voir
> [A1 · Périmètre arrêté](docs/A1-perimetre.md) pour le détail de ce choix.

## Par où commencer

| Vous êtes | Lisez |
|---|---|
| un utilisateur du pilulier | [le manuel d'utilisation](docs/MANUEL-UTILISATEUR.md) |
| un correcteur ou un relecteur | [l'index de la documentation](docs/README.md) |
| quelqu'un qui découvre le code | [la vue d'ensemble](docs/FONCTIONNEMENT-vue-ensemble.md) |

## Équipe

| Membre | Rôle |
|---|---|
| Rauf Mifteev | Backend, API, base de données |
| Daniel Alain Dyky | Déploiement, intégration continue, circuit simulé, modèle, documentation technique |
| Chahrazad Tayibi | Application mobile, maquettes, design |

## Structure du dépôt

```
/api             Serveur Node.js + Express + MongoDB (API REST)
/analyse-images  Service d'analyse d'images Python + FastAPI
/mobile          Application mobile React Native (Expo)
/wokwi           Circuit ESP32 simulé sur Wokwi (C++ / Arduino)
/docs            Documentation du projet (cahier des charges, diagrammes, etc.)
render.yaml      Les deux services déployés sur Render
.github/         Intégration continue (GitHub Actions)
```

## Démarrer le projet

### Prérequis

- Node.js 18 ou plus récent
- npm
- Python 3.10 ou plus récent, pour le service d'analyse d'images
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
| `SERVICE_ANALYSE_URL` | Adresse du service d'analyse, terminée par `/analyser` | `http://localhost:5001/analyser` |
| `SERVICE_ANALYSE_TIMEOUT_MS` | Délai maximal accordé au service d'analyse | `9000` |
| `SEUIL_CONFIRMATION_SCORE` | Score minimal pour confirmer une prise (RG-03) | `0.75` |
| `DELAI_VERIFICATION_RETARD_MS` | Fréquence de détection des prises en retard | `300000` |

Aucune valeur secrète n'est écrite dans le code : tout passe par ces variables
d'environnement (`api/src/config/env.js` centralise leur lecture et leur
validation au démarrage).

### Service d'analyse d'images

```bash
cd analyse-images
python -m venv .venv
.venv\Scripts\Activate.ps1   # sous Windows ; sinon source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app:app --reload --port 5001
python -m pytest tests/ -q    # 50 tests
```

Le contrat HTTP est publié sur `http://localhost:5001/docs`. La stratégie de
classification est choisie au démarrage par `MODELE_STRATEGIE` : `factice`,
`seuillage`, `mobilenet` ou `onnx`. Le service déployé utilise `onnx`. Voir `analyse-images/README.md`.

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

Les deux services sont déployés sur **Render** depuis la branche `main`. Le
fichier `render.yaml`, à la racine, les décrit tous les deux et fait référence.
La marche à suivre complète, depuis un dépôt neuf, est dans
[Déployer le projet](docs/DEPLOIEMENT.md).

| Service | Adresse |
|---|---|
| `pilulier-api` | `https://pilulier-api.onrender.com` |
| `pilulier-analyse-images` | `https://pilulier-analyse-images.onrender.com` |

MongoDB Atlas héberge la base de données. Le palier gratuit met en veille un
service inactif : le premier appel après quinze minutes peut prendre une
trentaine de secondes. Les vérifications à faire avant une démonstration sont
dans [la fiche de répétition de la démonstration](docs/repetition-demonstration.md).

## Intégration continue

Un workflow par partie du projet, dans `.github/workflows/`. Chacun ne se
déclenche que sur les fichiers qui le concernent, pour qu'une pull request
n'exécute que ce qui est utile.

| Fichier | Ce qu'il contrôle | Se déclenche sur |
|---|---|---|
| `ci-e1-analyse-images.yml` | pytest du service d'analyse | `analyse-images/**` |
| `ci-e2-api.yml` | Jest de l'API | `api/**` |
| `ci-e3-mobile.yml` | lint de l'application mobile | `mobile/**` |
| `ci-e4-wokwi.yml` | compilation du firmware | `wokwi/**` |
| `ci-e5-deploiement.yml` | cohérence du déploiement | `render.yaml`, `.github/workflows/**` |
| `ci-e6-documentation.yml` | liens entre les documents | `**/*.md` |
| `ci-s3-e1-modele-onnx.yml` | le modèle ONNX est versionné, aucun `.pt` ne l'est, et le modèle tourne sans PyTorch | `analyse-images/**` |

Une pull request ne peut pas être fusionnée dans `main` si un contrôle échoue.
La protection de branche qui l'impose est décrite dans
[E1 · Dépôt de code](docs/E1-depot-code.md).

## Documentation

**Vous utilisez le pilulier ?** Lisez le
[manuel d'utilisation](docs/MANUEL-UTILISATEUR.md). Il est écrit pour le
patient, pas pour les développeurs, et ne demande aucune connaissance
technique.

Le dossier `docs/` contient tous les livrables du projet, cadrage et
diagrammes compris. Commencer par [l'index de la documentation](docs/README.md),
qui les liste, puis par
[la vue d'ensemble](docs/FONCTIONNEMENT-vue-ensemble.md) pour comprendre
comment les morceaux s'assemblent. Le plan de documentation est en
[D5](docs/D5-plan-documentation.md).

## Outils d'IA utilisés

Voir [D5 · Plan de documentation](docs/D5-plan-documentation.md) pour la déclaration des outils d'IA
générative utilisés par l'équipe.
