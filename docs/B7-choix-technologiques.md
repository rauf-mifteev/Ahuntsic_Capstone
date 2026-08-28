# Choix technologiques

## Application mobile

**React Native.**

Une seule base de code pour iOS et Android. Deux applications natives coûteraient deux fois le travail pour le même résultat.

## Serveur

**Node.js avec Express.**

Même langage que l'application mobile. Une personne qui passe du frontend au backend ne change pas de langage.

## Base de données

**MongoDB Atlas.**

Base orientée documents. Notre schéma va changer chaque semaine pendant le projet, et une base documents encaisse ça mieux qu'une base relationnelle. Le palier gratuit suffit largement à notre volume.

## Simulation du boîtier

**Wokwi.**

Le code s'exécute pour de vrai et peut envoyer des requêtes réseau. Ce n'est pas une maquette : c'est un vrai programme ESP32 qui parle à notre vraie API.

## Modèle de vision

**MobileNetV3-Small, pré-entraîné sur ImageNet.**

On garde le tronc et on réentraîne seulement les dernières couches.

Environ 2,5 millions de paramètres. Il tourne sans carte graphique, donc sur un hébergement gratuit. Il analyse les 28 zones en moins d'une seconde. Il est disponible dans Keras et dans PyTorch, et documenté partout.

Une seule photo de plateau donne 28 exemples étiquetés. Une trentaine de photos suffisent pour l'entraîner.

**Écarté :** YOLO, la segmentation, ResNet50. Il n'y a aucun objet à localiser, puisque la position de chaque case est connue d'avance. C'est de la classification sur vignette, rien de plus.

## Solution de secours

**OpenCV, en seuillage simple.**

Niveaux de gris, seuil, comptage des pixels sombres dans la zone. Dix lignes de code.

Deux avantages. On a un système qui fonctionne dès le premier jour, avant que le modèle existe. Et on obtient un point de comparaison chiffré : pouvoir dire « le seuillage donne 91 %, le modèle donne 98 %, voici les cas où le seuillage échoue » prouve que la partie intelligente sert à quelque chose.

## Notifications

**Notifications locales, planifiées sur le téléphone.**

Pas de service poussé. Ça évite un compte externe et la gestion de jetons d'appareil, pour un résultat identique à l'écran. Et un patient sans réseau reçoit quand même son rappel.

## Hébergement

Service infonuagique à palier gratuit pour l'API. MongoDB Atlas pour la base.

## Matériel du produit final

| Pièce | Rôle | Prix |
|---|---|---|
| ESP32 avec caméra | Cerveau et photo | 12 $ |
| 28 DEL adressables | Éclairage et guidage | 8 $ |
| Interrupteur de couvercle | Déclenche la photo | 1 $ |
| Carte microSD | Mémoire tampon hors ligne | 3 $ |
| Plateau à fond transparent | 28 cases | 15 $ |
| Boîtier et pile | | 20 $ |
| **Total** | | **59 $ CAD** |

Les concurrents se vendent autour de 250 €.
