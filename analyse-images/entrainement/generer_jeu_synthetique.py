"""
Génère le jeu d'images SYNTHÉTIQUES du plateau (PC-46).

Ce n'est pas un échafaudage : le projet ne prend aucune vraie photo (voir
docs/photos-simulees.md), donc ce script produit LE jeu de données
du projet — celui qui sert à l'entraînement (PC-48), à la mesure des
erreurs et aux tests automatisés.

Avantage secondaire, mais réel : les étiquettes sont exactes par
construction (le générateur sait ce qu'il a dessiné) et les images sont
reproductibles, ce qu'aucun jeu de vraies photos annotées à la main ne
garantit.

Limite à garder en tête : un modèle entraîné et évalué sur des images du
même générateur obtient un score optimiste, qui ne dit rien de sa
performance sur de vraies photos. Voir jeu-de-photos/README.md.

Chaque image générée représente un plateau 7×4 : certaines cases sont
"pleines" (un disque foncé, simulant un comprimé) et d'autres "vides"
(case claire, uniforme). Le manifeste `annotations.csv` du sous-ensemble
est rempli avec le même format que celui attendu pour les vraies photos
(voir jeu_de_donnees.py) : le reste du pipeline ne fait donc aucune
différence entre les deux.
"""
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from zones import NB_CRENEAUX, NB_JOURS, NB_ZONES  # noqa: E402
from jeu_de_donnees import ecrire_ligne_annotation  # noqa: E402

NOMBRE_IMAGES_PAR_DEFAUT = 30

TAILLE_CELLULE = 60
LARGEUR_IMAGE = TAILLE_CELLULE * NB_JOURS
HAUTEUR_IMAGE = TAILLE_CELLULE * NB_CRENEAUX

def generer_plateau(graine: int, etats: list) -> Image.Image:
    """
    `etats` : liste de 28 booléens (True = case pleine), dans l'ordre
    canonique des zones (voir zones.indice_zone).
    """
    if len(etats) != NB_ZONES:
        raise ValueError("Il faut exactement 28 états (un par zone)")

    aleatoire = random.Random(graine)
    image = Image.new("RGB", (LARGEUR_IMAGE, HAUTEUR_IMAGE), color=(235, 230, 218))
    dessin = ImageDraw.Draw(image)

    for indice, pleine in enumerate(etats):
        ligne, colonne = divmod(indice, NB_JOURS)
        x0, y0 = colonne * TAILLE_CELLULE, ligne * TAILLE_CELLULE

        fond = aleatoire.randint(220, 245)
        dessin.rectangle(
            [x0 + 2, y0 + 2, x0 + TAILLE_CELLULE - 2, y0 + TAILLE_CELLULE - 2],
            fill=(fond, fond - 5, fond - 15),
        )

        if pleine:
            rayon = TAILLE_CELLULE * 0.28
            cx = x0 + TAILLE_CELLULE / 2 + aleatoire.uniform(-4, 4)
            cy = y0 + TAILLE_CELLULE / 2 + aleatoire.uniform(-4, 4)
            teinte = aleatoire.randint(40, 70)
            dessin.ellipse(
                [cx - rayon, cy - rayon, cx + rayon, cy + rayon],
                fill=(teinte, teinte, teinte + 10),
            )

    return image

def generer_jeu(dossier_jeu_de_photos: Path, nombre_images: int = NOMBRE_IMAGES_PAR_DEFAUT, graine_depart: int = 0):
    """
    Génère `nombre_images` plateaux avec un mélange aléatoire (mais
    reproductible) de cases pleines/vides, et les répartit entre
    entrainement/ et test/ (80 % / 20 %, jamais mélangés — voir l'AC de
    PC-45 : « une partie des photos est mise de côté et jamais utilisée
    pour l'entraînement »).
    """
    dossier_jeu_de_photos = Path(dossier_jeu_de_photos)
    nb_test = max(1, round(nombre_images * 0.2))

    for sous_ensemble in ("entrainement", "test"):
        manifeste = dossier_jeu_de_photos / sous_ensemble / "annotations.csv"
        if manifeste.exists():
            manifeste.unlink()

    manifest = []
    for i in range(nombre_images):
        graine = graine_depart + i
        aleatoire = random.Random(graine)
        etats = [aleatoire.random() > 0.5 for _ in range(NB_ZONES)]

        image = generer_plateau(graine, etats)

        sous_ensemble = "test" if i < nb_test else "entrainement"
        nom_fichier = f"plateau_synthetique_{graine:03d}.png"
        dossier_sous_ensemble = dossier_jeu_de_photos / sous_ensemble
        (dossier_sous_ensemble / "photos").mkdir(parents=True, exist_ok=True)
        image.save(dossier_sous_ensemble / "photos" / nom_fichier)
        ecrire_ligne_annotation(dossier_sous_ensemble / "annotations.csv", nom_fichier, etats)

        manifest.append({"fichier": nom_fichier, "sous_ensemble": sous_ensemble, "etats": etats})

    return manifest

if __name__ == "__main__":
    dossier = Path(__file__).resolve().parent.parent / "jeu-de-photos-synthetique"
    resultat = generer_jeu(dossier)
    print(f"{len(resultat)} plateaux synthétiques générés dans {dossier}")
