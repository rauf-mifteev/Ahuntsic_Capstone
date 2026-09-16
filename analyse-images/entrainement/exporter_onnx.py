"""
Exporte le modèle entraîné au format ONNX (PC-117).

Pourquoi : le service déployé ne peut pas embarquer PyTorch (environ
500 Mo, 2,5 Go avec ses dépendances) sur un hébergement qui donne 512 Mo
de mémoire. ONNX est un format d'échange lu par ONNX Runtime, qui pèse
environ 16 Mo. On entraîne avec PyTorch, on exécute avec ONNX Runtime.

Ce script ne se contente pas d'exporter : il VÉRIFIE que les deux moteurs
donnent le même résultat. Un export silencieusement faux (mauvaise taille
d'entrée, normalisation différente, classes inversées) donnerait un
service qui répond n'importe quoi sans jamais lever d'erreur. La
vérification porte sur deux choses :

  1. l'écart numérique maximal entre les sorties PyTorch et ONNX ;
  2. le nombre de zones où la DÉCISION diffère, qui doit être zéro.

Usage :
    pip install -r requirements.txt -r requirements-entrainement.txt
    python entrainement/exporter_onnx.py
"""
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RACINE))

try:
    import torch
    from torch import nn
    from torchvision import models, transforms
except ImportError as err:  # pragma: no cover - message d'aide, pas de logique à tester
    raise SystemExit(
        "torch/torchvision ne sont pas installés. "
        "Lancez : pip install -r requirements-entrainement.txt"
    ) from err

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from jeu_de_donnees import charger_sous_ensemble  # noqa: E402
from zones import decouper_zones  # noqa: E402
from strategies.onnx import preparer_lot  # noqa: E402

CHEMIN_MODELE_PT = Path(__file__).resolve().parent / "modele_mobilenet.pt"
CHEMIN_MODELE_ONNX = Path(__file__).resolve().parent / "modele_mobilenet.onnx"

DOSSIER_JEU_DE_PHOTOS = RACINE / "jeu-de-photos"
DOSSIER_JEU_SYNTHETIQUE = RACINE / "jeu-de-photos-synthetique"

TAILLE_ENTREE = 64
VERSION_OPSET = 17
ECART_MAXIMAL_TOLERE = 1e-3

TRANSFORMATION = transforms.Compose(
    [
        transforms.Resize((TAILLE_ENTREE, TAILLE_ENTREE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]
)


def charger_modele_entraine():
    """Reconstruit MobileNetV3-Small avec sa tête à 2 classes, puis charge les poids."""
    if not CHEMIN_MODELE_PT.exists():
        raise SystemExit(
            f"Modèle introuvable : {CHEMIN_MODELE_PT}. "
            "Lancez d'abord entrainement/entrainer_mobilenet.py."
        )

    modele = models.mobilenet_v3_small(weights=None)
    nb_entrees = modele.classifier[-1].in_features
    modele.classifier[-1] = nn.Linear(nb_entrees, 2)
    modele.load_state_dict(torch.load(CHEMIN_MODELE_PT, map_location="cpu"))
    modele.eval()
    return modele


def exporter(modele):
    """Écrit le fichier ONNX, avec un axe de lot dynamique pour les 28 zones."""
    entree_factice = torch.randn(1, 3, TAILLE_ENTREE, TAILLE_ENTREE)

    arguments = dict(
        input_names=["zones"],
        output_names=["logits"],
        dynamic_axes={"zones": {0: "lot"}, "logits": {0: "lot"}},
        opset_version=VERSION_OPSET,
    )

    try:
        torch.onnx.export(modele, entree_factice, str(CHEMIN_MODELE_ONNX), dynamo=False, **arguments)
    except TypeError:
        torch.onnx.export(modele, entree_factice, str(CHEMIN_MODELE_ONNX), **arguments)

    print(f"Modèle exporté dans {CHEMIN_MODELE_ONNX}")


def resoudre_dossier_de_test():
    """Les vraies photos ont la priorité ; sinon le jeu synthétique, généré au besoin."""
    if charger_sous_ensemble(DOSSIER_JEU_DE_PHOTOS / "test"):
        return DOSSIER_JEU_DE_PHOTOS / "test"

    if not charger_sous_ensemble(DOSSIER_JEU_SYNTHETIQUE / "test"):
        print("Aucun jeu de données trouvé — génération du jeu synthétique...")
        from entrainement.generer_jeu_synthetique import generer_jeu

        generer_jeu(DOSSIER_JEU_SYNTHETIQUE)

    return DOSSIER_JEU_SYNTHETIQUE / "test"


def verifier_parite(modele):
    """
    Compare PyTorch et ONNX sur toutes les images du jeu de test.

    Renvoie (écart maximal, amplitude maximale des logits, nombre de
    décisions différentes, nombre de zones).
    """
    import onnxruntime

    session = onnxruntime.InferenceSession(
        str(CHEMIN_MODELE_ONNX), providers=["CPUExecutionProvider"]
    )
    nom_entree = session.get_inputs()[0].name

    exemples = charger_sous_ensemble(resoudre_dossier_de_test())
    if not exemples:
        raise SystemExit("Aucune image de test : impossible de vérifier la parité.")

    ecart_maximal = 0.0
    amplitude_maximale = 0.0
    decisions_differentes = 0
    zones_comparees = 0

    for chemin_photo, _etats in exemples:
        image = Image.open(chemin_photo).convert("RGB")
        zones = decouper_zones(image)

        lot_torch = torch.stack([TRANSFORMATION(zone) for zone in zones])
        with torch.no_grad():
            sorties_torch = modele(lot_torch).numpy()

        sorties_onnx = session.run(None, {nom_entree: preparer_lot(zones)})[0]

        ecart_maximal = max(ecart_maximal, float(np.abs(sorties_torch - sorties_onnx).max()))
        amplitude_maximale = max(amplitude_maximale, float(np.abs(sorties_torch).max()))

        decisions_torch = sorties_torch.argmax(axis=1)
        decisions_onnx = np.asarray(sorties_onnx).argmax(axis=1)
        decisions_differentes += int((decisions_torch != decisions_onnx).sum())
        zones_comparees += len(zones)

    return ecart_maximal, amplitude_maximale, decisions_differentes, zones_comparees


def main():
    modele = charger_modele_entraine()
    exporter(modele)

    ecart, amplitude, differences, zones = verifier_parite(modele)
    megaoctets = CHEMIN_MODELE_ONNX.stat().st_size / (1024 * 1024)

    print(f"\nVérification de parité sur {zones} zones :")
    print(f"  Écart absolu maximal PyTorch / ONNX : {ecart:.3e} (toléré : {ECART_MAXIMAL_TOLERE:.0e})")
    print(f"  Amplitude maximale des logits        : {amplitude:.2f}")
    print(f"  Erreur relative                      : {ecart / amplitude:.3e}")
    print(f"  Décisions différentes                : {differences}")
    print(f"  Taille du fichier ONNX               : {megaoctets:.1f} Mo")

    if ecart > ECART_MAXIMAL_TOLERE or differences > 0:
        raise SystemExit(
            "\nÉCHEC : le modèle ONNX ne donne pas les mêmes résultats que PyTorch. "
            "Ne versionnez pas ce fichier. Vérifiez le prétraitement de strategies/onnx.py."
        )

    print("\nParité confirmée : le modèle ONNX donne les mêmes verdicts que PyTorch.")
    print("Rappel : le score reste optimiste, entraînement et test viennent du même générateur.")


if __name__ == "__main__":
    main()
