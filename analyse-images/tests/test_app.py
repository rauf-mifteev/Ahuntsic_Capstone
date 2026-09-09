"""Tests du service FastAPI (PC-49/51).

Le TestClient de FastAPI appelle l'application directement, sans lancer de
serveur ni ouvrir de port : ces tests sont donc rapides et n'entrent jamais
en conflit avec un service déjà démarré sur le port 5001.
"""
import base64
import io
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import creer_app  # noqa: E402
from strategies.factice import ClassifieurFactice  # noqa: E402
from entrainement.generer_jeu_synthetique import generer_plateau  # noqa: E402
from zones import NB_ZONES  # noqa: E402
import plateau_simule  # noqa: E402

@pytest.fixture
def client():
    app = creer_app(classifieur=ClassifieurFactice(comportement="alterne"))
    with TestClient(app) as client:
        yield client

@pytest.fixture(autouse=True)
def plateau_neuf():
    plateau_simule.reinitialiser()
    yield
    plateau_simule.reinitialiser()

def _octets_image_test():
    image = generer_plateau(graine=1, etats=[True] * NB_ZONES)
    tampon = io.BytesIO()
    image.save(tampon, format="PNG")
    tampon.seek(0)
    return tampon

def test_sante(client):
    res = client.get("/sante")
    assert res.status_code == 200
    assert res.json()["etat"] == "ok"

def test_analyser_sans_image_ni_dispositif_renvoie_400(client):
    res = client.post("/analyser", json={})
    assert res.status_code == 400
    assert "erreur" in res.json()

def test_analyser_avec_fichier_illisible_renvoie_400(client):
    res = client.post("/analyser", files={"image": ("faux.png", b"ceci n'est pas une image")})
    assert res.status_code == 400

def test_analyser_renvoie_28_resultats(client):
    res = client.post("/analyser", files={"image": ("plateau.png", _octets_image_test())})

    assert res.status_code == 200
    corps = res.json()
    assert corps["strategie"] == "factice"
    assert len(corps["resultats"]) == NB_ZONES
    for resultat in corps["resultats"]:
        assert set(resultat.keys()) == {"indice", "occupee", "score"}
        assert 0.0 <= resultat["score"] <= 1.0

def test_construire_classifieur_rejette_une_strategie_inconnue():
    from app import construire_classifieur

    with pytest.raises(ValueError):
        construire_classifieur("n-importe-quoi")

def test_construire_classifieur_seuillage():
    from app import construire_classifieur

    classifieur = construire_classifieur("seuillage")
    assert classifieur.nom == "seuillage-opencv"

def test_analyser_un_plateau_simule_renvoie_28_resultats(client):
    client.post("/simulation/remplir", json={"dispositifId": "PILULIER-TEST"})

    res = client.post("/analyser", json={"dispositifId": "PILULIER-TEST"})

    assert res.status_code == 200
    corps = res.json()
    assert corps["simule"] is True
    assert len(corps["resultats"]) == NB_ZONES

def test_analyser_avec_une_vraie_image_n_est_pas_marque_simule(client):
    res = client.post("/analyser", files={"image": ("plateau.png", _octets_image_test())})

    assert res.json()["simule"] is False

def test_analyse_simulee_renvoie_l_image_dessinee(client):
    """Sans cette image, Verification.image reste toujours null côté API et
    la purge à 30 jours (PC-52) met à null un champ déjà null."""
    client.post("/simulation/remplir", json={"dispositifId": "PILULIER-TEST"})

    corps = client.post("/analyser", json={"dispositifId": "PILULIER-TEST"}).json()

    assert corps["simule"] is True
    assert corps["image"] is not None
    octets = base64.b64decode(corps["image"])
    assert Image.open(io.BytesIO(octets)).format == "PNG"

def test_analyse_d_une_vraie_image_ne_la_renvoie_pas(client):
    """L'appelant a déjà sa photo : la lui retourner doublerait la réponse."""
    corps = client.post("/analyser", files={"image": ("plateau.png", _octets_image_test())}).json()

    assert corps["simule"] is False
    assert corps["image"] is None

def test_remplir_puis_prendre_modifie_l_etat_du_plateau(client):
    client.post("/simulation/remplir", json={"dispositifId": "PILULIER-TEST"})
    client.post("/simulation/prendre", json={"dispositifId": "PILULIER-TEST", "indice": 5})

    etats = client.get("/simulation/etat", params={"dispositifId": "PILULIER-TEST"}).json()["etats"]

    assert etats[5] is False
    assert sum(1 for pleine in etats if not pleine) == 1

def test_prendre_hors_bornes_renvoie_400(client):
    res = client.post("/simulation/prendre", json={"dispositifId": "PILULIER-TEST", "indice": 99})
    assert res.status_code == 400

def test_prendre_avec_un_indice_non_entier_renvoie_422(client):
    res = client.post("/simulation/prendre", json={"dispositifId": "PILULIER-TEST", "indice": "douze"})
    assert res.status_code == 422

def test_etat_sans_dispositif_renvoie_422(client):
    assert client.get("/simulation/etat").status_code == 422

def test_la_documentation_openapi_est_publiee(client):
    """Le contrat entre l'API Node et ce service est publié automatiquement :
    c'est la raison du passage de Flask à FastAPI."""
    schema = client.get("/openapi.json")

    assert schema.status_code == 200
    chemins = schema.json()["paths"]
    assert "/analyser" in chemins
    assert "/simulation/remplir" in chemins
