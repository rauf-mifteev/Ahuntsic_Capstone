# Diagramme de cas d'utilisation

## Les acteurs

Trois acteurs seulement.

**Patient** — le seul acteur humain. Le produit n'a qu'un type d'utilisateur, parce que le volet aidant est hors périmètre.

**Circuit simulé** — le boîtier, simulé sur Wokwi. Il est externe parce qu'il envoie exactement les mêmes requêtes HTTP qu'un vrai boîtier. Le jour où on le remplace par du vrai matériel, rien ne change côté système.

**Tâche planifiée** — le passage du temps. C'est elle qui envoie les rappels à l'heure prévue et qui marque les prises manquées après le délai. Ce n'est ni une personne ni un service, mais c'est bien quelque chose d'extérieur qui déclenche le système.

L'application, l'API et le service d'analyse d'images ne sont pas des acteurs. C'est notre code, à l'intérieur du système.

## Diagramme de cas d'utilisation

![Diagramme de cas d'utilisation](../assets/use-case-diagram.png)

*Figure 1 — Cas d'utilisation du système complet.*

### Compte et configuration

- **CU-01** S'authentifier
- **CU-02** Enregistrer un médicament et l'assigner à un créneau
- **CU-03** Attribuer une heure à chaque créneau
- **CU-04** Associer le pilulier au compte

### Cycle d'une prise

- **CU-05** Signaler une ouverture ou une fermeture du couvercle
- **CU-06** Analyser la photo du plateau
- **CU-07** Déduire les prises effectuées
- **CU-08** Recevoir un rappel de prise
- **CU-10** Être guidé vers le bon compartiment
- **CU-11** Confirmer manuellement une prise ambiguë
- **CU-13** Confirmer le remplissage hebdomadaire
- **CU-14** Marquer une prise comme manquée

### Suivi et démonstration

- **CU-09** Consulter l'historique et l'adhérence
- **CU-12** Provoquer une panne
- **CU-15** Visualiser l'état du circuit

## Les liens entre les cas

**CU-02 inclut CU-03.** On ne peut pas mettre un médicament dans un créneau qui n'a pas encore d'heure.

**CU-05 inclut CU-06.** Chaque fermeture du couvercle déclenche une analyse de photo.

**CU-05 étend vers CU-13.** Sauf si la fermeture suit un remplissage : dans ce cas la photo devient la référence et on ne compare rien.

**CU-06 inclut CU-07.** Analyser une photo n'a de sens que si on la compare ensuite à la précédente.

**CU-07 étend vers CU-11.** La confirmation manuelle arrive seulement si le score est sous le seuil. C'est l'exception, pas la règle.

**CU-08 inclut CU-10.** Un rappel s'accompagne toujours de l'allumage de la DEL.

## Ce qui n'est pas un cas d'utilisation

La vérification du jeton d'authentification protège presque tous les cas d'utilisation, mais le patient ne la déclenche pas volontairement. C'est une exigence de sécurité et un intergiciel, pas un cas d'utilisation.
