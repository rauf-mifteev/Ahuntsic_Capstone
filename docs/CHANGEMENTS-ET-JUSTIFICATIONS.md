# Ce qui a changé, et pourquoi

Ce document compare la version actuelle du projet à celle qui existait avant
cette passe de travail. Chaque changement est expliqué : ce qui n'allait pas,
ce qui a été fait, et pourquoi ce choix.

Tout a été relu, puis intégré au dépôt en six étapes pendant le sprint 2.

---

## Résumé

| # | Ce qui n'allait pas | Gravité |
|---|---|---|
| 1 | Les photos n'étaient jamais enregistrées, donc la règle des 30 jours ne portait sur rien | fonctionnalité absente |
| 2 | Le fuseau horaire n'était lu nulle part : toutes les prises étaient décalées | bug silencieux |
| 3 | Les rappels n'ont jamais fonctionné, masqués par un `catch` vide | fonctionnalité morte |
| 4 | Le modèle entraîné répondait « pleine » pour les 28 cases | bug silencieux |
| 5 | Les prises n'étaient jamais régénérées après l'association | fonctionnalité absente |
| 6 | Changer l'heure d'un créneau ne replanifiait rien | fonctionnalité absente |
| 7 | Un médicament ne pouvait être que dans un seul créneau | limitation injustifiée |
| 8 | Impossible de modifier un médicament | fonctionnalité absente |
| 9 | Le plan de câblage Wokwi empêchait toute simulation de démarrer | bloquant |
| 10 | Un JSON malformé renvoyait 500 au lieu de 400 | robustesse |
| 11 | Trois défauts d'outillage (chemin, doublons, comptes incohérents) | qualité |

---

## 1. Les photos n'étaient jamais enregistrées

**Le problème.** Le service d'analyse classait l'image puis la jetait. Le
champ `Verification.image` valait donc **toujours** `null`. La tâche de purge
`purgerImagesAnciennes.js` mettait consciencieusement à `null` un champ déjà
vide. La règle du sprint — « les photos sont supprimées après 30 jours » —
supposait qu'elles existent. Elle ne portait sur rien.

**Le changement.** Le service renvoie maintenant l'image en base64, et l'API
la range dans la vérification. La purge a enfin quelque chose à purger.

**Pourquoi ce choix.** L'image n'est renvoyée **que** sur le chemin simulé.
Si l'appelant a fourni sa propre photo, il l'a déjà — la lui renvoyer serait
du gaspillage. Coût mesuré : 6,8 Ko par fermeture. Les réponses HTTP ne
grossissent pas, parce que le champ était déjà retiré à la sérialisation.

---

## 2. Le fuseau horaire n'était lu nulle part

**Le problème.** Le champ `fuseauHoraire` existait sur chaque utilisateur,
mais aucun code ne le lisait. La génération des prises faisait
`heurePrevue.setUTCHours(...)` : « 08:00 » devenait 8 heures **UTC**, soit 4
heures du matin à Toronto en été. Toutes les prises étaient décalées, et les
rappels avec elles.

**Le changement.** Deux fonctions de conversion, écrites avec `Intl`, présent
dans Node depuis la version 18 — **aucune dépendance ajoutée**.

**Pourquoi c'est plus subtil qu'il n'y paraît.** Deux choses étaient fausses,
pas une. L'**instant** de la prise, et le **jour** auquel elle appartient. Une
prise à 22:00 à Toronto appartient à ce jour-là, alors qu'il est déjà le
lendemain en UTC. Les deux sont corrigées, avec une double passe pour gérer
les changements d'heure.

**Pourquoi ça avait survécu.** Aucun test n'examinait `heurePrevue`. Un
nouveau fichier de tests couvre maintenant l'été, l'hiver, le changement
d'heure du 8 mars 2026, Paris et Tokyo.

---

## 3. Les rappels n'ont jamais fonctionné

**Le problème.** Le code demandait une notification en passant une date toute
simple. Depuis le SDK 52, Expo exige un objet **typé**. Sa vérification
interne refusait l'appel avant même d'atteindre le code de compatibilité
prévu pour les anciennes versions — code devenu inatteignable.

**Le changement.** Le déclencheur est maintenant déclaré avec son type.

**Le vrai coupable, et la leçon.** L'appel était écrit
`planifierRappels(...).catch(() => {})`. Ce `catch` vide **avalait l'erreur
sans rien afficher**. Expo refusait à chaque fois, en silence, depuis des
semaines. Remplacé par un `console.warn`, la cause est apparue en une minute.

