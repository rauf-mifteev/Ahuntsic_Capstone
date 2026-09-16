# Est-ce que le modèle entraîné sert vraiment à quelque chose ?

Mesure faite le 15 septembre 2026, sur le jeu de test du service d'analyse d'images.

## La question

Le projet utilise deux méthodes pour décider si une case du pilulier est vide ou
pleine.

La première, `seuillage`, est simple : elle transforme la zone en noir et blanc et
compte les pixels sombres. Beaucoup de sombre, il y a un comprimé. Une dizaine de
lignes de code, aucun entraînement.

La seconde, `onnx`, est un modèle entraîné — un réseau de neurones à qui on a montré
des images annotées jusqu'à ce qu'il apprenne à les classer.

Le second a coûté beaucoup plus cher que le premier en temps de travail. Il faut
pouvoir dire ce qu'il apporte.

## Le problème : la comparaison habituelle ne montre rien

Sur nos images de test, les deux méthodes ne se trompent jamais.

| Méthode | Exactitude | Vue vide alors que pleine | Vue pleine alors que vide |
|---|---|---|---|
| `seuillage` | 100,00 % | 0 | 0 |
| `onnx` | 100,00 % | 0 | 0 |

Sur 168 zones — 6 images de 28 cases — aucune erreur d'un côté comme de l'autre.

Ce n'est pas surprenant. Nos images sont dessinées par programme : un disque foncé
sur un carré clair, toujours le même éclairage, aucune ombre, aucun reflet. Compter
les pixels sombres suffit largement.

Conclusion honnête : **sur ces images-là, le modèle entraîné n'apporte rien de
mesurable.** Il faut le dire avant qu'on nous le demande.

## Ce qui sépare vraiment les deux méthodes

Un vrai pilulier ne sera pas photographié dans des conditions parfaites. L'éclairage
changera, la pièce sera plus ou moins sombre, l'appareil aura ses défauts.

Alors on a dégradé les images de test et refait la mesure sur chaque version.

| Dégradation | `seuillage` | `onnx` | Écart |
|---|---|---|---|
| aucune | 100,00 % | 100,00 % | +0,00 |
| luminosité × 0,6 | 100,00 % | 100,00 % | +0,00 |
| **luminosité × 0,4** | **52,38 %** | **100,00 %** | **+47,62** |
| luminosité × 1,5 | 91,07 % | 100,00 % | +8,93 |
| **contraste × 0,5** | **47,62 %** | **100,00 %** | **+52,38** |
| flou gaussien, rayon 2,5 | 100,00 % | 100,00 % | +0,00 |
| bruit gaussien, écart-type 25 | 100,00 % | 100,00 % | +0,00 |

## Comment lire ce tableau

**Le seuillage s'effondre quand la lumière change.** À contraste réduit de moitié, il
tombe à 47,62 %. Sur une décision entre deux réponses — vide ou pleine — 50 % est le
score du hasard. Il ne voit donc plus rien du tout : il répond au hasard.

C'était prévisible. Le seuillage compare la luminosité des pixels à une valeur fixe.
Assombrissez l'image et tous les pixels passent sous le seuil : toutes les cases
paraissent pleines. Le seuil est réglé pour une luminosité qui n'est plus là.

**Le modèle entraîné ne bouge pas.** Il reste à 100 % dans les sept cas. Il n'a pas
appris « sombre égale comprimé » : il a appris la forme d'un comprimé dans une case,
et cette forme survit à l'assombrissement.

**Le flou et le bruit ne gênent ni l'un ni l'autre.** Nos cases sont grandes et bien
séparées. Un flou de rayon 2,5 pixels ou un grain modéré ne suffisent pas à confondre
une case vide avec une case pleine, quelle que soit la méthode.

## Ce que cette mesure ne dit pas

Trois limites à annoncer soi-même.

