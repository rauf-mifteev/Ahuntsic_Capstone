import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from interface_classifieur import Classifieur, ResultatZone  # noqa: E402
from entrainement.mesurer_erreurs import evaluer, choisir_seuil  # noqa: E402
from entrainement.generer_jeu_synthetique import generer_jeu  # noqa: E402
from jeu_de_donnees import charger_sous_ensemble  # noqa: E402
from zones import NB_ZONES  # noqa: E402

class ClassifieurParfait(Classifieur):
    """Double de test : connaît la vérité terrain et répond sans erreur."""

    nom = "parfait-pour-tests"

    def __init__(self, verite_par_photo):
        self._verite = verite_par_photo

    def analyser(self, image):
        etats = self._verite[Path(image.filename).name]
        return [
            ResultatZone(indice=i, occupee=not pleine, score=1.0 if not pleine else 0.0)
            for i, pleine in enumerate(etats)
        ]

class ClassifieurQuiDitToujoursVide(Classifieur):
    """Double de test : déclare systématiquement toutes les zones vides (score=1.0)."""

    nom = "toujours-vide"

    def analyser(self, image):
        return [ResultatZone(indice=i, occupee=True, score=1.0) for i in range(NB_ZONES)]

def _preparer_jeu(tmp_path):
    generer_jeu(tmp_path, nombre_images=10, graine_depart=100)
    exemples = charger_sous_ensemble(tmp_path / "test")
    verite = {Path(chemin).name: etats for chemin, etats in exemples}
    return exemples, verite

def test_evaluer_classifieur_parfait_ne_fait_aucune_erreur(tmp_path):
    exemples, verite = _preparer_jeu(tmp_path)
    classifieur = ClassifieurParfait(verite)

    resultat = evaluer(classifieur, exemples, seuil=0.5)

    assert resultat["faux_positifs"] == 0
    assert resultat["faux_negatifs"] == 0
    assert resultat["exactitude"] == 1.0

def test_evaluer_classifieur_toujours_vide_maximise_les_faux_positifs(tmp_path):
    exemples, _ = _preparer_jeu(tmp_path)
    classifieur = ClassifieurQuiDitToujoursVide()

    resultat = evaluer(classifieur, exemples, seuil=0.5)

    assert resultat["taux_faux_positifs"] == 1.0

def test_choisir_seuil_respecte_la_limite_de_faux_positifs(tmp_path):
    exemples, verite = _preparer_jeu(tmp_path)
    classifieur = ClassifieurParfait(verite)

    resultat = choisir_seuil(classifieur, exemples, taux_faux_positifs_max=0.02)

    assert resultat["taux_faux_positifs"] <= 0.02

def test_choisir_seuil_prefere_le_doute_face_a_un_mauvais_classifieur(tmp_path):
    exemples, _ = _preparer_jeu(tmp_path)
    classifieur = ClassifieurQuiDitToujoursVide()

    resultat = choisir_seuil(classifieur, exemples, taux_faux_positifs_max=0.02)

    assert resultat["seuil"] == 0.99
