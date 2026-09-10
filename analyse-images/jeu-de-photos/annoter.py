"""
Outil d'annotation en ligne de commande (PC-46).

Découpe une photo du plateau en 28 zones, les enregistre dans un dossier
temporaire pour que vous puissiez les regarder une à une avec votre
visionneuse d'images habituelle, puis vous demande "pleine" ou "vide"
pour chacune et écrit la ligne correspondante dans annotations.csv.

Usage :
    python3 jeu-de-photos/annoter.py entrainement/photos/photo_004.jpg
"""
import sys
import tempfile
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from zones import NB_ZONES, zone_depuis_indice, decouper_zones  # noqa: E402
from jeu_de_donnees import ecrire_ligne_annotation  # noqa: E402

def annoter(chemin_photo: Path):
    chemin_photo = Path(chemin_photo)
    image = Image.open(chemin_photo)
    zones = decouper_zones(image)

    dossier_temp = Path(tempfile.mkdtemp(prefix="pilulier_annotation_"))
    print(f"Zones extraites dans : {dossier_temp}\n")

    etats = []
    for indice, zone in enumerate(zones):
        jour, creneau = zone_depuis_indice(indice)
        chemin_zone = dossier_temp / f"zone_{indice:02d}_{jour}_creneau{creneau}.png"
        zone.save(chemin_zone)

        reponse = ""
        while reponse not in ("p", "v"):
            reponse = input(f"Zone {indice + 1}/{NB_ZONES} ({jour}, créneau {creneau}) "
                             f"— voir {chemin_zone.name} — pleine (p) ou vide (v) ? ").strip().lower()
        etats.append(reponse == "p")

    dossier_sous_ensemble = chemin_photo.parent.parent
    ecrire_ligne_annotation(dossier_sous_ensemble / "annotations.csv", chemin_photo.name, etats)
    print(f"\nAnnotation enregistrée dans {dossier_sous_ensemble / 'annotations.csv'}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage : python3 annoter.py <chemin/vers/photo.jpg>")
        sys.exit(1)
    annoter(sys.argv[1])