Les images dégradées **sont fabriquées à partir de nos images synthétiques**, pas
photographiées. On mesure la robustesse à un changement d'éclairage simulé, pas la
performance sur de vraies photos. Aucune vraie photo n'existe dans ce projet — c'est
une décision assumée depuis le début, expliquée dans
[Pourquoi la photo du plateau est simulée](photos-simulees.md).

Le modèle a été **entraîné et testé sur des images du même générateur**. Son score de
100 % est optimiste par construction. Une vraie photo lui poserait des problèmes que
nous ne savons pas mesurer.

Les dégradations testées sont **simples et uniformes** : toute l'image s'assombrit
d'un coup. Une vraie scène aurait une ombre portée d'un côté, un reflet de l'autre.
Ce cas-là n'est pas couvert.

## Ce qu'on retient

Le modèle entraîné ne se justifie pas par un gain de précision sur des images
faciles : il n'y en a pas. Il se justifie parce qu'il continue de voir juste quand
l'éclairage s'écarte des conditions d'entraînement, là où le seuillage tombe au
niveau du hasard.

Le seuillage garde son rôle : c'est la solution de secours, et elle ne demande aucun
entraînement. C'est aussi elle qui a permis au projet de fonctionner avant que le
modèle existe.

## Refaire la mesure

Le calcul ci-dessus n'est pas un script du dépôt : c'est ce bloc, à coller dans un
fichier temporaire lancé depuis `analyse-images/`, avec l'environnement virtuel actif
et le fichier `entrainement/modele_mobilenet.onnx` déjà produit.

```python
import sys
import numpy as np
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter

sys.path.insert(0, ".")
sys.path.insert(0, "entrainement")

from jeu_de_donnees import charger_sous_ensemble
from strategies.onnx import ClassifieurOnnx
from strategies.seuillage import ClassifieurSeuillage

dossier = Path("jeu-de-photos/test")
if not charger_sous_ensemble(dossier):
    dossier = Path("jeu-de-photos-synthetique/test")
exemples = charger_sous_ensemble(dossier)


def bruit(image, ecart):
    pixels = np.asarray(image, dtype=np.float32)
    pixels += np.random.default_rng(0).normal(0, ecart, pixels.shape)
    return Image.fromarray(np.clip(pixels, 0, 255).astype(np.uint8))


degradations = {
    "aucune": lambda im: im,
    "luminosite x0.6": lambda im: ImageEnhance.Brightness(im).enhance(0.6),
    "luminosite x0.4": lambda im: ImageEnhance.Brightness(im).enhance(0.4),
    "luminosite x1.5": lambda im: ImageEnhance.Brightness(im).enhance(1.5),
    "contraste x0.5": lambda im: ImageEnhance.Contrast(im).enhance(0.5),
    "flou": lambda im: im.filter(ImageFilter.GaussianBlur(2.5)),
    "bruit 25": lambda im: bruit(im, 25),
}

classifieurs = [("seuillage", ClassifieurSeuillage()), ("onnx", ClassifieurOnnx())]

print(f"{len(exemples)} images, {len(exemples) * 28} zones\n")
print(f"{'degradation':24s} {'seuillage':>11s} {'onnx':>11s} {'ecart':>9s}")

for nom_degradation, degrader in degradations.items():
    taux = {}
    for nom_classifieur, classifieur in classifieurs:
        bons = total = 0
        for chemin, etats_reels in exemples:
            image = degrader(Image.open(chemin).convert("RGB"))
            for resultat in classifieur.analyser(image):
                total += 1
                if resultat.occupee == etats_reels[resultat.indice]:
                    bons += 1
        taux[nom_classifieur] = 100 * bons / total
    ecart = taux["onnx"] - taux["seuillage"]
    print(f"{nom_degradation:24s} {taux['seuillage']:10.2f}% {taux['onnx']:10.2f}% {ecart:+8.2f}")
```

Le bruit utilise une graine fixe, donc deux exécutions donnent le même résultat. Les
autres transformations sont déterministes.

Ce fichier temporaire ne doit pas être versionné : la mesure est un constat daté, pas
un outil du produit.
