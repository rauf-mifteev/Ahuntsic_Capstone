# Planification des sprints 2 et 3

Ce document dit ce que chaque sprint visait, ce qui a été livré, et ce qui a
été reporté. Les dates viennent de l'historique des fusions dans `main`.

---

## Sprint 2 — du 8 au 11 septembre 2026

Épique **PC-111**.

### L'objectif

Faire fonctionner la chaîne complète d'une prise, de bout en bout, sur un
environnement déployé. Le patient ouvre son pilulier, retire un comprimé,
referme, et l'application affiche un verdict.

Le sprint a été découpé en six étapes, une par récit, pour que trois personnes
puissent travailler en parallèle sans s'attendre.

### Ce qui a été livré

| Récit | Étape | Fusionné |
|---|---|---|
| **PC-88** | Service d'analyse d'images | 9 septembre |
| **PC-89** | API : événements, vérifications, comparaison | 9 septembre |
| **PC-90** | Application mobile | 10 septembre |
| **PC-91** | Circuit simulé sur Wokwi | 10 septembre |
| **PC-92** | Déploiement et intégration continue | 10 septembre |
| **PC-93** | Documentation et répétition de la démonstration | 11 septembre |

Les deux services ont été mis en ligne sur Render le 10 septembre. Le circuit
simulé envoie de vraies requêtes vers l'API déployée.

Une passe de correction a suivi le 11 septembre, avant la revue : stratégie de
démonstration corrigée dans `render.yaml`, portée du `try/catch` réduite dans
`evenementService.js`, fonction morte retirée, journal de tunnel dépubliée.

### Ce qui a été reporté

**Le modèle entraîné n'a pas été déployé.** Il avait besoin de PyTorch, qui
pèse environ 500 Mo, alors que le palier gratuit de Render donne 512 Mo de
mémoire. Le seuillage OpenCV a tenu lieu de stratégie en service pendant tout
le sprint. Le problème a été réglé au sprint 3, avec ONNX.

**La répétition chronométrée à trois** n'a pas eu lieu pendant le sprint.

**Deux champs de documentation sont restés vides** : la déclaration des outils
d'intelligence artificielle générative dans [D5 · Plan de documentation](D5-plan-documentation.md), et le
retour du client après la séance de raffinement dans
[A2 · Analyse des besoins](A2-analyse-des-besoins.md). Les deux demandent des faits que seule l'équipe
détient.

---

## Sprint 3 — à partir du 13 septembre 2026

Épique **PC-112**.

### L'objectif

Amener le produit à son état livrable. Trois axes : faire tourner le vrai
modèle en ligne, donner au patient une vue de sa régularité dans le temps, et
mettre la documentation en accord avec ce que le code fait vraiment.

Le sprint est découpé en huit étapes.

### Ce qui a été livré

| Récit | Étape | Fusionné |
|---|---|---|
| **PC-113** | Étape 1 — le modèle entraîné tourne en ligne, exécuté par ONNX Runtime | 14 septembre |
| **PC-65** | Étape 2 — historique et taux d'adhérence dans l'API | 15 septembre |
| **PC-114** | Étape 3 — écran d'historique et rafraîchissement du tableau de bord | 15 septembre |

**L'étape 1** a réglé le report du sprint 2. On entraîne toujours avec
PyTorch, en local, mais on exporte ensuite le modèle au format ONNX. Le moteur
qui l'exécute en ligne, ONNX Runtime, pèse environ 16 Mo au lieu de 500. Le
script d'export vérifie que les deux moteurs donnent les mêmes verdicts avant
de se déclarer terminé.

**L'étape 2** a ajouté `GET /api/prises/historique`, qui renvoie les prises
d'une période et le taux d'adhérence. Les prises pas encore arrivées sont
exclues du calcul, pour qu'un patient consciencieux ne voie pas son taux
chuter chaque matin. Cette définition a demandé de réécrire la règle RG-08 du
cahier des charges, qui disait autre chose que le code.

**L'étape 3** a donné au patient l'écran qui affiche tout ça, sur trois
périodes, et a corrigé le tableau de bord qui ne se rechargeait qu'au retour
dessus.

### Ce qui reste

| Récit | Étape |
|---|---|
| **PC-73** | Étape 4 — campagne de test |
| **PC-76** | Étapes 5 et 6 — version finale documentée et déployée |
| **PC-79** | Étape 7 — présentation |
| **PC-116** | Étape 8 — clôture |

Les deux champs restés vides au sprint 2 le sont toujours. Ils ne peuvent pas
être remplis autrement que par l'équipe.
