import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from zones import (  # noqa: E402
    NB_ZONES,
    JOURS_ORDRE,
    indice_zone,
    zone_depuis_indice,
    decouper_zones,
)

def test_indice_zone_couvre_les_28_combinaisons():
    indices = {indice_zone(jour, creneau) for jour in JOURS_ORDRE for creneau in range(1, 5)}
    assert indices == set(range(NB_ZONES))

def test_indice_zone_et_zone_depuis_indice_sont_inverses():
    for jour in JOURS_ORDRE:
        for creneau in range(1, 5):
            indice = indice_zone(jour, creneau)
            assert zone_depuis_indice(indice) == (jour, creneau)

def test_indice_zone_rejette_un_jour_invalide():
    try:
        indice_zone("FUNDI", 1)
        assert False, "aurait dû lever une exception"
    except ValueError:
        pass

def test_indice_zone_rejette_un_creneau_invalide():
    try:
        indice_zone("LUNDI", 5)
        assert False, "aurait dû lever une exception"
    except ValueError:
        pass

def test_decouper_zones_renvoie_28_images():
    image = Image.new("RGB", (700, 400), color="white")
    zones = decouper_zones(image)
    assert len(zones) == NB_ZONES
    for zone in zones:
        assert zone.size[0] > 0 and zone.size[1] > 0
