# Service d'analyse d'images du plateau

Microservice Python séparé de l'API Node.js (voir `docs/B5-architecture-logicielle.md`,
composant `ServAPI`). Deux raisons à cette séparation :

1. Changer de modèle sans toucher au reste du système.
2. Développer l'API contre un faux service avant que le vrai modèle
   n'existe (patron **Stratégie**, voir `docs/B6-patrons-conception.md`).

Construit avec **FastAPI**. Le contrat HTTP entre l'API Node.js et ce
service est publié automatiquement à `/docs` : il est déduit des modèles
Pydantic de `app.py` et ne peut donc pas se désynchroniser du code.

---

## 1. Installation, pas à pas

### 1.1 Vérifier Python

```powershell
python --version
```

Il faut **3.10 ou plus**. Si la commande ouvre le Microsoft Store, Python
n'est pas installé : prenez-le sur python.org en **cochant « Add python.exe
to PATH »** pendant l'installation. Si `python` ne marche toujours pas,
essayez `py` — c'est le lanceur Windows, il fonctionne même quand `python`
n'est pas dans le PATH. Remplacez alors `python` par `py` partout ci-dessous.

### 1.2 Créer l'environnement virtuel

Un environnement virtuel isole les bibliothèques de ce projet du reste de
votre machine. Sans lui, `pip install` modifie votre Python global, ce qui
finit toujours par casser autre chose.

```powershell
cd analyse-images
python -m venv .venv
.venv\Scripts\Activate.ps1
```

Le nom `(.venv)` doit apparaître au début de votre invite de commande.
C'est le signe que l'environnement est actif.

> **« l'exécution de scripts est désactivée sur ce système »**
> PowerShell bloque les scripts par défaut. Autorisez-les pour cette
> fenêtre seulement :
> ```powershell
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
> ```
> puis relancez la commande d'activation. Rien n'est modifié durablement
> sur votre machine.

> **Sur macOS ou Linux**, l'activation s'écrit `source .venv/bin/activate`.

### 1.3 Installer les dépendances

```powershell
pip install -r requirements.txt -r requirements-dev.txt
```

Environ 100 Mo, une minute selon la connexion. Ce que vous installez :

| Paquet | À quoi il sert |
|---|---|
| `fastapi` | le cadre applicatif : routes, validation, documentation automatique |
| `uvicorn` | le serveur qui exécute l'application (FastAPI n'en contient pas) |
| `python-multipart` | permet à FastAPI de lire un envoi de fichier (une vraie photo) |
| `pillow` | lecture et dessin d'images |
| `numpy` | calcul sur les tableaux de pixels |
| `opencv-python-headless` | utilisé par la stratégie `seuillage` |
| `pytest`, `httpx` | uniquement pour les tests (`requirements-dev.txt`) |

`torch` et `torchvision` ne sont **pas** dans cette liste : ils pèsent
plusieurs centaines de mégaoctets et ne servent qu'à entraîner le modèle
(section 5). Le service tourne sans eux.

### 1.4 Vérifier que tout est en place

```powershell
python -m pytest tests/ -v
```

Attendu : **43 passed**. Si vous voyez `ModuleNotFoundError`, l'environnement
virtuel n'est probablement pas actif — vérifiez le `(.venv)` dans l'invite.

---

## 2. Lancer le service

```powershell
$env:MODELE_STRATEGIE = "seuillage"
python app.py
```

Attendu :

```
INFO:     Started server process [12345]
INFO:     Uvicorn running on http://0.0.0.0:5001 (Press CTRL+C to quit)
```

**Laissez cette fenêtre ouverte** : le service tourne tant qu'elle est
ouverte. `Ctrl+C` l'arrête.

Équivalent explicite, utile si vous voulez le rechargement automatique
pendant le développement :

```powershell
uvicorn app:app --port 5001 --reload
```

### 2.1 La documentation interactive

Ouvrez **http://localhost:5001/docs** dans un navigateur. Vous y trouverez
les cinq points d'entrée, leurs schémas d'entrée et de sortie, et un bouton
« Try it out » pour les appeler sans écrire une ligne de code. C'est le
moyen le plus simple de montrer le service pendant la revue.

### 2.2 Vérifier depuis une deuxième fenêtre

```powershell
curl.exe http://localhost:5001/sante
```
Attendu : `{"etat":"ok","strategie":"seuillage-opencv"}`

---

## 3. Les cinq points d'entrée

