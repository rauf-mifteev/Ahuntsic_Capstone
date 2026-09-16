# Pilulier connecté avec vérification par image

## Description

Ce projet est réalisé dans le cadre du **Projet intégrateur (420-321-AH)** de l'AEC
*Internet des objets et intelligence artificielle*, au Collège Ahuntsic, à l'été 2026.

Beaucoup de gens ne prennent pas leurs médicaments comme prescrit, et ça finit à
l'hôpital. Des piluliers connectés existent déjà, mais ils ont tous la même limite :
ils détectent qu'une case a été **ouverte**, et rien de plus. Une case ouverte par
erreur, refermée sans rien prendre, donne exactement le même signal qu'une vraie prise.

**Ce projet regarde ce qu'il y a dans la case.** Une photo du plateau est analysée à
chaque fermeture du couvercle et comparée à la précédente. Si le comprimé a disparu, la
prise a vraiment eu lieu. Quand le système n'est pas sûr, il le dit au lieu de deviner.

Le boîtier physique n'est pas construit : il est **simulé** pendant tout le projet, avec
un circuit ESP32 sur Wokwi. Ce choix est expliqué dans
[A1 · Périmètre arrêté](docs/A1-perimetre.md). Le code du circuit est réel et envoie de
vraies requêtes vers l'API en ligne : seule l'électronique est simulée.

## L'équipe

| Membre | Ce qu'il a fait |
|---|---|
| **Rauf Mifteev** | Backend, API, base de données, déploiement |
| **Daniel Alain Dyky** | Intégration continue, modèle d'intelligence artificielle, documentation technique |
| **Chahrazad Tayibi** | Application mobile, maquettes, design, circuit simulé |

## Les quatre morceaux du système

Le projet n'est pas un seul programme, mais quatre, qui se parlent par HTTP.

| Morceau | Technologies | Ce qu'il fait |
|---|---|---|
| **API** (`/api`) | Node.js, Express, MongoDB Atlas | Le cerveau. Reçoit les événements du pilulier, commande l'analyse, compare les résultats, décide si une prise a eu lieu, sert l'application mobile. C'est le seul service que les autres appellent. |
| **Service d'analyse d'images** (`/analyse-images`) | Python, FastAPI, OpenCV, ONNX Runtime | L'œil. On lui donne une image de plateau, il rend 28 verdicts « vide ou pleine » avec un score. Faute de caméra, c'est aussi lui qui **dessine** l'image du plateau. |
| **Application mobile** (`/mobile`) | React Native, Expo | Ce que le patient voit. Configuration, résultats, historique, taux de régularité. Elle ne parle qu'à l'API. |
| **Circuit simulé** (`/wokwi`) | C++, ESP32, Wokwi | Le pilulier. Détecte l'ouverture et la fermeture du couvercle, allume les voyants, garde en mémoire ce qu'il n'a pas pu envoyer. |

## Ce qui se passe quand le patient prend un médicament

Voici le trajet complet d'une prise, de bout en bout.

1. **Le pilulier** détecte que le couvercle vient de se refermer et le signale à l'API.
   Il n'envoie aucune photo : c'est un circuit simulé, il n'a pas de caméra.
2. **L'API** enregistre l'événement tout de suite, avant toute analyse, pour qu'une
   panne ne fasse jamais perdre la trace d'une ouverture. Puis elle demande une photo du
   plateau au service d'analyse.
3. **Le service d'analyse** produit l'image, la découpe en 28 cases, et dit pour chacune
   si elle est vide ou pleine, avec un score entre 0 et 1.
4. **L'API** compare ces 28 états à la photo de référence, celle prise au remplissage du
   début de semaine. Une case passée de pleine à vide devient une prise confirmée. Si le
   score est trop bas, elle est marquée « ambiguë » et le patient tranche lui-même : le
   système ne devine jamais à sa place.
5. **L'application mobile** affiche le résultat, l'historique et le taux de régularité.