**Un `catch` vide transforme une panne bruyante en fonctionnalité morte.** Il
vaut la peine de chercher s'il en reste ailleurs.

---

## 4. Le modèle entraîné répondait « pleine » partout

**Le problème.** L'entraînement se déroulait parfaitement — la perte tombait à
`0.0000`. Puis le modèle, une fois chargé, classait les 28 cases comme
pleines, y compris celles manifestement vides. Aucune erreur, aucun message.

**La cause.** Le tronc du réseau était gelé, mais geler les poids ne gèle pas
le **comportement** des couches de normalisation. Pendant l'entraînement,
elles utilisaient les statistiques du lot courant et écrasaient leurs
statistiques de référence avec nos images dessinées. À l'utilisation, elles
repassaient sur ces statistiques désormais faussées. La tête du réseau avait
appris sur des données qu'elle ne reverrait jamais.

**Le changement.** Une ligne : garder le tronc en mode évaluation pendant
l'entraînement. C'est la pratique standard quand on gèle un réseau
pré-entraîné.

**Vérification.** Avant : 51,79 % d'exactitude, 100 % de faux négatifs. Après :
le modèle identifie correctement la case vidée.

---

## 5. Les prises n'étaient jamais régénérées

**Le problème.** La génération des prises attendues n'était appelée qu'à un
seul endroit : l'association du pilulier. Un médicament ajouté ensuite ne
produisait **aucune** prise — donc ni rappel, ni voyant, pour toujours.

**Le changement.** Une synchronisation appelée à la création et à la
modification d'un médicament.

**Pourquoi elle est prudente.** Elle n'insère que les couples (case, jour)
absents, et ne touche **jamais** une prise déjà en cours de vérification,
confirmée, ambiguë ou manquée. On n'écrase pas un historique.

---

## 6. Changer l'heure d'un créneau ne replanifiait rien

**Le problème.** La nouvelle heure était enregistrée, mais les prises déjà
générées gardaient l'ancienne. Le patient conservait ses anciens horaires
pendant une semaine.

**Le changement.** Une replanification des prises encore à venir.

**Le piège rencontré.** La première version filtrait sur « prises dont l'heure
n'est pas encore passée ». C'était faux : **c'est justement quand l'heure
vient de passer que le patient s'aperçoit de l'erreur et la corrige**. Le bon
critère est le **statut** de la prise, pas l'horloge. Un test couvre
explicitement ce cas.

---

## 7. Un médicament ne pouvait être que dans un seul créneau

**Le problème.** « Metformine 500, matin et soir » était impossible. C'est un
cas d'usage banal.

**Le changement.** Un médicament porte maintenant une **liste** de créneaux.

**Rétrocompatibilité sans migration.** Une fonction lit indifféremment
l'ancien format et le nouveau. Les médicaments déjà créés par l'équipe
continuent de fonctionner, et on n'écrit pas en masse dans une base partagée.

**Pourquoi la limitation d'origine n'était pas justifiée.** Le commentaire
invoquait deux règles de gestion « garanties par construction ». C'était une
sur-interprétation : ces règles portent sur les **cases**, pas sur les
médicaments. Deux créneaux, ce sont deux cases distinctes, chacune avec son
heure. La règle limitant à quatre créneaux par jour reste respectée.

---

## 8. Impossible de modifier un médicament

On pouvait en créer et en supprimer, pas en corriger un. Une route de
modification a été ajoutée, avec les mêmes validations qu'à la création.

**Un détail de sécurité** : tenter de modifier le médicament de quelqu'un
d'autre renvoie **404, pas 403**. Un 403 confirmerait que la ressource
existe ; un 404 ne dit rien.

---

## 9. Le plan de câblage Wokwi bloquait tout

Trois fils de masse étaient branchés sur des broches qui n'existent pas sur
cette carte. Wokwi rejetait le montage et la simulation ne démarrait **jamais**,
sans message clair.

Le programme, lui, était correct depuis le début — c'est le plan de câblage
qui n'avait jamais été exécuté.

---

## 10. Un JSON malformé renvoyait 500 au lieu de 400

Le gestionnaire d'erreurs ne traitait pas le cas des corps de requête
illisibles, que la bibliothèque marque pourtant explicitement comme des
erreurs client. Corrigé, avec un test.

---

## 11. Trois défauts d'outillage

**Un test échouait sur Windows** : il écrivait dans `/tmp/`, un chemin qui
n'existe pas sous Windows. Remplacé par le dossier temporaire fourni par
l'outil de test. Le test voisin le faisait déjà correctement.

