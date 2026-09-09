import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from strategies.seuillage import ClassifieurSeuillage  # noqa: E402
from entrainement.generer_jeu_synthetique import generer_plateau  # noqa: E402
from entrainement.mesurer_erreurs import evaluer  # noqa: E402
from zones import NB_ZONES  # noqa: E402
from PIL import Image  # noqa: E402

def test_analyser_renvoie_28_resultats():
    image = generer_plateau(graine=1, etats=[i % 2 == 0 for i in range(NB_ZONES)])
    resultats = ClassifieurSeuillage().analyser(image)
    assert len(resultats) == NB_ZONES

def test_plateau_entierement_vide_est_reconnu(tmp_path):
    image = generer_plateau(graine=2, etats=[False] * NB_ZONES)
    resultats = ClassifieurSeuillage().analyser(image)
    assert all(not r.occupee for r in resultats)
    assert all(r.score > 0.5 for r in resultats)

def test_plateau_entierement_plein_est_reconnu():
    image = generer_plateau(graine=3, etats=[True] * NB_ZONES)
    resultats = ClassifieurSeuillage().analyser(image)
    assert all(r.occupee for r in resultats)
    assert all(r.score < 0.5 for r in resultats)

def test_exactitude_est_parfaite_sur_le_jeu_synthetique(tmp_path):
    exemples = []
    for graine in range(5):
        import random

        aleatoire = random.Random(graine)
        etats = [aleatoire.random() > 0.5 for _ in range(NB_ZONES)]
        image = generer_plateau(graine, etats)
        image.filename = f"plateau_{graine}.png"
        chemin = tmp_path / f"plateau_{graine}.png"
        image.save(chemin)
        exemples.append((str(chemin), etats))

    resultat = evaluer(ClassifieurSeuillage(), exemples, seuil=0.5)
    assert resultat["exactitude"] == 1.0
