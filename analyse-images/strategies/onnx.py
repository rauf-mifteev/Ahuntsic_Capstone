"""
Stratégie ONNX (PC-118) — le VRAI modèle entraîné, exécuté sans PyTorch.

Pourquoi cette stratégie existe alors que `mobilenet` fait déjà tourner le
même modèle : PyTorch pèse environ 500 Mo (2,5 Go avec ses dépendances) et
TensorFlow environ 550 Mo, alors que le palier gratuit de Render ne donne
que 512 Mo de mémoire. ONNX Runtime, lui, pèse environ 16 Mo. On entraîne
donc avec PyTorch en local, on exporte le modèle au format ONNX
(entrainement/exporter_onnx.py), et le service déployé exécute EXACTEMENT
le même modèle avec un moteur léger. Mêmes poids, mêmes verdicts.

Le prétraitement ci-dessous doit rester IDENTIQUE à celui de
strategies/mobilenet.py : redimensionnement en 64x64, mise à l'échelle
0-1, normalisation ImageNet, format NCHW. Sinon les deux stratégies ne
donneraient pas le même résultat sur la même image. C'est exactement ce
que vérifie la comparaison de parité de exporter_onnx.py.
"""
from pathlib import Path

import numpy as np
from PIL import Image

from interface_classifieur import Classifieur, ResultatZone
from zones import decouper_zones, NB_ZONES

try:
    import onnxruntime

    _ONNXRUNTIME_DISPONIBLE = True
except ImportError:
    _ONNXRUNTIME_DISPONIBLE = False

TAILLE_ENTREE = 64

# Les mêmes constantes qu'ImageNet, déjà utilisées par strategies/mobilenet.py.
MOYENNE = np.array([0.485, 0.456, 0.406], dtype=np.float32)
ECART_TYPE = np.array([0.229, 0.224, 0.225], dtype=np.float32)

CHEMIN_MODELE_DEFAUT = Path(__file__).resolve().parent.parent / "entrainement" / "modele_mobilenet.onnx"


def preparer_lot(zones):
    """
    Transforme 28 images de zone (objets PIL) en un tableau numpy de forme
    (28, 3, 64, 64), float32, normalisé comme à l'entraînement.

    Fonction publique : entrainement/exporter_onnx.py s'en sert pour
    comparer PyTorch et ONNX sur exactement les mêmes entrées.
    """
    lot = np.empty((len(zones), 3, TAILLE_ENTREE, TAILLE_ENTREE), dtype=np.float32)

    for indice, zone in enumerate(zones):
        redimensionnee = zone.convert("RGB").resize((TAILLE_ENTREE, TAILLE_ENTREE), Image.BILINEAR)
        pixels = np.asarray(redimensionnee, dtype=np.float32) / 255.0  # (H, L, 3), valeurs 0-1
        pixels = (pixels - MOYENNE) / ECART_TYPE
        lot[indice] = np.transpose(pixels, (2, 0, 1))  # (3, H, L), comme PyTorch

    return lot


def softmax(logits):
    """Softmax ligne par ligne, en retirant le maximum pour éviter les débordements."""
    stabilises = logits - logits.max(axis=1, keepdims=True)
    exponentielles = np.exp(stabilises)
    return exponentielles / exponentielles.sum(axis=1, keepdims=True)


class ClassifieurOnnx(Classifieur):
    nom = "mobilenet-onnx"

    def __init__(self, chemin_modele: Path = None):
        if not _ONNXRUNTIME_DISPONIBLE:
            raise RuntimeError(
                "onnxruntime n'est pas installé. Installez requirements.txt "
                "pour utiliser ClassifieurOnnx."
            )

        chemin_modele = Path(chemin_modele or CHEMIN_MODELE_DEFAUT)
        if not chemin_modele.exists():
            raise FileNotFoundError(
                f"Modèle introuvable : {chemin_modele}. "
                "Lancez d'abord entrainement/exporter_onnx.py (PC-117)."
            )

        self._session = onnxruntime.InferenceSession(
            str(chemin_modele), providers=["CPUExecutionProvider"]
        )
        self._nom_entree = self._session.get_inputs()[0].name

    def analyser(self, image):
        zones = decouper_zones(image.convert("RGB"))

        # Un seul appel pour les 28 zones : l'axe de lot du modèle est
        # dynamique, c'est ce que prépare exporter_onnx.py.
        sorties = self._session.run(None, {self._nom_entree: preparer_lot(zones)})
        probabilites = softmax(np.asarray(sorties[0], dtype=np.float32))

        resultats = []
        for indice in range(NB_ZONES):
            # Classe 0 = vide, classe 1 = pleine (voir entrainer_mobilenet.py :
            # l'étiquette vaut 1 quand la case est pleine).
            score_vide = float(probabilites[indice, 0])
            resultats.append(ResultatZone(indice=indice, occupee=score_vide < 0.5, score=score_vide))

        return resultats
