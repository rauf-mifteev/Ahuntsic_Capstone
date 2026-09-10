"""Tests du plateau simulé (PC-51) — la source des photos en l'absence de caméra."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import plateau_simule  # noqa: E402
from zones import NB_ZONES  # noqa: E402

@pytest.fixture(autouse=True)
def plateau_neuf():
    plateau_simule.reinitialiser()
    yield
    plateau_simule.reinitialiser()

def test_un_plateau_neuf_est_vide():
    assert plateau_simule.etat("PILULIER-TEST") == [False] * NB_ZONES

def test_remplir_rend_les_28_cases_pleines():
    assert plateau_simule.remplir("PILULIER-TEST") == [True] * NB_ZONES

def test_prendre_vide_uniquement_la_case_visee():
    plateau_simule.remplir("PILULIER-TEST")
    etats = plateau_simule.prendre("PILULIER-TEST", 12)

    assert etats[12] is False
    assert sum(1 for pleine in etats if not pleine) == 1

def test_prendre_hors_bornes_est_refuse():
    with pytest.raises(ValueError):
        plateau_simule.prendre("PILULIER-TEST", NB_ZONES)

def test_les_plateaux_de_deux_dispositifs_sont_independants():
    plateau_simule.remplir("PILULIER-A")

    assert plateau_simule.etat("PILULIER-B") == [False] * NB_ZONES

def test_photographier_produit_une_image_du_plateau():
    plateau_simule.remplir("PILULIER-TEST")
    image = plateau_simule.photographier("PILULIER-TEST")

    assert image.size[0] > 0 and image.size[1] > 0
    assert image.mode == "RGB"

def test_deux_photos_du_meme_plateau_ne_sont_pas_identiques():
    plateau_simule.remplir("PILULIER-TEST")
    premiere = plateau_simule.photographier("PILULIER-TEST").tobytes()
    seconde = plateau_simule.photographier("PILULIER-TEST").tobytes()

    assert premiere != seconde
