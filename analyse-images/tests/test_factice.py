import sys
from pathlib import Path

import pytest
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from strategies.factice import ClassifieurFactice  # noqa: E402
from zones import NB_ZONES  # noqa: E402

def _image_quelconque():
    return Image.new("RGB", (140, 80), color="white")

def test_comportement_vide_donne_un_score_eleve_pour_toutes_les_zones():
    classifieur = ClassifieurFactice(comportement="vide")
    resultats = classifieur.analyser(_image_quelconque())

    assert len(resultats) == NB_ZONES
    assert all(r.score >= 0.5 and not r.occupee for r in resultats)

def test_comportement_pleine_donne_un_score_bas_pour_toutes_les_zones():
    classifieur = ClassifieurFactice(comportement="pleine")
    resultats = classifieur.analyser(_image_quelconque())

    assert all(r.score < 0.5 and r.occupee for r in resultats)

def test_comportement_ambigu_donne_un_score_proche_de_0_5():
    classifieur = ClassifieurFactice(comportement="ambigu")
    resultats = classifieur.analyser(_image_quelconque())

    assert all(r.score == 0.5 for r in resultats)

def test_comportement_alterne_varie_selon_lindice():
    classifieur = ClassifieurFactice(comportement="alterne")
    resultats = classifieur.analyser(_image_quelconque())

    scores_pairs = {r.score for r in resultats if r.indice % 2 == 0}
    scores_impairs = {r.score for r in resultats if r.indice % 2 == 1}
    assert scores_pairs != scores_impairs

def test_comportement_invalide_leve_une_erreur():
    with pytest.raises(ValueError):
        ClassifieurFactice(comportement="n-importe-quoi")

def test_lit_le_comportement_depuis_la_variable_denvironnement(monkeypatch):
    monkeypatch.setenv("MODELE_FACTICE_RESULTAT", "pleine")
    classifieur = ClassifieurFactice()
    assert classifieur.comportement == "pleine"
