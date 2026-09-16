# Dépôt de code

**GitHub** — https://github.com/rauf-mifteev/Ahuntsic_Capstone

Le dépôt contient le code, le README et le dossier `docs/`.

Réglages en place :

- branche `main` protégée ;
- relecture par un autre membre obligatoire avant fusion ;
- GitHub Actions configuré : un workflow par partie du projet, dans `.github/workflows/`.

## Comment ces réglages ont été posés

À faire une seule fois, dans les paramètres du dépôt. C'est noté ici pour
qu'on puisse les remettre en place si le dépôt est recréé.

1. **Settings → Branches → Add branch protection rule** sur `main`.
2. Cocher *Require a pull request before merging* et *Require approvals* (≥ 1).
3. Cocher *Require status checks to pass before merging*, puis sélectionner les
   contrôles des sept workflows. Ils sont listés dans le README, à la section
   sur l'intégration continue. Un contrôle n'apparaît dans cette liste qu'après
   s'être exécuté au moins une fois.
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