Le détail de chaque étape est dans
[la vue d'ensemble](docs/FONCTIONNEMENT-vue-ensemble.md).

## Documentation

**Pour la personne qui utilise le pilulier.** Lisez
**[le manuel d'utilisation](docs/MANUEL-UTILISATEUR.md)**. Écrit pour le patient, il ne
demande aucune connaissance technique et couvre tout le parcours, de la création du
compte à la lecture des résultats.

**Pour la personne qui cherche un document.** Tous les livrables vivent dans `docs/` :
commencez par **[l'index de la documentation](docs/README.md)**, qui dit en une ligne à
quoi chaque document sert. Le plan de documentation est en
**[D5](docs/D5-plan-documentation.md)**.

**Pour la personne qui reprend le code.** Lisez
**[la vue d'ensemble](docs/FONCTIONNEMENT-vue-ensemble.md)**, qui explique comment les
quatre morceaux se parlent et ce qui est simulé. Pour mettre le projet en ligne
vous-même, la marche à suivre est dans **[Déployer le projet](docs/DEPLOIEMENT.md)**.

## Le produit en ligne

Les deux serveurs tournent sur **Render**, au palier gratuit.

| Service | Adresse |
|---|---|
| API | <https://pilulier-api.onrender.com> |
| Service d'analyse d'images | <https://pilulier-analyse-images.onrender.com> |
| Page interactive du service d'analyse | <https://pilulier-analyse-images.onrender.com/docs> |

> Le palier gratuit met un service en veille après une quinzaine de minutes sans trafic.
> Le premier appel peut alors prendre 30 à 50 secondes. Le second est immédiat. Ce n'est
> pas une panne.

L'application mobile n'est publiée sur aucun magasin : elle se lance depuis un
ordinateur et s'ouvre avec Expo Go.

## Prérequis

**Pour faire tourner le projet sur votre machine :**

- **Node.js 18 ou plus récent**, et npm. Ils font tourner l'API et servent aussi à
  lancer l'application mobile.
- **Python 3.10 ou plus récent**, pour le service d'analyse d'images.
- **Un compte MongoDB Atlas**, au palier gratuit. C'est la base de données de l'API.
- **Expo Go** sur un téléphone, ou un émulateur, pour ouvrir l'application mobile.

Pour faire tourner le circuit simulé, il faut deux outils de plus. Ils ne servent qu'à
lui : les trois autres parties fonctionnent sans.

- **PlatformIO**, qui compile le firmware de l'ESP32. L'extension pour Visual Studio
  Code suffit, la commande `pio run` fait le reste.
- **L'extension Wokwi Simulator** pour Visual Studio Code, qui lance la simulation à
  partir de `wokwi.toml`. On peut aussi s'en passer et déposer `diagram.json` et
  `wokwi.toml` sur wokwi.com, sans rien installer.

Rien d'autre n'est à installer à la main. Les bibliothèques de chaque partie sont posées
par `npm install` et `pip install` : Express et Mongoose du côté de l'API, FastAPI,
OpenCV et ONNX Runtime du côté du service d'analyse, React Native et Expo du côté
mobile. Les versions exactes sont dans `api/package.json`,
`analyse-images/requirements.txt` et `mobile/package.json`.

**Pour déployer le projet en ligne, il faut en plus :**

- **Un compte Render**, au palier gratuit. C'est lui qui héberge les deux serveurs, en
  lisant le fichier `render.yaml` à la racine du dépôt.
- **Un compte GitHub**, puisque Render construit les deux services à partir du dépôt.

La marche à suivre complète est dans [Déployer le projet](docs/DEPLOIEMENT.md).

## Installation et démarrage

### 1. L'API

```bash
cd api
npm install
cp .env.example .env      # puis remplir les valeurs, voir plus bas
npm run dev               # démarre l'API sur http://localhost:3000
npm test                  # 189 tests
```

Le terminal affiche :

```
API pilulier à l'écoute sur le port 3000 (development)
```

### 2. Le service d'analyse d'images

```bash
cd analyse-images
python -m venv .venv
.venv\Scripts\Activate.ps1   # sous Windows ; sinon source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app:app --reload --port 5001
python -m pytest tests/ -q   # 50 tests
```

Le terminal affiche :

```
Uvicorn running on http://0.0.0.0:5001
```

Ce service publie son propre contrat HTTP, sous forme de page interactive : on y déplie
chaque point d'entrée et on l'essaie depuis le navigateur. En local, c'est
`http://localhost:5001/docs`. Le service déployé expose la même page à l'adresse donnée
plus haut.

### 3. L'application mobile

```bash
cd mobile
npm install
cp .env.example .env      # EXPO_PUBLIC_API_URL doit pointer vers l'API
npm start                 # ouvre Expo ; scanner le code avec Expo Go
npm run lint
```

`localhost` ne fonctionne jamais depuis un téléphone : pour lui, `localhost` désigne le
téléphone lui-même. Utilisez l'adresse de l'API déployée, ou l'adresse IP de
l'ordinateur sur le réseau local.

### 4. Le circuit simulé

Le dossier `/wokwi` contient le firmware (`src/main.cpp`), le schéma du circuit
(`diagram.json`) et la configuration du simulateur (`wokwi.toml`). Les instructions
d'ouverture, l'adresse de l'API à renseigner et le mot de passe Wi-Fi simulé sont dans
[le README du circuit](wokwi/README.md).

## Les routes de l'API

Vingt et une routes, toutes préfixées par `/api`. « Jeton » signifie qu'un jeton
d'authentification doit accompagner la requête.

### Comptes

| Méthode | Route | Accès | Ce qu'elle fait |
|---|---|---|---|
| GET | `/api/sante` | public | Le service répond-il ? |
| POST | `/api/comptes` | public | Créer un compte |
| POST | `/api/comptes/connexion` | public | Se connecter, reçoit un jeton |
| GET | `/api/comptes/moi` | jeton | Le compte connecté |

### Pilulier

| Méthode | Route | Accès | Ce qu'elle fait |
|---|---|---|---|
| GET | `/api/dispositifs/moi` | jeton | Le pilulier du patient et son état de connexion |
| POST | `/api/dispositifs/associer` | jeton | Rattacher un pilulier à son compte |
| PUT | `/api/dispositifs/moi/plages-horaires` | jeton | Changer les heures des quatre créneaux |
| POST | `/api/dispositifs/moi/confirmer-remplissage` | jeton | Déclarer le pilulier rempli ; la prochaine photo devient la référence |

### Médicaments

| Méthode | Route | Accès | Ce qu'elle fait |
|---|---|---|---|
| GET | `/api/medicaments` | jeton | Lister les médicaments |
| POST | `/api/medicaments` | jeton | Ajouter un médicament |
| PUT | `/api/medicaments/:id` | jeton | Modifier un médicament |

### Prises

| Méthode | Route | Accès | Ce qu'elle fait |
|---|---|---|---|
| GET | `/api/prises` | jeton | Les prises du jour et leur état |
| GET | `/api/prises/historique` | jeton | L'historique et le taux d'adhérence |
| GET | `/api/prises/:id` | jeton | Une prise précise |
| PUT | `/api/prises/:id/confirmer` | jeton | Le patient confirme lui-même une prise |
| PUT | `/api/prises/:id/annuler-confirmation` | jeton | Il se corrige |

### Le circuit et la démonstration

| Méthode | Route | Accès | Ce qu'elle fait |
|---|---|---|---|
| POST | `/api/evenements` | le circuit | Signale une ouverture ou une fermeture. Accepte un événement seul ou une liste, ce qui permet au circuit de vider sa mémoire tampon après une coupure. |
| GET | `/api/circuit/:id/commandes-del` | le circuit | Quels voyants allumer |
| GET | `/api/verifications/reference` | jeton | La dernière photo de référence |
| GET | `/api/demo/evenements-recents` | jeton | Le flux de l'écran de démonstration |
| POST | `/api/demo/connexion` | jeton | Couper ou rétablir la connexion du pilulier, pour provoquer une panne |

Le détail de `GET /api/prises/historique`, le calcul du taux d'adhérence et les codes
d'erreur sont dans [L'API — comment elle marche](docs/FONCTIONNEMENT-api.md).

## Les points d'entrée du service d'analyse

| Méthode | Route | Ce qu'elle fait |
|---|---|---|
| GET | `/sante` | Le service répond-il, et avec quelle stratégie ? |
| POST | `/analyser` | Analyse une image, ou photographie le plateau simulé si on ne donne qu'un identifiant |
| POST | `/simulation/remplir` | Les 28 cases deviennent pleines |
| POST | `/simulation/prendre` | Vide une case : « quelqu'un a pris son comprimé » |
| GET | `/simulation/etat` | Les 28 états réels du plateau |

La façon de reconnaître une case se choisit au démarrage, avec la variable
`MODELE_STRATEGIE`.

| Valeur | Comportement |
|---|---|
| `factice` | Répond sans regarder l'image. A servi à développer l'API avant que le modèle existe. |
| `seuillage` | Compte les pixels sombres de chaque case. Aucun entraînement. C'est la solution de secours. |
| `mobilenet` | Le modèle entraîné, exécuté par PyTorch. Ne tourne qu'en local : PyTorch pèse environ 500 Mo. |
| `onnx` | **Le même modèle, exécuté par ONNX Runtime, qui pèse environ 16 Mo. C'est la stratégie du service déployé.** |

Le détail est dans [le README du service](analyse-images/README.md).

## Variables d'environnement

Aucune valeur secrète n'est écrite dans le code. Les fichiers `.env` ne sont jamais
versionnés : seuls les `.env.example` le sont.

### `api/.env`

| Variable | Rôle | Exemple |
|---|---|---|
| `PORT` | Port d'écoute HTTP | `3000` |
| `MONGODB_URI` | Chaîne de connexion MongoDB Atlas | `mongodb+srv://...` |
| `JWT_SECRET` | Clé de signature des jetons | chaîne aléatoire longue |
| `JWT_EXPIRES_IN` | Durée de validité d'un jeton | `7d` |
| `CORS_ORIGIN` | Origine autorisée pour l'application mobile | `*` en développement |
| `SERVICE_ANALYSE_URL` | Adresse du service d'analyse, **terminée par `/analyser`** | `http://localhost:5001/analyser` |
| `SERVICE_ANALYSE_TIMEOUT_MS` | Délai maximal accordé au service d'analyse | `9000` |
| `SEUIL_CONFIRMATION_SCORE` | Score minimal pour confirmer une prise (RG-03) | `0.75` |
| `DELAI_VERIFICATION_RETARD_MS` | Fréquence de détection des prises en retard | `300000` |

`api/src/config/env.js` centralise leur lecture et refuse de démarrer en production si
`MONGODB_URI` ou `JWT_SECRET` manquent.

### `analyse-images`

| Variable | Rôle | Défaut |
|---|---|---|
| `MODELE_STRATEGIE` | La façon de reconnaître une case | `factice` |
| `PORT` | Port d'écoute, fourni par l'hébergeur | `5001` en local |

### `mobile/.env`

| Variable | Rôle | Exemple |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Adresse de l'API, **terminée par `/api`** | `https://pilulier-api.onrender.com/api` |

Seules les variables préfixées `EXPO_PUBLIC_` sont visibles depuis l'application. C'est
une règle d'Expo, pas un choix du projet.

## Scénario de démonstration

Le parcours complet d'une prise, tel qu'il se montre au client.

1. Réveiller les deux services en ouvrant leurs adresses de santé, quelques minutes
   avant de commencer.
2. Se connecter dans l'application, régler un créneau à l'heure courante, et vérifier
   qu'une prise apparaît au tableau de bord.
3. Remplir le plateau depuis la page interactive du service d'analyse
   (`POST /simulation/remplir`).
4. Toucher **« J'ai rempli mon pilulier »** dans l'application, puis refermer le
   couvercle dans Wokwi : la photo de référence est prise.
5. Ouvrir le couvercle dans Wokwi. La prise passe à « en vérification ».
6. Vider une case depuis la page interactive (`POST /simulation/prendre`), puis refermer
   le couvercle. La prise passe à « confirmée » dans l'application.
7. Provoquer la panne : couper la connexion depuis l'écran de démonstration, cliquer le
   bouton du circuit plusieurs fois, montrer la mise en mémoire tampon, puis rétablir.
   Les événements accumulés remontent d'un coup.

Le déroulé minuté, les vérifications préalables et le tableau de dépannage sont dans
[la fiche de répétition de la démonstration](docs/repetition-demonstration.md).

## Structure des fichiers

```
api/                              Serveur Node.js + Express + MongoDB
├── src/
│   ├── app.js                    Application Express, middlewares
│   ├── server.js                 Point d'entrée, tâches planifiées
│   ├── config/                   Lecture et validation des variables d'environnement
│   ├── routes/                   Câblage URL -> contrôleur
│   ├── controllers/              Logique HTTP
│   ├── services/                 Logique métier : prises, comparaison, adhérence
│   ├── repositories/             Accès MongoDB, isolé du reste
│   ├── models/                   Schémas Mongoose
│   ├── jobs/                     Purge des images après 30 jours
│   ├── middleware/               Authentification, gestion des erreurs
│   └── utils/
└── tests/                        189 tests Jest, sans vraie base de données

analyse-images/                   Service Python + FastAPI
├── app.py                        Les 5 points d'entrée HTTP
├── zones.py                      Géométrie des 28 zones (7 jours x 4 créneaux)
├── interface_classifieur.py      Le contrat commun aux quatre stratégies
├── plateau_simule.py             Le plateau simulé : la source des photos
├── jeu_de_donnees.py             Lecture et écriture des annotations
├── strategies/                   factice, seuillage, mobilenet, onnx
├── entrainement/                 Génération du jeu, entraînement, export ONNX, mesure
├── jeu-de-photos/                Où déposer de vraies photos, si un jour il y en a
└── tests/                        50 tests pytest

mobile/                           Application React Native + Expo
└── src/
    ├── screens/                  Les 10 écrans
    ├── components/               Éléments réutilisables
    ├── api/                      Appels à l'API et gestion du jeton
    ├── context/                  État d'authentification
    ├── navigation/               Navigation entre les écrans
    ├── notifications/            Rappels locaux
    └── theme/                    Couleurs et typographie

wokwi/                            Circuit ESP32 simulé
├── src/main.cpp                  Le firmware
├── diagram.json                  Le schéma du circuit
├── wokwi.toml                    Configuration du simulateur
└── scenario-*.yaml               Scénarios de test automatisés

docs/                             Toute la documentation du projet
render.yaml                       Description des deux services déployés
.github/workflows/                Les sept vérifications automatiques
```

## Déploiement

Les deux services sont déployés sur Render depuis la branche `main`. Le fichier
`render.yaml`, à la racine, les décrit tous les deux et fait référence.

Le déploiement n'est pas automatique : une fusion dans `main` ne met rien en ligne. Il
faut le déclencher à la main dans Render, service par service, avec **Manual Deploy**.

En revanche, une fusion n'est possible que si les vérifications automatiques passent :
les sept workflows sont décrits dans [E1 · Dépôt de code](docs/E1-depot-code.md).

La marche à suivre complète, depuis un dépôt neuf, est dans
[Déployer le projet](docs/DEPLOIEMENT.md).

## Outils d'IA utilisés

Voir [D5 · Plan de documentation](docs/D5-plan-documentation.md) pour la déclaration des
outils d'IA générative utilisés par l'équipe.
