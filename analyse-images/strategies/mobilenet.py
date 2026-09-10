"""
Stratégie MobileNetV3-Small — le VRAI modèle (PC-49), entraîné par
entrainement/entrainer_mobilenet.py (PC-48).

Nécessite `torch` et `torchvision` (requirements-entrainement.txt) et un
modèle déjà entraîné (entrainement/modele_mobilenet.pt). Si ces
dépendances ne sont pas installées, l'import de ce module ne casse rien
ailleurs (app.py ne le charge que si MODELE_STRATEGIE=mobilenet) mais
instancier ClassifieurMobileNet lève une erreur claire.
"""
from pathlib import Path

from interface_classifieur import Classifieur, ResultatZone
from zones import decouper_zones, NB_ZONES

try:
    import torch
    from torch import nn
    from torchvision import models, transforms

    _TORCH_DISPONIBLE = True
except ImportError:
    _TORCH_DISPONIBLE = False

TAILLE_ENTREE = 64

CHEMIN_MODELE_DEFAUT = Path(__file__).resolve().parent.parent / "entrainement" / "modele_mobilenet.pt"

class ClassifieurMobileNet(Classifieur):
    nom = "mobilenet-v3-small"

    def __init__(self, chemin_modele: Path = None):
        if not _TORCH_DISPONIBLE:
            raise RuntimeError(
                "torch/torchvision ne sont pas installés. "
                "Installez requirements-entrainement.txt pour utiliser ClassifieurMobileNet."
            )

        chemin_modele = Path(chemin_modele or CHEMIN_MODELE_DEFAUT)
        if not chemin_modele.exists():
            raise FileNotFoundError(
                f"Modèle introuvable : {chemin_modele}. "
                "Lancez d'abord entrainement/entrainer_mobilenet.py (PC-48)."
            )

        self._transformation = transforms.Compose(
            [
                transforms.Resize((TAILLE_ENTREE, TAILLE_ENTREE)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ]
        )

        self._modele = models.mobilenet_v3_small(weights=None)
        nb_entrees = self._modele.classifier[-1].in_features
        self._modele.classifier[-1] = nn.Linear(nb_entrees, 2)
        self._modele.load_state_dict(torch.load(chemin_modele, map_location="cpu"))
        self._modele.eval()

    def analyser(self, image):
        zones = decouper_zones(image.convert("RGB"))
        lot = torch.stack([self._transformation(zone) for zone in zones])

        with torch.no_grad():
            logits = self._modele(lot)
            probabilites = torch.softmax(logits, dim=1)

        resultats = []
        for indice in range(NB_ZONES):
            score_vide = probabilites[indice, 0].item()
            resultats.append(ResultatZone(indice=indice, occupee=score_vide < 0.5, score=score_vide))
        return resultats
