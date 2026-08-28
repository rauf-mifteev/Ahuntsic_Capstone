# Patrons de conception

Trois patrons, choisis parce qu'ils règlent un problème précis de ce projet. Voir [B5 · Architecture logicielle](B5-architecture-logicielle.md) pour les composants.

### Répertoire (Repository)

**Où** — l'accès à MongoDB.

**Pourquoi** — le schéma va changer presque chaque semaine pendant le projet. En isolant l'accès aux données derrière une couche, un changement de schéma ne se propage pas partout dans le code.

### Stratégie (Strategy)

**Où** — le service d'analyse d'images.

**Pourquoi** — un seul contrat, deux implémentations : le faux service et le vrai modèle. On branche l'un ou l'autre sans changer l'API. C'est ce qui permet à trois personnes de travailler en même temps sans s'attendre.

### Observateur (Observer)

**Où** — la réception d'une fermeture de couvercle.

**Pourquoi** — un seul événement déclenche plusieurs traitements indépendants : rattacher les prises, journaliser, mettre à jour l'écran de démonstration, éteindre les DEL. Chacun s'abonne sans que les autres le sachent.
