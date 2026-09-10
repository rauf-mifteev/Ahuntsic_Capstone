"""
Plateau simulé (PC-51) — la source des photos, en l'absence de caméra.

Pourquoi ce module existe
-------------------------
Le boîtier physique n'existe pas (docs/A1-perimetre.md), et le circuit
simulé sur Wokwi ne peut pas produire d'image : un ESP32 simulé n'a pas de
caméra. Le firmware n'envoie donc jamais de champ `image` avec ses
événements — voir wokwi/src/main.cpp, qui n'envoie que
{identifiantDispositif, type, horodatage}.

Plutôt que de laisser toute la chaîne de vérification inatteignable, ce
module donne au service d'analyse un plateau PHYSIQUE simulé : 28 cases
dont il connaît l'état réel. À la fermeture du couvercle, l'API demande au
service de « photographier » ce plateau ; l'image est dessinée par le même
générateur que le jeu synthétique (entrainement/generer_jeu_synthetique.py),
puis passe par la VRAIE stratégie de classification active.

Ce qui reste réel dans cette simulation : le découpage en 28 zones, le
classifieur, le score, le verdict, et toute la logique de comparaison
côté API. Ce qui est simulé : uniquement l'optique (l'appareil photo).
Le service ne triche pas — il ne consulte jamais l'état interne pour
répondre, il classe l'image dessinée comme il classerait une vraie photo.

Limite assumée : l'état vit en mémoire du processus. Avec plusieurs
workers (uvicorn --workers 2), chaque worker aurait son propre plateau.
Le service doit donc tourner en un seul worker — voir
analyse-images/README.md.
"""
import random
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent / "entrainement"))
from zones import NB_ZONES  # noqa: E402
from generer_jeu_synthetique import generer_plateau  # noqa: E402

_plateaux = {}

def _plateau(identifiant: str) -> dict:
    """Un plateau neuf commence VIDE : tant que personne n'a confirmé un
    remplissage, il n'y a rien à prendre. C'est cohérent avec RG-13
    (aucune comparaison tant qu'aucune photo de référence n'existe)."""
    if identifiant not in _plateaux:
        _plateaux[identifiant] = {"etats": [False] * NB_ZONES, "prises_photo": 0}
    return _plateaux[identifiant]

def etat(identifiant: str) -> list:
    """Les 28 états réels du plateau (True = case pleine)."""
    return list(_plateau(identifiant)["etats"])

def remplir(identifiant: str) -> list:
    """Remplissage hebdomadaire : les 28 cases deviennent pleines (PC-56)."""
    plateau = _plateau(identifiant)
    plateau["etats"] = [True] * NB_ZONES
    return list(plateau["etats"])

def prendre(identifiant: str, indice: int) -> list:
    """Simule une prise : la case passe de pleine à vide.

    Sens unique volontaire (RG-11) : une case qui se remplit toute seule
    entre deux photos n'a aucun sens physique, seul le passage
    plein -> vide compte comme une prise."""
    if not 0 <= indice < NB_ZONES:
        raise ValueError(f"Indice de zone hors bornes : {indice} (attendu 0..{NB_ZONES - 1})")
    plateau = _plateau(identifiant)
    plateau["etats"][indice] = False
    return list(plateau["etats"])

def photographier(identifiant: str) -> Image.Image:
    """« Prend une photo » du plateau simulé.

    La graine change à chaque photo : deux photos du même plateau ne sont
    donc pas identiques au pixel près (bruit de fond, position du comprimé
    dans la case), exactement comme deux vraies photos successives. C'est
    ce qui rend la classification non triviale."""
    plateau = _plateau(identifiant)
    plateau["prises_photo"] += 1
    graine = abs(hash(identifiant)) % 10_000 + plateau["prises_photo"]
    return generer_plateau(graine, plateau["etats"])

def reinitialiser():
    """Remet tous les plateaux à zéro (utilisé par les tests)."""
    _plateaux.clear()
