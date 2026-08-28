# Diagramme de classes

![Diagramme de classes](../assets/class-diagram.png)

*Figure 2 — Modèle de données.*

Dix collections.

| Collection | Ce qu'elle contient |
|---|---|
| `users` | Compte du patient, mot de passe haché, fuseau horaire |
| `devices` | Le boîtier, son identifiant Wokwi, son état de connexion |
| `compartments` | Les 28 cases : jour, créneau, numéro de la DEL |
| `medications` | Nom, dosage, apparence, créneau, jours de la semaine |
| `slotSchedules` | Les quatre créneaux du boîtier et leur heure |
| `doseEvents` | Une prise attendue : case, heure prévue, statut, origine de la confirmation |
| `openingEvents` | Ouverture ou fermeture du couvercle, avec l'heure |
| `verifications` | Une photo de plateau : image, moment, les 28 états et leurs scores |
| `trayComparisons` | La comparaison de deux photos et la liste des cases vidées |
| `notifications` | Historique des rappels et des alertes |

### Points à retenir

Une case n'est pas liée à un médicament. Elle correspond à un jour et à un créneau.

Un `doseEvent` porte l'identifiant du boîtier. Ce n'est pas obligatoire aujourd'hui, puisqu'un compte n'a qu'un boîtier, mais ça simplifie les requêtes et l'écran de démonstration.

Une `verification` est rattachée à l'`openingEvent` qui l'a déclenchée. C'est ce qui permet à l'écran de démonstration d'afficher l'événement et sa photo ensemble.

Une `verification` marquée comme référence n'est comparée à aucune photo précédente.
