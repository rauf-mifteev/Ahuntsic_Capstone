# Déployer le projet

Ce document explique comment mettre le projet en ligne à partir de zéro. Il
s'adresse à quelqu'un qui n'a jamais touché au dépôt. Pour faire tourner le
projet sur votre machine plutôt qu'en ligne, lisez
[Installer et faire tourner le projet](INSTALLATION-EQUIPE.md).

Comptez une heure la première fois.

---

## Ce qui est déployé, et où

Le projet compte trois morceaux en ligne, chez deux hébergeurs.

| Morceau | Hébergeur | Adresse |
|---|---|---|
| `pilulier-api` | Render | `https://pilulier-api.onrender.com` |
| `pilulier-analyse-images` | Render | `https://pilulier-analyse-images.onrender.com` |
| La base de données | MongoDB Atlas | chaîne de connexion privée |

L'application mobile n'est pas déployée. Elle se lance avec Expo Go depuis un
ordinateur, et pointe vers l'API en ligne.

Le fichier `render.yaml`, à la racine du dépôt, décrit les deux services
Render. C'est lui qui fait référence : si vous changez quelque chose dans
l'interface de Render sans le reporter ici, la prochaine personne ne le saura
pas.

---

## Étape 1 — La base de données

1. Créez un compte sur MongoDB Atlas et un cluster au palier gratuit.
2. Créez un utilisateur de base de données, avec un mot de passe.
3. Dans **Network Access**, autorisez `0.0.0.0/0`, c'est-à-dire toutes les
   adresses. Render n'a pas d'adresse IP fixe au palier gratuit : sans cette
   autorisation, l'API ne pourra jamais se connecter.
4. Copiez la chaîne de connexion. Elle ressemble à
   `mongodb+srv://utilisateur:motdepasse@cluster.mongodb.net/pilulier`.

Gardez cette chaîne de côté, vous en aurez besoin à l'étape 3.

---

## Étape 2 — Créer les deux services sur Render

Render sait lire `render.yaml` tout seul.

1. Créez un compte sur Render et reliez-le au dépôt GitHub.
2. Choisissez **New** puis **Blueprint**.
3. Sélectionnez le dépôt. Render lit `render.yaml` et propose de créer les
   deux services d'un coup.
4. Confirmez.

Render construit alors les deux services. Le premier démarrage prend quelques
minutes : il installe les dépendances Node d'un côté, les dépendances Python
de l'autre.

---

## Étape 3 — Renseigner les secrets

Trois variables ne sont **pas** dans `render.yaml`, et c'est voulu : elles
contiennent des secrets, qui n'ont rien à faire dans un dépôt. Vous devez les
saisir à la main.

Allez dans le service **`pilulier-api`**, onglet **Environment**, et ajoutez :

| Variable | Valeur |
|---|---|
| `MONGODB_URI` | la chaîne de connexion de l'étape 1 |
| `JWT_SECRET` | une longue chaîne aléatoire, que vous inventez |
| `SERVICE_ANALYSE_URL` | `https://pilulier-analyse-images.onrender.com/analyser` |

Pour produire un `JWT_SECRET` correct :

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> **`SERVICE_ANALYSE_URL` doit se terminer par `/analyser`.** Sans ce
> segment, l'API appelle la racine du service d'analyse, n'obtient rien
> d'exploitable, et **chaque vérification s'affiche comme « analyse
> échouée »** sans qu'aucune erreur ne soit levée.

Les autres variables de l'API ont une valeur par défaut raisonnable dans
`api/src/config/env.js` : `SERVICE_ANALYSE_TIMEOUT_MS`,
`SEUIL_CONFIRMATION_SCORE` et `DELAI_VERIFICATION_RETARD_MS`. Vous n'avez pas
besoin d'y toucher.

---

## Étape 4 — Vérifier la stratégie du service d'analyse

Allez dans le service **`pilulier-analyse-images`**, onglet **Environment**, et
vérifiez que `MODELE_STRATEGIE` vaut bien **`onnx`**.

> **C'est le piège le plus coûteux de tout le déploiement.** Render
> n'applique les variables déclarées dans `render.yaml` qu'au moment où le
> blueprint est synchronisé. Un simple « déployer le dernier commit » ne les
> relit pas. Une valeur changée dans le fichier peut donc rester sans effet
> en ligne pendant des jours.

La vérification prend dix secondes, et elle est sans appel. Ouvrez :

```
https://pilulier-analyse-images.onrender.com/sante
```

La réponse doit être exactement :

```json
{"etat":"ok","strategie":"mobilenet-onnx"}
```

Si vous lisez `seuillage-opencv` ou `factice`, la variable n'est pas la bonne.
Corrigez-la, puis redéployez le service.

---

## Étape 5 — Vérifier que tout répond

Ouvrez les deux adresses, l'une après l'autre.

```
https://pilulier-api.onrender.com/api/sante
https://pilulier-analyse-images.onrender.com/sante
```

Chacune doit répondre `{"etat":"ok", ...}`.

> **Le premier appel peut prendre 30 à 50 secondes.** Au palier gratuit,
> Render met un service en veille après une quinzaine de minutes sans trafic.
> Le réveil est lent, les appels suivants sont immédiats. Ce n'est pas une
> panne.

Pour vérifier la chaîne complète, et pas seulement que les services répondent,
suivez [la fiche de répétition de la démonstration](repetition-demonstration.md).

---

## Une contrainte à ne jamais lever

Le service d'analyse démarre avec `--workers 1`, et ce n'est pas un réglage de
performance.

L'état du plateau simulé vit dans la mémoire du processus. Avec deux
processus, une requête peut tomber sur un plateau qui ignore le remplissage
fait juste avant, et la vérification donnerait un résultat faux sans lever la
moindre erreur.

La vérification automatique `ci-e5-deploiement.yml` refuse toute modification
qui retirerait `--workers 1` de `render.yaml`.

---

## Mettre à jour la version en ligne

Render redéploie tout seul à chaque fusion dans `main`.

Deux cas demandent une action en plus.

**Si vous avez changé une variable dans `render.yaml`**, resynchronisez le
blueprint dans Render, ou reportez la valeur à la main dans l'onglet
Environment. Un redéploiement simple ne suffit pas.

**Si vous avez réentraîné le modèle**, relancez
`python entrainement/exporter_onnx.py`, vérifiez que le script affiche
« Parité confirmée », et versionnez le fichier
`entrainement/modele_mobilenet.onnx`. L'hébergeur ne sait pas entraîner : il
n'a ni PyTorch ni le jeu de données, et son disque n'est pas conservé d'un
déploiement à l'autre. Le fichier doit donc être dans le dépôt.
