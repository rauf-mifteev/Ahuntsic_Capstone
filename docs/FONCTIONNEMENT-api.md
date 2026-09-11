# L'API — comment elle marche

Dossier : `api/`. Écrite en JavaScript avec **Node.js** et **Express**.
Base de données : **MongoDB Atlas**.

C'est le cerveau du système. Elle reçoit, elle range, elle décide.

## Comment le code est rangé

Le code suit toujours le même chemin, en quatre couches. Comprendre ces
couches, c'est comprendre où chercher quand quelque chose ne va pas.

**Les routes** (`src/routes/`) disent quelle adresse existe.
« `POST /api/evenements`, ça va là. »

**Les contrôleurs** (`src/controllers/`) lisent la requête et écrivent la
réponse. Ils ne contiennent aucune règle métier.

**Les services** (`src/services/`) contiennent les vraies règles : quand une
prise est confirmée, quand il faut douter, comment générer les prises
attendues. **C'est là que se trouve l'intelligence du projet.**

**Les dépôts** (`src/repositories/`) parlent à la base de données. Ils sont
les seuls à le faire. Ça rend les services faciles à tester : on remplace le
dépôt par une doublure et aucune vraie base n'est nécessaire.

Les **modèles** (`src/models/`) décrivent la forme des données en base.

## Les données principales

**Utilisateur** — un compte, avec son fuseau horaire.

**Dispositif** — un pilulier, identifié par un code comme `ESP32-DEMO-001`.
C'est ce code que le circuit envoie pour se faire reconnaître. Il contient
aussi les 28 compartiments et les heures des 4 créneaux.

**Medicament** — un médicament, ses jours et ses créneaux.

**Prise** — une par case et par jour. Elle passe par plusieurs états :
`PREVUE` au départ, `EN_VERIFICATION` quand le couvercle s'ouvre, puis
`CONFIRMEE`, `AMBIGUE` ou `MANQUEE`.

**EvenementOuverture** — chaque ouverture et chaque fermeture, avec l'heure
d'origine.

**Verification** — le résultat d'une analyse d'image : les 28 scores, la
stratégie utilisée, et l'image elle-même (effacée après 30 jours).

## Comment le circuit se fait reconnaître

Le circuit n'a ni compte ni mot de passe — un objet ne se connecte pas comme
une personne. C'est son **identifiant** qui sert de laissez-passer. Si cet
identifiant ne correspond à aucun pilulier déjà associé à un compte, l'API
refuse l'événement avec un code 401.

C'est volontairement simple, et c'est une limite connue : quelqu'un qui
devinerait l'identifiant pourrait envoyer de faux événements. Un vrai produit
utiliserait un jeton signé remis lors de l'association. C'est noté comme
amélioration future dans le code.

L'application mobile, elle, s'authentifie normalement avec un **jeton JWT**
obtenu à la connexion.

## Que se passe-t-il à la fermeture du couvercle

C'est le cœur du système. Dans l'ordre :

1. L'événement arrive. L'API vérifie l'identifiant du pilulier.
2. **Elle enregistre d'abord, elle analyse ensuite.** L'événement et la
   vérification sont sauvegardés **avant** tout appel au service d'analyse.
   Pourquoi : si le service d'analyse ne répond pas, la preuve qu'une
   fermeture a eu lieu doit rester. La vérification est alors marquée
   « analyse échouée » et l'application continue de fonctionner. Une panne
   d'un morceau ne doit jamais faire perdre une information. Seule une panne
   du service d'analyse est traitée ainsi. Une autre erreur, par exemple la
   base de données, n'est pas déguisée en « analyse échouée » : elle remonte
   normalement, pour qu'on la voie.
3. L'API demande l'analyse. Si le circuit n'a pas envoyé d'image — c'est
   toujours le cas — elle demande au service de photographier le plateau
   simulé.
4. Elle compare le résultat à la **photo de référence**.
5. Les cases passées de pleine à vide déclenchent le règlement des prises
   correspondantes.

## Comment une prise est décidée

Chaque case vidée a un score. L'API le compare à son seuil, réglable dans la
configuration (`SEUIL_CONFIRMATION_SCORE`, 0,75 par défaut).

Score **au-dessus** du seuil : prise `CONFIRMEE`, automatiquement.
Score **en dessous** : prise `AMBIGUE`. L'application demande alors au patient
de confirmer lui-même.

Une prise dont l'heure est passée sans que rien ne se produise devient
`MANQUEE`. Une tâche planifiée s'en occupe à intervalle régulier.

## L'histoire du fuseau horaire

Ce point mérite une explication, parce que c'est le genre de bug qui passe
inaperçu longtemps.

Chaque utilisateur a un fuseau horaire. Quand le patient dit « mon créneau du
matin est à 08:00 », il parle de 8 heures **chez lui**. La première version du
code enregistrait cette heure comme 08:00 **UTC** — l'heure de référence
mondiale. À Toronto en été, ça fait 4 heures du matin.

Toutes les prises étaient donc décalées de plusieurs heures, et les rappels
avec elles. Le champ `fuseauHoraire` existait dans la base mais n'était lu
nulle part.

C'est corrigé. Deux choses le sont, pas une : l'**instant** de la prise, et le
**jour** auquel elle appartient. Une prise à 22:00 à Toronto appartient à ce
jour-là, même s'il est déjà le lendemain en heure UTC.

## Les prises se régénèrent maintenant

Avant, les prises attendues n'étaient créées qu'au moment où on associait un
pilulier à un compte. Ajouter un médicament plus tard ne créait aucune prise —
donc ni rappel ni voyant lumineux, pour toujours.

Deux mécanismes ont été ajoutés. Une **synchronisation** qui crée les prises
manquantes après chaque création ou modification de médicament, sans jamais
toucher à une prise déjà en cours. Et une **replanification** qui déplace les
prises encore à l'état `PREVUE` quand on change l'heure d'un créneau.

## Les points d'entrée principaux

| Adresse | Ce qu'elle fait |
|---|---|
| `POST /api/comptes` | créer un compte |
| `POST /api/comptes/connexion` | se connecter, reçoit un jeton |
| `POST /api/dispositifs/associer` | rattacher un pilulier à son compte |
| `PUT /api/dispositifs/moi/plages-horaires` | changer les heures des créneaux |
| `POST /api/dispositifs/moi/confirmer-remplissage` | déclarer le pilulier rempli |
| `GET/POST/PUT /api/medicaments` | gérer les médicaments |
| `POST /api/evenements` | **le circuit** envoie ouverture ou fermeture |
| `GET /api/prises` | les prises et leur état |
| `GET /api/circuit/:id/commandes-del` | **le circuit** demande quels voyants allumer |
| `GET/POST /api/demo/...` | l'écran de démonstration et la panne simulée |

`POST /api/evenements` accepte **soit un événement seul, soit une liste**.
C'est ce qui permet au circuit de renvoyer d'un coup tout ce qu'il a gardé en
mémoire pendant une coupure réseau.

## Les tests

174 tests automatisés. Ils n'utilisent **aucune vraie base de données** : les
dépôts sont remplacés par des doublures. C'est pour ça qu'ils tournent en
quelques secondes et qu'on peut les lancer sans rien configurer.
