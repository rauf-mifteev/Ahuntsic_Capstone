# Le service d'analyse d'images — comment il marche

Dossier : `analyse-images/`. Écrit en Python avec **FastAPI**.

C'est l'œil du système. On lui donne une image d'un plateau de pilulier, il
répond quelles cases sont pleines et lesquelles sont vides.

## Pourquoi c'est un programme séparé

L'API est écrite en JavaScript, ce service en Python. Deux raisons.

D'abord, les outils d'intelligence artificielle et de traitement d'image
vivent presque tous dans le monde Python. Ensuite, séparer permet de changer
la façon de reconnaître les cases sans toucher au reste : l'API pose toujours
la même question et reçoit toujours la même forme de réponse, peu importe ce
qui se passe derrière.

## Les 28 zones

Une photo du plateau montre une grille : 7 colonnes (les jours, du lundi au
dimanche) et 4 rangées (les moments de la journée). Le fichier `zones.py`
sait découper une image en ces 28 morceaux.

Chaque zone porte un numéro de 0 à 27. La règle : `numéro = (moment − 1) × 7 +
position du jour`. Donc les numéros 0 à 6 sont les 7 premiers moments de la
semaine, 7 à 13 les suivants, et ainsi de suite. Cette numérotation est
utilisée partout — dans l'API, dans le circuit, dans la base de données. Si
elle changeait quelque part, plus rien ne correspondrait.

Une seule photo du plateau entier donne donc **28 exemples étiquetés d'un
coup**. C'est ce qui rend l'entraînement possible avec peu d'images.

## Les trois façons de reconnaître une case

Le fichier `interface_classifieur.py` définit un contrat : « voici une image,
rends-moi 28 résultats ». Trois programmes différents respectent ce contrat,
et on choisit lequel tourne avec une variable d'environnement appelée
`MODELE_STRATEGIE`.

**`factice`** — ne regarde pas l'image du tout, répond quelque chose de
prévisible. Sert à développer l'API sans dépendre du reste.

**`seuillage`** — la méthode simple et robuste. Elle transforme chaque zone
en noir et blanc et compte les pixels sombres. Beaucoup de sombre = il y a un
comprimé. Pas d'entraînement nécessaire, ça marche dès le premier jour.
**C'est celle à utiliser pour la démonstration.**

**`mobilenet`** — un vrai réseau de neurones pré-entraîné (MobileNetV3-Small),
dont on ne réapprend que la dernière couche. Plus savant, mais il faut
l'entraîner d'abord.

Cette façon de faire porte un nom : le **patron Stratégie**. Un contrat,
plusieurs implémentations interchangeables. C'est documenté dans
`B6-patrons-conception.md`.

## Le plateau simulé — la source des photos

Comme aucune caméra n'existe, le fichier `plateau_simule.py` tient à jour un
plateau imaginaire mais précis : 28 cases, chacune pleine ou vide, pour chaque
pilulier.

Trois actions sont possibles dessus : le remplir entièrement (c'est le
remplissage hebdomadaire), vider une case précise (c'est quelqu'un qui prend
son comprimé), et le photographier.

« Photographier » veut dire : dessiner une image du plateau dans son état
actuel. Deux photos du même plateau ne sont jamais identiques au pixel près —
le fond a un léger grain, le comprimé n'est pas exactement au même endroit.
C'est volontaire : sinon la reconnaissance serait trop facile et ne prouverait
rien.

**L'état vit dans la mémoire du programme.** C'est pourquoi le service doit
tourner en un seul exemplaire (`--workers 1`). Avec deux exemplaires, la case
qu'on vide et celle qu'on photographie pourraient être dans deux mémoires
différentes.

## Les points d'entrée HTTP

| Appel | Ce qu'il fait |
|---|---|
| `GET /sante` | dit si le service répond, et avec quelle stratégie |
| `POST /analyser` avec un fichier | analyse une **vraie** image qu'on lui envoie |
| `POST /analyser` avec `{"dispositifId": "..."}` | photographie le plateau simulé, puis l'analyse |
| `POST /simulation/remplir` | remplit les 28 cases |
| `POST /simulation/prendre` | vide une case précise |
| `GET /simulation/etat` | donne les 28 états réels |

La réponse d'analyse contient toujours la même chose : le nom de la stratégie
utilisée, un drapeau `simule` qui dit si l'image a été dessinée, et les 28
résultats. Chaque résultat a un numéro de zone, une décision (`occupee` vrai
ou faux) et un **score** entre 0 et 1.

**Attention au sens du score** : c'est la probabilité que la case soit
**vide**. Un score de 0,95 veut dire « je suis presque sûr que c'est vide ».
Cette convention est la même partout dans le projet.

Le service ne décide jamais si une prise est confirmée. Il donne un score,
l'API le compare à son propre seuil. La décision médicale reste du côté de
l'API.

## La documentation qui s'écrit toute seule

FastAPI publie automatiquement le contrat complet sur **http://localhost:5001/docs**.
On y voit chaque point d'entrée, ce qu'il attend, ce qu'il renvoie, et on peut
l'essayer directement dans le navigateur.

C'est la raison principale du choix de FastAPI : le contrat entre l'API et ce
service ne peut pas se désynchroniser du code, puisqu'il en est déduit.

## Les codes d'erreur

Deux familles, volontairement distinctes.

**422** — une erreur de forme, détectée automatiquement : un champ manque, ou
n'a pas le bon type (un numéro de case écrit en toutes lettres). Aucune ligne
de code ne la produit, elle vient des modèles de données.

**400** — une erreur de règle, vérifiée explicitement : un numéro de case en
dehors de 0-27, une image illisible.

## Le jeu de données et l'entraînement

Le fichier `entrainement/generer_jeu_synthetique.py` fabrique le jeu
d'entraînement : 30 images de plateaux dessinés, réparties automatiquement en
24 pour apprendre et 6 pour tester. Comme chaque image donne 28 exemples, ça
fait 672 exemples au total.

Les 6 images de test viennent de tirages différents et ne servent **jamais** à
l'entraînement. C'est indispensable : tester un modèle sur ce qu'il a déjà vu
ne mesure rien.

`entrainement/entrainer_mobilenet.py` fait l'apprentissage.
`entrainement/mesurer_erreurs.py` mesure la qualité — et il mesure la
stratégie `seuillage`, pas le modèle entraîné ; il l'affiche en première
ligne pour éviter la confusion.

**Un chiffre à ne pas citer sans précaution** : le score obtenu tourne autour
de 100 %. Il est trompeur. Les images de test viennent du même générateur que
celles d'entraînement — même dessin, même grain, même éclairage. Ça ne dit
rien de la performance sur de vraies photos.

## Pourquoi une erreur est plus grave que l'autre

**Faux positif** : le modèle dit « vide » alors que la case est encore
**pleine**. Conséquence : une prise qui n'a pas eu lieu est confirmée. Le
patient et sa famille croient que tout va bien. C'est l'erreur dangereuse.

**Faux négatif** : le modèle dit « pleine » alors que la case est **vide**.
Conséquence : une vraie prise reste « ambiguë ». Le patient doit confirmer à
la main. C'est agaçant, pas dangereux.

C'est pour ça que `mesurer_erreurs.py` mesure les deux séparément au lieu d'un
taux d'erreur global, et choisit un seuil qui privilégie le doute.
