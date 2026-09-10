"""
Interface commune du patron Stratégie (voir docs/B6-patrons-conception.md) :
un seul contrat, plusieurs implémentations interchangeables
(strategies/factice.py, strategies/seuillage.py, strategies/mobilenet.py).

Convention importante, qui vaut pour TOUTES les implémentations :
`ResultatZone.score` est la probabilité, entre 0 et 1, que la zone soit
VIDE (pas "la confiance dans le verdict retourné"). C'est ce qui permet à
`entrainement/mesurer_erreurs.py` de balayer un seuil de décision de la
même façon quelle que soit la stratégie, et c'est aussi ce que l'API
Node.js reçoit et compare à SON PROPRE seuil (RG-03) — la décision finale
(confirmée / ambiguë) n'est jamais prise ici, seulement le score.
"""
from dataclasses import dataclass

@dataclass
class ResultatZone:
    indice: int
    occupee: bool
    score: float

class Classifieur:
    """Toute stratégie de classification doit hériter de cette classe."""

    nom = "classifieur-base"

    def analyser(self, image) -> list:
        """
        `image` : un objet PIL.Image du plateau ENTIER (pas déjà découpé).
        Renvoie une liste de 28 ResultatZone, dans l'ordre canonique
        (voir zones.py).
        """
        raise NotImplementedError