| Appel | Effet |
|---|---|
| `GET /sante` | le service répond, et avec quelle stratégie |
| `POST /analyser` (multipart, champ `image`) | analyse une **vraie** image. Réponse : `simule: false` |
| `POST /analyser` (JSON, `{"dispositifId": "..."}`) | photographie le plateau simulé, puis l'analyse. Réponse : `simule: true` |
| `POST /simulation/remplir` (`{"dispositifId": "..."}`) | les 28 cases deviennent pleines |
| `POST /simulation/prendre` (`{"dispositifId": "...", "indice": 12}`) | vide une case : « quelqu'un a pris son comprimé » |
| `GET /simulation/etat?dispositifId=...` | les 28 états réels du plateau |

### Scénario de démonstration, en quatre commandes

```powershell
# 1. remplir le plateau
curl.exe -X POST http://localhost:5001/simulation/remplir -H "Content-Type: application/json" -d '{\"dispositifId\":\"ESP32-DEMO-001\"}'

# 2. prendre le comprimé de la case 12
curl.exe -X POST http://localhost:5001/simulation/prendre -H "Content-Type: application/json" -d '{\"dispositifId\":\"ESP32-DEMO-001\",\"indice\":12}'

# 3. photographier et analyser
curl.exe -X POST http://localhost:5001/analyser -H "Content-Type: application/json" -d '{\"dispositifId\":\"ESP32-DEMO-001\"}'

# 4. relire l'état réel, pour comparer
curl.exe http://localhost:5001/simulation/etat?dispositifId=ESP32-DEMO-001
```

À l'étape 3, la seule zone avec `"occupee":false` doit être `"indice":12`.
Le classifieur ne consulte jamais l'état interne : il l'a vu sur l'image.

### Deux familles de codes d'erreur

| Code | Quand | Exemple |
|---|---|---|
| **422** | validation automatique de FastAPI, déduite des modèles Pydantic | `indice` envoyé en texte, `dispositifId` absent |
| **400** | règle métier vérifiée explicitement dans `app.py` | `indice` hors des bornes 0-27, image illisible |

---

## 4. Choisir la stratégie de classification

Variable d'environnement `MODELE_STRATEGIE` :

| Valeur | Comportement | Dépendances |
|---|---|---|
| `factice` (défaut) | Résultat déterministe, sans regarder l'image. Sert à développer l'API avant que le modèle existe (AC de PC-47). | aucune |
| `seuillage` | Vrai classifieur : convertit chaque zone en niveaux de gris et compte les pixels sombres (OpenCV). Fonctionne dès le premier jour, sans entraînement. **C'est celui à utiliser en démonstration.** | `opencv-python-headless` |
| `mobilenet` | Le modèle entraîné (section 5). Nécessite `entrainement/modele_mobilenet.pt`. | `torch`, `torchvision` |

```powershell
$env:MODELE_STRATEGIE = "seuillage"; python app.py
```

> En `factice`, le verdict ne dépend pas de l'image : si votre démonstration
> affiche toujours le même résultat, c'est probablement ça. Passez à
> `seuillage`.

---

## 5. Entraîner le modèle (PC-48)

### 5.1 Le jeu de données est généré, pas photographié

Le projet ne prend aucune photo (voir `docs/photos-simulees.md`).
Le script d'entraînement génère son jeu de données tout seul s'il n'existe
pas encore. Pour le produire à la main et le regarder :

```powershell
python entrainement/generer_jeu_synthetique.py
```

Cela crée `jeu-de-photos-synthetique/` : 24 images d'entraînement et 6 de
test, soit **672 exemples de zones étiquetés** (chaque image du plateau en
donne 28), répartis à peu près moitié pleines / moitié vides. Les images de
test viennent de graines différentes et ne sont jamais vues pendant
l'entraînement (AC de PC-45).

Le dossier est ignoré par Git : il se régénère en une seconde.

### 5.2 Installer torch, puis entraîner

```powershell
pip install -r requirements-entrainement.txt
python entrainement/entrainer_mobilenet.py
```

Sur Windows, `pip` installe la version **CPU** de torch (environ 200 Mo) :
pas besoin de carte graphique. Comptez quelques minutes pour
l'installation, puis quelques minutes d'entraînement sur 15 époques.

Le script écrit `entrainement/modele_mobilenet.pt`. Pour l'utiliser :

```powershell
$env:MODELE_STRATEGIE = "mobilenet"; python app.py
```

### 5.3 Un piège corrigé, à connaître si vous relisez le code

Geler le tronc pré-entraîné avec `requires_grad = False` ne suffit pas :
ses couches BatchNorm changent de comportement selon le mode du modèle.

