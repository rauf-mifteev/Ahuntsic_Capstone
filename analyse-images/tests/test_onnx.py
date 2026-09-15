"""Tests de la stratégie ONNX (PC-119) — le modèle entraîné, sans PyTorch.

Ces tests sont sautés quand onnxruntime n'est pas installé ou quand le
modèle n'a pas encore été exporté : l'intégration continue ne doit pas
devenir rouge parce qu'un poste de travail n'a pas lancé l'entraînement.
La vérification automatique de l'étape, elle, exige le modèle et échoue
s'il manque.
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from zones import NB_ZONES  # noqa: E402
from entrainement.generer_jeu_synthetique import generer_plateau  # noqa: E402

CHEMIN_MODELE = Path(__file__).resolve().parent.parent / "entrainement" / "modele_mobilenet.onnx"

onnxruntime = pytest.importorskip("onnxruntime", reason="onnxruntime n'est pas installé")

pytestmark = pytest.mark.skipif(
    not CHEMIN_MODELE.exists(),
    reason="modele_mobilenet.onnx absent : lancez entrainement/exporter_onnx.py",
)

CASE_VIDE = 12


def plateau_avec_une_seule_case_vide(indice_vide=CASE_VIDE, graine=7):
    etats = [True] * NB_ZONES
    etats[indice_vide] = False
    return generer_plateau(graine, etats)


def classifieur():
    from strategies.onnx import ClassifieurOnnx

    return ClassifieurOnnx()


def test_analyser_renvoie_28_resultats_dans_l_ordre():
    resultats = classifieur().analyser(plateau_avec_une_seule_case_vide())

    assert len(resultats) == NB_ZONES
    assert [r.indice for r in resultats] == list(range(NB_ZONES))


def test_les_scores_sont_des_probabilites():
    resultats = classifieur().analyser(plateau_avec_une_seule_case_vide())

    assert all(0.0 <= r.score <= 1.0 for r in resultats)


def test_trouve_la_seule_case_vide():
    """Le test qui compte : si les classes étaient inversées, il échouerait."""
    resultats = classifieur().analyser(plateau_avec_une_seule_case_vide())

    zones_vides = [r.indice for r in resultats if not r.occupee]
    assert zones_vides == [CASE_VIDE]


def test_le_nom_de_la_strategie_est_publie():
    """C'est ce nom que l'API Node enregistre dans Verification.strategieUtilisee."""
    assert classifieur().nom == "mobilenet-onnx"


def test_modele_absent_donne_une_erreur_claire(tmp_path):
    from strategies.onnx import ClassifieurOnnx

    with pytest.raises(FileNotFoundError):
        ClassifieurOnnx(chemin_modele=tmp_path / "modele-qui-n-existe-pas.onnx")