**Le jeu de données se dupliquait.** Le fichier d'annotations était ouvert en
mode ajout et jamais remis à zéro : relancer la génération donnait 24 images,
puis 48, puis 72. Le compte faussé était le symptôme bénin ; le vrai risque
était qu'avec un tirage différent, une image de test se retrouve listée dans
le jeu d'entraînement — ce qui invalide silencieusement toute mesure.

**Trois nombres différents** décidaient de la taille du jeu de données à trois
endroits. Une seule constante les remplace.

---

## Les commentaires ont été retirés du code

À la demande de l'équipe, les commentaires explicatifs ont été retirés des
fichiers de code : environ 520 commentaires en Python, JavaScript, C++ et
YAML. Les explications vivent maintenant dans les documents `FONCTIONNEMENT-*`
de ce dossier.

**Quatre exceptions**, gardées parce qu'elles sont fonctionnelles et non
documentaires :

- Les directives `# noqa` en Python et `// eslint-disable` en JavaScript. Ce
  sont des instructions aux outils de vérification. Les retirer ferait échouer
  le lint — celle de `errorHandler.js` en particulier, car Express exige quatre
  arguments sur un gestionnaire d'erreurs.
- Les **docstrings** Python. Ce ne sont pas des commentaires mais des chaînes
  de caractères, et FastAPI les utilise pour produire la documentation
  interactive de `/docs`. Les supprimer viderait cette page.
- `config_locale.h.example`, dont les commentaires **sont** le contenu : sans
  eux, le modèle n'explique plus quoi remplir.
- Les documents Markdown, évidemment.

Une copie du code d'avant nettoyage est conservée dans
`Sprint_2_equipe/sauvegarde-code-avec-commentaires/`, sur l'ordinateur de
Daniel (ce dossier n'est pas dans le dépôt).

---

## Corrections faites après la fusion des étapes 1 à 5

Une relecture de `main` a trouvé quatre derniers points, corrigés ensemble dans
la PR #20 :

- **`render.yaml`** : le service d'analyse était déclaré en stratégie `factice`,
  qui ne regarde pas l'image. Il est maintenant en `seuillage`, la stratégie de
  démonstration.
- **`evenementService.js`** : le `try/catch` de la vérification englobait tout.
  Une erreur de base de données était donc affichée comme « service d'analyse
  indisponible ». Le `try/catch` entoure maintenant seulement l'appel au service
  d'analyse.
- **`verificationRepository.js`** : la fonction `trouverDernierePourComparaison`
  n'était appelée nulle part. Elle est supprimée.
- **`wokwi/localtunnel-log.txt`** : un journal de tunnel avait été committé par
  erreur. Il est supprimé et ajouté au `wokwi/.gitignore`.

---

## État des tests

| Suite | Avant | Après |
|---|---|---|
| `pytest` (analyse d'images) | 43 | **45** |
| `npm test` (API) | 127 | **174** |

Aucun test existant n'a été affaibli. Une seule ligne d'un test existant a été
modifiée, pour refléter un changement de format décidé volontairement
(le passage d'un créneau à une liste de créneaux).

---

## Écarts entre l'engagé et le livré

Relevé au 11 septembre, à la fin du sprint 2.

| Sujet | État | Suite prévue |
|---|---|---|
| Déploiement des deux services | fait le 10 septembre : `pilulier-api` et `pilulier-analyse-images` répondent en ligne | rien à faire |
| Choix de la version du sprint 2 | réglé : le découpage en six étapes (E1 à E6) a été retenu, fusionné dans `main` par les PR #15 à #20 | rien à faire |
| Diagrammes touchés par l'objet intelligent | refaits : classes, architecture, et les séquences de configuration, de remplissage et de prise normale | rien à faire |
| Répétition chronométrée à trois | **pas faite** | à tenir avant la revue ; suivie par la sous-tâche PC-110 |
| Modèle MobileNet entraîné | **pas déployé** : il réclame PyTorch, trop lourd pour le palier gratuit | le seuillage OpenCV tient lieu de stratégie en service ; le modèle reste mesurable hors ligne avec `analyse-images/entrainement/mesurer_erreurs.py` |
| Déclaration des outils d'IA générative | **pas écrite** : le champ de `D5-plan-documentation.md` est resté vide | à remplir par l'équipe, chacun pour sa part |
| Retour du client après raffinement | **pas écrit** : le champ de `A2-analyse-des-besoins.md` est resté vide | à remplir après la prochaine séance |

Les trois derniers points demandent des faits que seule l'équipe détient. Ils
sont relevés ici pour qu'ils ne se perdent pas d'ici la revue.
