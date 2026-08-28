# Documentation du projet — Pilulier connecté

Projet intégrateur 420-321-AH
Équipe : Rauf Mifteev, Daniel Alain Dyky, Chahrazad Tayibi

Un pilulier de 28 cases qui vérifie par image qu'un médicament a bien été retiré, et qui guide le patient avec une lumière sur la bonne case.

Un fichier par livrable. Les numéros suivent l'ordre de la liste des livrables.

## A — Cadrage du projet

| | Livrable |
|---|---|
| A1 | [Périmètre arrêté](01-cadrage/01-perimetre.md) |
| A2 | [Analyse des besoins](01-cadrage/02-analyse-des-besoins.md) |
| A3 | [Cahier des charges](01-cadrage/03-cahier-des-charges.md) |
| A4 | [Dimension intelligente](01-cadrage/04-dimension-intelligente.md) |
| A5 | [Risques](01-cadrage/05-risques.md) |

## B — Modélisation et conception

| | Livrable |
|---|---|
| B1 | [Diagramme de cas d'utilisation](02-conception/01-cas-utilisation.md) |
| B2 | [Scénarios d'utilisateurs](02-conception/02-scenarios-utilisateurs.md) |
| B3 | [Diagramme de classes](02-conception/03-diagramme-classes.md) |
| B4 | [Diagrammes de séquence](02-conception/04-diagrammes-sequence.md) |
| B5 | [Architecture logicielle](02-conception/05-architecture-logicielle.md) |
| B6 | [Patrons de conception](02-conception/06-patrons-conception.md) |
| B7 | [Choix technologiques](02-conception/07-choix-technologiques.md) |
| B8 | [Maquettes](02-conception/08-maquettes.md) |

## C — Carnet de produit et planification

| | Livrable |
|---|---|
| C1 | [Carnet de produit](03-planification/carnet-produit.md) |
| C2 | [Planification du sprint 1](03-planification/sprint-1.md) |

## D — Conventions de l'équipe

| | Livrable |
|---|---|
| D1 | [Contrat d'équipe](04-conventions/01-contrat-equipe.md) |
| D2 | [Définition de « prêt »](04-conventions/02-definition-pret.md) |
| D3 | [Définition de « terminé »](04-conventions/03-definition-termine.md) |
| D4 | [Stratégie de tests](04-conventions/04-strategie-tests.md) |
| D5 | [Plan de documentation](04-conventions/05-plan-documentation.md) |

## E — Environnement de travail

| | Livrable |
|---|---|
| E1 | [Dépôt de code](05-environnement/01-depot-code.md) |
| E2 | [Projet de gestion](05-environnement/02-projet-gestion.md) |
| E3 | [Espace de documentation](05-environnement/03-espace-documentation.md) |

## Où mettre les images

Toutes les images vont dans `docs/assets/`. Les maquettes dans `docs/assets/mockups/`.

Depuis un sous-dossier, on les appelle avec `../assets/nom.png` :

```markdown
![Diagramme de cas d'utilisation](../assets/use-case-diagram.png)

*Figure 1 — Cas d'utilisation du système.*
```

Noms attendus par les documents :

`use-case-diagram.png` · `class-diagram.png` · `software-architecture.png` · `sequence-configuration.png` · `sequence-remplissage.png` · `sequence-prise-normale.png` · `sequence-prise-ambigue.png` · `sequence-prise-manquee.png` · `gantt.png`

Maquettes : `mockups/01-connexion.png` à `mockups/08-demonstration.png`.
