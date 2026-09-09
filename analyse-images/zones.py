"""
Géométrie des 28 zones du plateau (7 jours × 4 créneaux).

Hypothèse de conception (documentée pour l'équipe) : le plateau physique
est un pilulier hebdomadaire classique — 7 colonnes (un jour chacune, de
LUNDI à DIMANCHE) et 4 rangées (un créneau chacune, du haut vers le bas).
La photo est prise de face, plateau centré, comme documenté dans
`jeu-de-photos/README.md`. Si votre boîtier physique a une disposition
différente, seule cette fonction `decouper_zones` doit changer — le reste
du service (stratégies, service FastAPI, entraînement) n'a pas besoin d'être
touché, car il ne manipule que des indices de zone (0 à 27), jamais des
coordonnées de pixels directement.
"""
from PIL import Image

JOURS_ORDRE = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE"]
NB_JOURS = 7
NB_CRENEAUX = 4
NB_ZONES = NB_JOURS * NB_CRENEAUX

MARGE_RELATIVE = 0.08

def indice_zone(jour: str, creneau: int) -> int:
    """Renvoie l'indice canonique (0-27) d'une zone (jour, créneau)."""
    if jour not in JOURS_ORDRE:
        raise ValueError(f"Jour invalide : {jour}")
    if not (1 <= creneau <= NB_CRENEAUX):
        raise ValueError(f"Créneau invalide : {creneau}")
    colonne = JOURS_ORDRE.index(jour)
    ligne = creneau - 1
    return ligne * NB_JOURS + colonne

def zone_depuis_indice(indice: int):
    """Opération inverse : indice (0-27) -> (jour, créneau)."""
    if not (0 <= indice < NB_ZONES):
        raise ValueError(f"Indice de zone invalide : {indice}")
    ligne, colonne = divmod(indice, NB_JOURS)
    return JOURS_ORDRE[colonne], ligne + 1

def decouper_zones(image: Image.Image):
    """
    Découpe une photo du plateau en 28 sous-images, dans l'ordre canonique
    (indice 0 à 27, voir `indice_zone`). Renvoie une liste de 28 objets
    PIL.Image.
    """
    largeur, hauteur = image.size
    largeur_cellule = largeur / NB_JOURS
    hauteur_cellule = hauteur / NB_CRENEAUX

    zones = []
    for indice in range(NB_ZONES):
        ligne, colonne = divmod(indice, NB_JOURS)

        x0 = colonne * largeur_cellule
        y0 = ligne * hauteur_cellule
        marge_x = largeur_cellule * MARGE_RELATIVE
        marge_y = hauteur_cellule * MARGE_RELATIVE

        boite = (
            round(x0 + marge_x),
            round(y0 + marge_y),
            round(x0 + largeur_cellule - marge_x),
            round(y0 + hauteur_cellule - marge_y),
        )
        zones.append(image.crop(boite))

    return zones
