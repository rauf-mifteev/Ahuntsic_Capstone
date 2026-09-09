"""
Lecture/écriture du manifeste d'annotations (PC-46).

Convention retenue : chaque sous-ensemble (`entrainement/`, `test/`) contient
un dossier `photos/` (les photos entières du plateau, une par prise de vue)
et un fichier `annotations.csv` avec une ligne par photo :

    fichier,z00,z01,z02,...,z27

où `z00`..`z27` valent `1` (case pleine) ou `0` (case vide), dans l'ordre
canonique des zones (voir `zones.indice_zone` : zone = (jour, créneau),
indice = (créneau-1)*7 + position du jour dans LUNDI..DIMANCHE).

Pourquoi une seule photo entière plutôt que 28 petites photos par case :
c'est ce que documente B7-choix-technologiques.md — "une seule photo de
plateau donne 28 exemples étiquetés". Une personne qui prend une photo n'a
donc qu'à noter, une fois, l'état des 28 cases (en remplissant la ligne du
CSV), pas à découper et étiqueter 28 fichiers séparés.
"""
import csv
from pathlib import Path

from zones import NB_ZONES

NOMS_COLONNES_ZONES = [f"z{i:02d}" for i in range(NB_ZONES)]

def ecrire_ligne_annotation(chemin_csv: Path, nom_fichier_photo: str, etats: list):
    """
    Ajoute une ligne au CSV (le crée avec l'en-tête s'il n'existe pas
    encore). `etats` : liste de 28 booléens, dans l'ordre canonique.
    """
    if len(etats) != NB_ZONES:
        raise ValueError(f"{NB_ZONES} états attendus, {len(etats)} reçus")

    chemin_csv = Path(chemin_csv)
    fichier_existe = chemin_csv.exists()

    with open(chemin_csv, "a", newline="", encoding="utf-8") as f:
        ecrivain = csv.writer(f)
        if not fichier_existe:
            ecrivain.writerow(["fichier", *NOMS_COLONNES_ZONES])
        ecrivain.writerow([nom_fichier_photo, *[1 if e else 0 for e in etats]])

def lire_annotations(chemin_csv: Path):
    """
    Lit le CSV et renvoie une liste de dictionnaires :
    [{"fichier": "photo_001.jpg", "etats": [True, False, ...]}, ...]
    Renvoie une liste vide si le fichier n'existe pas encore (jeu de
    photos pas encore constitué).
    """
    chemin_csv = Path(chemin_csv)
    if not chemin_csv.exists():
        return []

    exemples = []
    with open(chemin_csv, newline="", encoding="utf-8") as f:
        for ligne in csv.DictReader(f):
            etats = [ligne[colonne] == "1" for colonne in NOMS_COLONNES_ZONES]
            exemples.append({"fichier": ligne["fichier"], "etats": etats})
    return exemples

def charger_sous_ensemble(dossier_sous_ensemble: Path):
    """
    Charge un sous-ensemble complet (ex. jeu-de-photos/entrainement/) :
    renvoie une liste de (chemin_photo, etats).
    """
    dossier_sous_ensemble = Path(dossier_sous_ensemble)
    annotations = lire_annotations(dossier_sous_ensemble / "annotations.csv")

    exemples = []
    for entree in annotations:
        chemin_photo = dossier_sous_ensemble / "photos" / entree["fichier"]
        exemples.append((chemin_photo, entree["etats"]))
    return exemples
