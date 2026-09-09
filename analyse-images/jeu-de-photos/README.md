# Jeu de données du plateau — PC-46

**Le projet ne prend aucune photo.** Le jeu de données utilisé pour
entraîner et évaluer le modèle est **généré**, comme tout le reste de la
chaîne (voir `docs/PC-51-photos-simulees.md` pour la décision complète).

Ce dossier `jeu-de-photos/` reste donc vide. Il n'existe que comme point
d'entrée pour le jour où quelqu'un déposerait de vraies photos : le code
les utiliserait alors en priorité, sans modification.

## Générer le jeu de données

```bash
cd analyse-images
python3 entrainement/generer_jeu_synthetique.py
```

Le script écrit dans `jeu-de-photos-synthetique/` (ignoré par Git : il se
régénère en une seconde, inutile de le versionner) :

```
jeu-de-photos-synthetique/
├── entrainement/
│   ├── photos/plateau_synthetique_004.png ...
│   └── annotations.csv
└── test/
    ├── photos/ ...
    └── annotations.csv
```

Répartition automatique **80 % entraînement / 20 % test**, avec des graines
différentes : les images de test ne sont jamais vues pendant
l'entraînement, ce qui satisfait l'AC de PC-45 (« une partie est mise de
côté et jamais utilisée pour l'entraînement »).

`annotations.csv` a une ligne par image, avec 28 colonnes `z00` à `z27`
(`1` = case pleine, `0` = case vide), dans l'ordre canonique de `zones.py`
(indice = (créneau − 1) × 7 + position du jour, de LUNDI à DIMANCHE).

**Une seule image du plateau entier donne 28 exemples étiquetés** — inutile
de découper les cases une par une (voir `docs/B7-choix-technologiques.md`).
Une trentaine d'images suffit donc largement : environ 840 exemples de
zones.

Les étiquettes sont exactes par construction : le générateur sait ce qu'il
a dessiné. Aucune annotation manuelle n'est nécessaire, et aucune erreur
d'étiquetage n'est possible.

## Ce que ça coûte — à dire en revue

Un modèle entraîné sur des images dessinées et évalué sur des images du
**même générateur** obtient un très bon score, et ce score ne dit rien de
sa performance sur de vraies photos. Les images générées sont bien plus
propres que la réalité : éclairage constant, aucun reflet, aucune ombre
portée du rebord, aucun comprimé collé à la paroi, cadrage parfait.

Ce n'est pas un défaut caché du projet, c'est une conséquence assumée du
périmètre choisi (`docs/A1-perimetre.md` : pas de boîtier physique). Mais
c'est à annoncer clairement plutôt qu'à laisser découvrir : présenter
« 98 % de précision » sans préciser sur quoi serait trompeur.

## Si vous décidez d'ajouter de vraies photos

Rien à modifier dans le code : déposez-les dans ce dossier au format
ci-dessous, et `entrainer_mobilenet.py` comme `mesurer_erreurs.py` les
utiliseront automatiquement à la place du jeu synthétique.

```
jeu-de-photos/
├── entrainement/
│   ├── photos/photo_001.jpg ...
│   └── annotations.csv
└── test/
    ├── photos/ ...
    └── annotations.csv
```

Cadrage attendu : plateau centré, les 7 colonnes (jours) et les 4 rangées
(créneaux) bien visibles, photo prise de face (voir l'hypothèse de cadrage
documentée dans `zones.py`). Gardez ~80 % en entraînement et ~20 % en test,
et ne déplacez jamais une photo d'un dossier à l'autre ensuite.

Pour étiqueter sans passer par Excel, `annoter.py` découpe une photo en 28
zones et vous demande « pleine » ou « vide » pour chacune :

```bash
python3 jeu-de-photos/annoter.py entrainement/photos/photo_004.jpg
```

Cet outil ne sert **pas** au jeu synthétique, qui est étiqueté
automatiquement.