- En mode entraînement, elles normalisent avec les statistiques **du lot
  courant** et mettent à jour leurs statistiques glissantes avec nos
  images synthétiques — très éloignées de la distribution ImageNet.
- À l'inférence (`strategies/mobilenet.py` appelle `.eval()`), elles
  utilisent justement ces statistiques glissantes.

La tête apprenait donc sur des features qu'elle ne reverrait jamais. Le
symptôme est traître : la perte tombait à `0.0000` pendant l'entraînement,
tout avait l'air parfait, puis le modèle répondait « pleine » pour les 28
cases, sans lever la moindre erreur.

`entrainer_mobilenet.py` appelle maintenant `modele.features.eval()` juste
après `modele.train()` : mêmes statistiques des deux côtés. C'est la
pratique standard quand on gèle un backbone pré-entraîné, et c'est
commenté dans le code à l'endroit exact.

### 5.4 Mesurer les erreurs séparément

```powershell
python entrainement/mesurer_erreurs.py
```

Affiche le taux de faux positifs et de faux négatifs **séparément**, et
choisit un seuil de décision qui privilégie le doute plutôt qu'une fausse
confirmation (AC de PC-47).

Attention à ne pas confondre les deux chiffres qui circulent : ce script
mesure la stratégie **`seuillage`** (il l'affiche en première ligne).
L'évaluation du modèle entraîné, elle, s'affiche à la fin de
`entrainer_mobilenet.py`.

> ⚠️ **Le score obtenu est optimiste.** Entraînement et test viennent du
> même générateur d'images : les images de test sont différentes, mais
> partagent le même dessin, le même bruit et le même éclairage. Un score de
> 100 % ne dit rien de la performance sur de vraies photos. Les deux
> scripts affichent cet avertissement automatiquement — ne le retirez pas
> de vos captures d'écran.

---

## 6. Pourquoi « faux positif » est l'erreur la plus grave

Dans ce projet, une case qui passe de pleine à vide **confirme** une prise
(RG-11). Donc :

- **Faux positif** (le modèle déclare « vide » alors que la case est encore
  **pleine**) → une prise qui n'a pas eu lieu serait confirmée à tort.
  C'est l'erreur dangereuse : elle donne un faux sentiment de sécurité sur
  l'adhérence du patient.
- **Faux négatif** (déclare « pleine » alors que la case est **vide**) → une
  prise réelle resterait « ambiguë » ou finirait « manquée » à tort. C'est
  gênant — le patient doit confirmer manuellement — mais pas dangereux.

C'est pourquoi `mesurer_erreurs.py` mesure les deux séparément plutôt qu'un
taux d'erreur global, et pourquoi le seuil est choisi pour minimiser les
faux positifs même au prix de plus de doute (AC de PC-47 / PC-53).

---

## 7. Structure du dossier

```
analyse-images/
├── zones.py                   Géométrie des 28 zones (7 jours × 4 créneaux)
├── jeu_de_donnees.py          Lecture/écriture du manifeste d'annotations (CSV)
├── interface_classifieur.py   Le contrat commun (classe Classifieur)
├── plateau_simule.py          Plateau physique simulé : la source des photos (PC-51)
├── app.py                     Service FastAPI : les 5 points d'entrée (PC-49/51)
├── strategies/                Patron Stratégie : un contrat, 3 implémentations
│   ├── factice.py             ClassifieurFactice (aucune dépendance)
│   ├── seuillage.py           ClassifieurSeuillage (OpenCV)
│   └── mobilenet.py           ClassifieurMobileNet (le modèle entraîné)
├── entrainement/
│   ├── generer_jeu_synthetique.py   Génère le jeu de données (PC-46)
│   ├── entrainer_mobilenet.py       Entraînement du modèle (PC-48)
│   └── mesurer_erreurs.py           Évaluation : FP/FN séparés, seuil (PC-48)
├── jeu-de-photos/             Vide — voir son README (vraies photos, si un jour)
└── tests/                     43 tests pytest
```

---

## 8. Déploiement (Render)

Configuré dans `render.yaml` à la racine du dépôt :

```
startCommand: uvicorn app:app --host 0.0.0.0 --port $PORT --workers 1
```

`--workers 1` n'est pas un réglage de performance mais une **contrainte de
correction** : l'état du plateau simulé vit dans la mémoire du processus.
Avec plusieurs workers, la case qu'on vide et celle qu'on photographie
pourraient être dans deux processus différents, et la démonstration
donnerait des verdicts incohérents.
