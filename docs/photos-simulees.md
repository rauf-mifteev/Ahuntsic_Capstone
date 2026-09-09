# Décision de conception — la photo du plateau est simulée (PC-51)

Ce document explique pourquoi la vérification par photo, qui est la
fonctionnalité différenciante du projet, fonctionne aujourd'hui sans
qu'aucun appareil ne prenne de photo. Il complète
`docs/A4-dimension-intelligente.md` et `docs/B5-architecture-logicielle.md`,
qui décrivent la chaîne telle qu'elle serait avec un vrai boîtier.

## Le problème

Le diagramme de séquence `06_sequence_prise_normale.puml` prévoit qu'une
photo du plateau accompagne la fermeture du couvercle, et que l'API la
transmette au service d'analyse.

Or personne, dans le périmètre de ces deux sprints, ne peut produire cette
photo :

- Le boîtier physique n'existe pas — c'est une décision assumée dès le
  départ (`docs/A1-perimetre.md`, section 6).
- Le circuit est simulé sur Wokwi, et un ESP32 simulé n'a pas de caméra.
  Le firmware (`wokwi/src/main.cpp`) n'envoie que
  `{identifiantDispositif, type, horodatage}`.
- L'application mobile ne prend pas de photo non plus : rien dans les
  écrans du Sprint 2 n'ouvre l'appareil photo.

La première version de PC-51 conditionnait la vérification à la présence
d'une image :

```js
if (type === 'FERMETURE' && image) { ... }
```

Avec le firmware réel, cette condition n'est **jamais** vraie. Toute la
chaîne en aval — comparaison à la photo de référence, verdict, prise
confirmée ou ambiguë, guidage lumineux — était donc inatteignable en
pratique, alors même que son code était écrit et testé.

## La décision

Le service d'analyse possède un **plateau physique simulé**
(`analyse-images/plateau_simule.py`) : 28 cases dont il connaît l'état
réel. À la fermeture du couvercle, l'API lui demande de photographier ce
plateau plutôt que de lui transmettre une image.

L'image est dessinée par le même générateur que le jeu synthétique
(`entrainement/generer_jeu_synthetique.py`), puis passe par la stratégie de
classification active, exactement comme une vraie photo.

## Ce qui reste réel, ce qui est simulé

| Réel | Simulé |
|---|---|
| Le découpage en 28 zones (`zones.py`) | L'optique : l'image est dessinée, pas captée |
| Le classifieur et son score | |
| Le verdict et le seuil de décision | |
| La comparaison à la photo de référence | |
| La machine à états des prises | |
| Les événements du circuit (vrais appels HTTP depuis Wokwi) | |

Le point important : **le service ne triche pas**. Il ne consulte jamais
l'état interne du plateau pour répondre — il classe l'image dessinée comme
il classerait n'importe quelle image, et il peut se tromper. Deux photos
successives du même plateau ne sont d'ailleurs pas identiques au pixel
près. Si le classifieur était mauvais, la démonstration le montrerait.

## Traçabilité

Toute `Verification` produite par ce chemin porte `photoSimulee: true` en
base. Il est donc impossible, en relisant l'historique, de confondre une
vérification simulée avec une vérification issue d'une vraie photo.

## Ce que ça ne remplace pas

- Le modèle MobileNet n'est toujours pas entraîné sur de vraies photos
  (PC-48) : la stratégie qui tourne en démonstration est `seuillage`.
- La qualité de la classification sur de vraies photos reste inconnue. Les
  images dessinées sont plus propres que la réalité (éclairage constant,
  pas de reflets, pas d'ombre portée du rebord).

Les deux points doivent être annoncés pendant la revue plutôt que laissés
à découvrir.

## Le chemin « vraie photo » reste ouvert

`POST /analyser` accepte toujours un fichier `image` en multipart, et
`evenementService` l'utilise en priorité quand le champ est présent. Le
jour où un boîtier équipé d'une caméra — ou l'application mobile — enverra
une vraie image, elle sera utilisée sans qu'aucune ligne ne change.
