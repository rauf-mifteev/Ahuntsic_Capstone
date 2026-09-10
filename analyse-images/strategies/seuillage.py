"""
Stratégie de SEUILLAGE OpenCV — la "solution de secours" documentée dans
docs/B7-choix-technologiques.md. Fonctionne dès le premier jour, sans
aucun entraînement : niveaux de gris, seuil, comptage des pixels sombres
dans la zone. Sert aussi de point de comparaison chiffré une fois le vrai
modèle entraîné ("le seuillage donne 91 %, le modèle donne 98 %").

Principe : une case VIDE (plateau clair, vu de face, DEL allumées) a peu
de pixels sombres. Une case PLEINE contient un comprimé ou un objet plus
foncé que le fond, donc plus de pixels sombres. Le ratio de pixels
sombres dans la zone donne directement un score continu, pas seulement
une décision binaire.
"""
import cv2
import numpy as np

from interface_classifieur import Classifieur, ResultatZone
from zones import decouper_zones

SEUIL_GRIS = 100
RATIO_SOMBRE_MAX = 0.40

def _ratio_pixels_sombres(image_zone) -> float:
    gris = cv2.cvtColor(np.array(image_zone.convert("RGB")), cv2.COLOR_RGB2GRAY)
    _, masque = cv2.threshold(gris, SEUIL_GRIS, 255, cv2.THRESH_BINARY_INV)
    return float(np.count_nonzero(masque)) / masque.size

class ClassifieurSeuillage(Classifieur):
    nom = "seuillage-opencv"

    def analyser(self, image):
        zones = decouper_zones(image.convert("RGB"))
        resultats = []

        for indice, zone in enumerate(zones):
            ratio_sombre = _ratio_pixels_sombres(zone)
            score_vide = max(0.0, min(1.0, 1.0 - (ratio_sombre / RATIO_SOMBRE_MAX)))
            resultats.append(ResultatZone(indice=indice, occupee=score_vide < 0.5, score=score_vide))

        return resultats
