"""
Entraîne le vrai modèle de classification (PC-48) : MobileNetV3-Small
pré-entraîné sur ImageNet, dont on réentraîne seulement les dernières
couches (voir docs/B7-choix-technologiques.md pour la justification de ce
choix — 2,5 millions de paramètres, tourne sans carte graphique).

Jeu de données utilisé : le projet ne prend AUCUNE vraie photo (décision
documentée dans docs/photos-simulees.md). Le jeu synthétique généré
par generer_jeu_synthetique.py est donc le jeu NORMAL, pas un dépannage —
il est produit automatiquement s'il n'existe pas encore. Si un jour de
vraies photos sont déposées dans jeu-de-photos/, elles sont utilisées en
priorité, sans rien changer ici.

⚠️ Deux limites à connaître avant de citer un score en revue :

1. Ce script nécessite `torch` et `torchvision`
   (pip install -r requirements-entrainement.txt), plusieurs centaines de
   Mo. Il n'a PAS été exécuté dans l'environnement qui a produit ce dépôt.
2. Entraîner ET évaluer sur des images issues du MÊME générateur donne un
   score optimiste : les images de test sont différentes de celles
   d'entraînement, mais elles partagent le même dessin, le même bruit et
   le même éclairage. Un tel score ne dit rien de la performance sur de
   vraies photos. C'est à annoncer, pas à présenter comme une mesure de
   qualité réelle.

Chaque image entière du plateau donne 28 exemples d'entraînement (un par
zone) — voir jeu_de_donnees.py — donc une trentaine d'images suffit
largement (B7).

Usage :
    pip install -r requirements.txt -r requirements-entrainement.txt
    python3 entrainement/entrainer_mobilenet.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import torch
    from torch import nn
    from torch.utils.data import Dataset, DataLoader
    from torchvision import models, transforms
except ImportError as err:  # pragma: no cover - message d'aide, pas de logique à tester
    raise SystemExit(
        "torch/torchvision ne sont pas installés. "
        "Lancez : pip install -r requirements-entrainement.txt"
    ) from err

from jeu_de_donnees import charger_sous_ensemble  # noqa: E402
from zones import decouper_zones, NB_ZONES  # noqa: E402
from entrainement.mesurer_erreurs import evaluer, rapport_texte  # noqa: E402
from PIL import Image  # noqa: E402

RACINE = Path(__file__).resolve().parent.parent
DOSSIER_JEU_DE_PHOTOS = RACINE / "jeu-de-photos"
DOSSIER_JEU_SYNTHETIQUE = RACINE / "jeu-de-photos-synthetique"
CHEMIN_MODELE_SORTIE = Path(__file__).resolve().parent / "modele_mobilenet.pt"

TAILLE_ENTREE = 64
NB_EPOQUES = 15
TAUX_APPRENTISSAGE = 1e-3
TAILLE_LOT = 32

TRANSFORMATION = transforms.Compose(
    [
        transforms.Resize((TAILLE_ENTREE, TAILLE_ENTREE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]
)

class JeuDeZones(Dataset):
    """
    Transforme le jeu de photos (photos entières + annotations) en un jeu
    d'exemples de ZONES individuelles : chaque photo de plateau donne 28
    exemples (image de zone, étiquette pleine/vide).
    """

    def __init__(self, dossier_sous_ensemble: Path):
        self.exemples = []
        for chemin_photo, etats in charger_sous_ensemble(dossier_sous_ensemble):
            image = Image.open(chemin_photo).convert("RGB")
            zones = decouper_zones(image)
            for zone, pleine in zip(zones, etats):
                self.exemples.append((zone, 1 if pleine else 0))

    def __len__(self):
        return len(self.exemples)

    def __getitem__(self, idx):
        image_zone, etiquette = self.exemples[idx]
        return TRANSFORMATION(image_zone), etiquette

def construire_modele():
    """
    Charge MobileNetV3-Small pré-entraîné, gèle le tronc, et remplace la
    dernière couche par une sortie à 2 classes (pleine / vide).
    """
    modele = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.IMAGENET1K_V1)

    for parametre in modele.features.parameters():
        parametre.requires_grad = False

    nb_entrees = modele.classifier[-1].in_features
    modele.classifier[-1] = nn.Linear(nb_entrees, 2)
    return modele

def resoudre_jeu_de_donnees():
    """Renvoie (dossier_racine_du_jeu, est_synthetique).

    Les vraies photos ont la priorité si quelqu'un en dépose un jour dans
    jeu-de-photos/. Sinon on utilise le jeu synthétique, en le générant
    s'il n'existe pas encore — c'est le cas normal du projet, pas un
    dépannage (voir docs/photos-simulees.md).
    """
    if len(JeuDeZones(DOSSIER_JEU_DE_PHOTOS / "entrainement")) > 0:
        return DOSSIER_JEU_DE_PHOTOS, False

    if len(JeuDeZones(DOSSIER_JEU_SYNTHETIQUE / "entrainement")) == 0:
        print("Aucun jeu de données trouvé — génération du jeu synthétique...")
        from entrainement.generer_jeu_synthetique import generer_jeu

        generer_jeu(DOSSIER_JEU_SYNTHETIQUE)

    return DOSSIER_JEU_SYNTHETIQUE, True

def entrainer():
    racine_du_jeu, est_synthetique = resoudre_jeu_de_donnees()
    dossier_entrainement = racine_du_jeu / "entrainement"
    dossier_test = racine_du_jeu / "test"

    jeu_entrainement = JeuDeZones(dossier_entrainement)
    jeu_test = JeuDeZones(dossier_test)

    if len(jeu_entrainement) == 0:
        raise SystemExit(
            f"Aucun exemple annoté trouvé dans {dossier_entrainement}. "
            "Lancez entrainement/generer_jeu_synthetique.py, ou déposez de "
            "vraies photos annotées (voir jeu-de-photos/README.md)."
        )

    if est_synthetique:
        print(
            "\n*** Jeu SYNTHÉTIQUE : le score obtenu sera optimiste. Les images de\n"
            "    test viennent du même générateur que celles d'entraînement. À\n"
            "    annoncer si ce chiffre est présenté en revue. ***\n"
        )

    print(f"{len(jeu_entrainement)} exemples de zones pour l'entraînement, "
          f"{len(jeu_test)} pour le test (mis de côté, jamais vus pendant l'entraînement).")

    chargeur_entrainement = DataLoader(jeu_entrainement, batch_size=TAILLE_LOT, shuffle=True)

    appareil = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    modele = construire_modele().to(appareil)
    fonction_perte = nn.CrossEntropyLoss()
    optimiseur = torch.optim.Adam(modele.classifier.parameters(), lr=TAUX_APPRENTISSAGE)

    modele.train()
    modele.features.eval()

    for epoque in range(NB_EPOQUES):
        perte_totale = 0.0
        for images, etiquettes in chargeur_entrainement:
            images, etiquettes = images.to(appareil), etiquettes.to(appareil)

            optimiseur.zero_grad()
            sorties = modele(images)
            perte = fonction_perte(sorties, etiquettes)
            perte.backward()
            optimiseur.step()

            perte_totale += perte.item() * images.size(0)

        print(f"Époque {epoque + 1}/{NB_EPOQUES} — perte moyenne : {perte_totale / len(jeu_entrainement):.4f}")

    torch.save(modele.state_dict(), CHEMIN_MODELE_SORTIE)
    print(f"Modèle sauvegardé dans {CHEMIN_MODELE_SORTIE}")

    from strategies.mobilenet import ClassifieurMobileNet

    classifieur = ClassifieurMobileNet(chemin_modele=CHEMIN_MODELE_SORTIE)
    exemples_test = charger_sous_ensemble(dossier_test)
    resultat = evaluer(classifieur, exemples_test, seuil=0.5)
    print("\nÉvaluation sur le jeu de test :")
    print(rapport_texte({**resultat, "seuil": 0.5}))

if __name__ == "__main__":
    entrainer()
