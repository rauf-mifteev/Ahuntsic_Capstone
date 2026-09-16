# Plan de documentation

On garde la documentation au minimum. Deux endroits, chacun avec son rôle.

## GitHub

Le code, le README et le dossier `docs/`.

Le README dit ce qu'est le projet, comment le démarrer et comment le déployer. Il est mis à jour dès que la façon de démarrer ou de déployer change.

Le dossier `docs/` contient toute la documentation du projet, un fichier par livrable. C'est la version qu'on remet à l'enseignant. Les images (diagrammes et maquettes) vont dans `docs/assets/`.

## Drive

Sert à travailler ensemble et à partager les brouillons dans l'équipe. Quand un document est fini, il est converti en Markdown et déposé dans `docs/`.

Le Drive n'est pas la version officielle. C'est `docs/` sur GitHub qui fait foi.

## Outils d'IA générative

On a le droit d'utiliser des outils d'IA générative, mais on doit le déclarer.
Chacun doit pouvoir expliquer et défendre ce qu'il a remis.

**Outil utilisé** — Claude (Anthropic), en conversation et dans le terminal de
Visual Studio Code.

**Où il a servi, et pour quoi faire**

| Partie du projet | Ce que l'outil a produit | Ce que nous avons fait nous-mêmes |
|---|---|---|
| Documentation (`docs/`, `README.md`) | aide à la rédaction et à la réécriture des documents, mise en cohérence avec le code | relu chaque document, choisi ce qui devait y figurer, corrigé les affirmations qui ne correspondaient plus au code |
| Apprentissage automatique (`analyse-images/`) | la stratégie d'exécution ONNX, le script d'export avec sa vérification de parité, et les tests associés | choisi ONNX plutôt que TensorFlow Lite après avoir comparé leur taille, entraîné le modèle, lancé les tests, validé la parité entre les deux moteurs |
| API (`api/`) | le calcul du taux d'adhérence et la route d'historique, avec ses tests | défini la règle de calcul, relu le code, fusionné après revue |
| Application mobile (`mobile/`) | l'écran d'historique et le rafraîchissement automatique du tableau de bord | relu, testé sur un téléphone, ajusté l'affichage |

**Comment on s'est assuré de comprendre ce qu'on remet**

Rien n'a été fusionné sans relecture par une deuxième personne et sans que les
tests automatisés passent. Une pull request rouge n'est jamais fusionnée. Chacun
de nous peut expliquer le code qu'il a remis, et pourquoi chaque choix technique
a été fait de cette façon plutôt qu'une autre.

**Ce qui n'a pas été délégué**

Les décisions elles-mêmes : le périmètre du projet, l'architecture, le choix des
technologies, la définition des règles de gestion. Les échanges avec le client.
Les journaux de bord individuels. La présentation orale.

## Journal de bord

Chacun écrit le sien, chaque vendredi. Trois questions : ce que j'ai livré, ce qui m'a bloqué, ce que j'ai appris.

## Règle générale

La documentation se met à jour en même temps que le travail, dans la même fusion. Un récit dont la documentation n'est pas à jour n'est pas terminé.
