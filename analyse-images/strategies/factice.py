"""
Stratégie FACTICE (patron Stratégie, voir docs/B6-patrons-conception.md).

But : permettre à l'équipe de développer et de tester l'API Node.js
(intégration, gestion des cas ambigus, écrans mobiles) AVANT que le vrai
modèle existe (AC de PC-47). Ne regarde jamais réellement l'image.

Comportement configurable par variable d'environnement, pratique pour
tester les trois cas de l'écran de résultat (PC-55 : confirmée / ambiguë
/ case encore pleine) sans dépendre d'une vraie photo :

    MODELE_FACTICE_RESULTAT=vide       -> toutes les zones "vides" (score haut)
    MODELE_FACTICE_RESULTAT=pleine     -> toutes les zones "pleines" (score bas)
    MODELE_FACTICE_RESULTAT=ambigu     -> toutes les zones à un score proche de 0.5
    MODELE_FACTICE_RESULTAT=alterne    -> alterne vide/pleine selon l'indice (défaut)
"""
import os

from interface_classifieur import Classifieur, ResultatZone
from zones import NB_ZONES

COMPORTEMENTS = {
    "vide": lambda i: 0.95,
    "pleine": lambda i: 0.05,
    "ambigu": lambda i: 0.5,
    "alterne": lambda i: 0.9 if i % 2 == 0 else 0.1,
}

class ClassifieurFactice(Classifieur):
    nom = "factice"

    def __init__(self, comportement: str = None):
        self.comportement = comportement or os.environ.get("MODELE_FACTICE_RESULTAT", "alterne")
        if self.comportement not in COMPORTEMENTS:
            raise ValueError(
                f"MODELE_FACTICE_RESULTAT invalide : {self.comportement!r} "
                f"(valeurs acceptées : {', '.join(COMPORTEMENTS)})"
            )

    def analyser(self, image):
        fonction_score = COMPORTEMENTS[self.comportement]
        return [
            ResultatZone(indice=i, occupee=fonction_score(i) < 0.5, score=fonction_score(i))
            for i in range(NB_ZONES)
        ]
