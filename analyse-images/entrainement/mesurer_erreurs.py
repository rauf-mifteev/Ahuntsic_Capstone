"""
Mesure des erreurs d'une stratégie de classification, séparément dans les
deux sens (PC-48), et choix du seuil de confiance.

Pourquoi séparer les deux types d'erreur : dans ce projet, une case qui
passe de pleine à vide CONFIRME une prise (RG-11). Donc :

- Faux positif (le modèle dit "vide" alors que la case est réellement
  PLEINE) → une prise qui n'a PAS eu lieu serait confirmée à tort.
  C'est l'erreur la plus grave (voir README.md du dossier).
- Faux négatif (le modèle dit "pleine" alors que la case est réellement
  VIDE) → une vraie prise resterait "ambiguë" ou finirait "manquée" à
  tort. Gênant, mais pas dangereux : le patient peut confirmer lui-même.

`choisir_seuil` balaie donc les seuils du plus permissif au plus strict et
retient le premier qui ramène le taux de faux positifs sous la limite
demandée — quitte à augmenter le taux de faux négatifs (plus de doute).
C'est exactement l'AC de PC-47 : "le seuil de confiance est choisi pour
préférer le doute à une fausse confirmation".
"""
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from jeu_de_donnees import charger_sous_ensemble  # noqa: E402

def evaluer(classifieur, exemples, seuil: float) -> dict:
    """
    `exemples` : liste de (chemin_photo, etats) comme renvoyée par
    `jeu_de_donnees.charger_sous_ensemble` (etats[i] = True si la zone i
    est PLEINE selon l'annotation humaine).
    `seuil` : score minimal (probabilité de "vide") pour que la
    prédiction du classifieur soit elle-même considérée "vide".
    """
    vrais_positifs = vrais_negatifs = faux_positifs = faux_negatifs = 0

    for chemin_photo, etats in exemples:
        image = Image.open(chemin_photo)
        resultats = classifieur.analyser(image)

        for indice, resultat in enumerate(resultats):
            verite_vide = not etats[indice]
            predit_vide = resultat.score >= seuil

            if verite_vide and predit_vide:
                vrais_positifs += 1
            elif verite_vide and not predit_vide:
                faux_negatifs += 1
            elif not verite_vide and predit_vide:
                faux_positifs += 1
            else:
                vrais_negatifs += 1

    total = vrais_positifs + vrais_negatifs + faux_positifs + faux_negatifs
    return {
        "seuil": seuil,
        "vrais_positifs": vrais_positifs,
        "vrais_negatifs": vrais_negatifs,
        "faux_positifs": faux_positifs,
        "faux_negatifs": faux_negatifs,
        "total_zones": total,
        "taux_faux_positifs": faux_positifs / (faux_positifs + vrais_negatifs)
        if (faux_positifs + vrais_negatifs) > 0
        else 0.0,
        "taux_faux_negatifs": faux_negatifs / (faux_negatifs + vrais_positifs)
        if (faux_negatifs + vrais_positifs) > 0
        else 0.0,
        "exactitude": (vrais_positifs + vrais_negatifs) / total if total > 0 else 0.0,
    }

def choisir_seuil(classifieur, exemples, taux_faux_positifs_max: float = 0.02, pas: float = 0.01) -> dict:
    """
    Balaie les seuils de 0.50 à 0.99 et renvoie les métriques du premier
    seuil qui respecte `taux_faux_positifs_max`. Si aucun seuil n'y arrive
    (modèle trop peu fiable), renvoie les métriques au seuil le plus
    strict (0.99) — mieux vaut un système qui doute tout le temps qu'un
    système qui confirme à tort.
    """
    seuil = 0.50
    dernier_resultat = None
    pas_centiemes = round(pas * 100)
    for centieme in range(50, 100, pas_centiemes):
        seuil = centieme / 100
        resultat = evaluer(classifieur, exemples, seuil)
        dernier_resultat = resultat
        if resultat["taux_faux_positifs"] <= taux_faux_positifs_max:
            return resultat

    return dernier_resultat

def rapport_texte(metriques: dict) -> str:
    return (
        f"Seuil retenu : {metriques['seuil']}\n"
        f"  Taux de faux positifs (dangereux) : {metriques['taux_faux_positifs']:.2%}\n"
        f"  Taux de faux négatifs (doute)     : {metriques['taux_faux_negatifs']:.2%}\n"
        f"  Exactitude globale                : {metriques['exactitude']:.2%}\n"
        f"  Zones évaluées                    : {metriques['total_zones']}"
    )

if __name__ == "__main__":
    from strategies.seuillage import ClassifieurSeuillage

    racine = Path(__file__).resolve().parent.parent
    dossier_test = racine / "jeu-de-photos" / "test"
    exemples = charger_sous_ensemble(dossier_test)

    if not exemples:
        print("Génération du jeu de données synthétique...")
        from entrainement.generer_jeu_synthetique import generer_jeu

        generer_jeu(racine / "jeu-de-photos-synthetique")
        exemples = charger_sous_ensemble(racine / "jeu-de-photos-synthetique" / "test")

    classifieur = ClassifieurSeuillage()
    resultat = choisir_seuil(classifieur, exemples)
    print(f"Stratégie évaluée : {classifieur.nom}")
    print(rapport_texte(resultat))
    if not charger_sous_ensemble(dossier_test):
        print(
            "\n*** Mesuré sur des images synthétiques : score optimiste. Les images\n"
            "    de test viennent du même générateur que celles d'entraînement.\n"
            "    À préciser si ce chiffre est cité en revue. ***"
        )
