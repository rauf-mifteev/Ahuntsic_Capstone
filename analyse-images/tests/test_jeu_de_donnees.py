import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from jeu_de_donnees import ecrire_ligne_annotation, lire_annotations, charger_sous_ensemble  # noqa: E402
from zones import NB_ZONES  # noqa: E402

def test_lire_annotations_renvoie_liste_vide_si_absent(tmp_path):
    assert lire_annotations(tmp_path / "inexistant.csv") == []

def test_ecrire_puis_lire_une_annotation(tmp_path):
    csv_path = tmp_path / "annotations.csv"
    etats = [i % 2 == 0 for i in range(NB_ZONES)]

    ecrire_ligne_annotation(csv_path, "photo_001.jpg", etats)
    lignes = lire_annotations(csv_path)

    assert len(lignes) == 1
    assert lignes[0]["fichier"] == "photo_001.jpg"
    assert lignes[0]["etats"] == etats

def test_ecrire_rejette_une_liste_de_mauvaise_taille(tmp_path):
    try:
        ecrire_ligne_annotation(tmp_path / "annotations.csv", "photo.jpg", [True, False])
        assert False, "aurait dû lever une exception"
    except ValueError:
        pass

def test_charger_sous_ensemble(tmp_path):
    sous_ensemble = tmp_path / "entrainement"
    (sous_ensemble / "photos").mkdir(parents=True)
    etats = [True] * NB_ZONES
    ecrire_ligne_annotation(sous_ensemble / "annotations.csv", "a.jpg", etats)

    exemples = charger_sous_ensemble(sous_ensemble)

    assert len(exemples) == 1
    chemin, etats_lus = exemples[0]
    assert chemin == sous_ensemble / "photos" / "a.jpg"
    assert etats_lus == etats
