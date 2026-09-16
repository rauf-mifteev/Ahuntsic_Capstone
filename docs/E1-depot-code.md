# Dépôt de code

**GitHub** — https://github.com/rauf-mifteev/Ahuntsic_Capstone

Le dépôt contient le code, le README et le dossier `docs/`.

Réglages en place :

- branche `main` protégée ;
- relecture par un autre membre obligatoire avant fusion ;
- GitHub Actions configuré, un workflow par partie du projet.

## Les vérifications automatiques

Un workflow par partie du projet, dans `.github/workflows/`. Chacun ne se
déclenche que sur les fichiers qui le concernent, pour qu'une proposition de
fusion n'exécute que ce qui est utile.

| Fichier | Ce qu'il contrôle | Se déclenche sur |
|---|---|---|
| `ci-e1-analyse-images.yml` | pytest du service d'analyse | `analyse-images/**` |
| `ci-e2-api.yml` | Jest de l'API | `api/**` |
| `ci-e3-mobile.yml` | lint de l'application mobile | `mobile/**` |
| `ci-e4-wokwi.yml` | compilation du firmware | `wokwi/**` |
| `ci-e5-deploiement.yml` | cohérence du déploiement | `render.yaml`, `.github/workflows/**` |
| `ci-e6-documentation.yml` | liens entre les documents | `**/*.md` |
| `ci-s3-e1-modele-onnx.yml` | le modèle ONNX est versionné, aucun `.pt` ne l'est, et le modèle tourne sans PyTorch | `analyse-images/**` |

Une proposition de fusion ne peut pas être intégrée à `main` si l'un de ces
contrôles échoue.

## Pourquoi ces vérifications sont faites ainsi

**Le service d'analyse est testé en stratégie `factice`.** Le modèle entraîné a
besoin de PyTorch, qui vit dans `requirements-entrainement.txt` et n'est pas
installé dans l'intégration continue. L'installer bloquerait chaque vérification
une dizaine de minutes pour rien : la stratégie `factice` suffit à prouver que le
service répond et que son contrat est respecté.

**L'application mobile n'a aucune suite de tests automatisés.** Son workflow ne
peut donc pas prouver que les écrans fonctionnent. Il vérifie ce qui est
vérifiable sans appareil : que le code passe l'analyse statique, que la
configuration est lisible, et qu'aucune adresse d'API n'est écrite en dur — un
piège qui a déjà coûté du temps à l'équipe.

**Le circuit n'est pas simulé, il est compilé.** Une erreur de compilation est la
panne la plus coûteuse à découvrir en pleine démonstration. Le workflow vérifie
aussi que `config_locale.h.example` contient tout ce dont `main.cpp` a besoin : le
vrai `config_locale.h` est ignoré par git, donc un dépôt fraîchement cloné ne
compile pas sans le gabarit. Si quelqu'un ajoute un `#define` dans son fichier
local sans l'ajouter au gabarit, la compilation échoue — et c'est voulu.

**Le déploiement lui-même ne peut pas être testé ici.** Le workflow contrôle donc
que les fichiers restent lisibles, et que `--workers 1` n'a pas été effacé par
mégarde de `render.yaml`. La raison de cette contrainte est expliquée dans
[Déployer le projet](DEPLOIEMENT.md).

**La répétition de la démonstration ne s'automatise pas** : elle se fait à trois,
devant un vrai téléphone. Le workflow de documentation vérifie la seule chose
mécanique de l'étape — que les documents ne renvoient pas vers des fichiers qui
n'existent plus. C'est déjà arrivé : des documents renommés ont laissé des liens
morts derrière eux.

**Le modèle ONNX est vérifié sans PyTorch, volontairement.** Si `torch` était
installé dans l'intégration continue, le test ne prouverait rien : on veut
justement démontrer que le service tourne sans lui. Le workflow contrôle aussi
qu'aucun `.pt` n'est versionné — c'est le format de travail de l'entraînement, il
pèse autant que le `.onnx` et ne sert à rien en ligne.

## Comment ces réglages ont été posés

À faire une seule fois, dans les paramètres du dépôt. C'est noté ici pour
qu'on puisse les remettre en place si le dépôt est recréé.

1. **Settings → Branches → Add branch protection rule** sur `main`.
2. Cocher *Require a pull request before merging* et *Require approvals* (≥ 1).
3. Cocher *Require status checks to pass before merging*, puis sélectionner les
   contrôles des sept workflows listés ci-dessus. Un contrôle n'apparaît dans
   cette liste qu'après s'être exécuté au moins une fois.
4. Cocher *Do not allow bypassing the above settings* si l'option est offerte.

Arborescence :

```
/analyse-images  service d'analyse d'images (Python, FastAPI)
/api             serveur Node.js
/mobile          application React Native
/wokwi           circuit simulé
/docs            documentation
render.yaml      les deux services déployés sur Render
README.md
.gitignore
```
