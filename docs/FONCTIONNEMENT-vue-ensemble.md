# Comment le projet fonctionne — vue d'ensemble

Document écrit pour être lu par quelqu'un qui découvre le projet. Aucune
connaissance préalable n'est supposée.

## Ce que fait le produit

Un pilulier est une boîte à médicaments avec des cases. Le nôtre en a **28** :
7 jours × 4 moments de la journée (matin, midi, soir, coucher).

Le problème qu'on résout : savoir si la personne a **vraiment** pris son
médicament. Un pilulier ordinaire peut seulement dire « le couvercle a été
ouvert ». Ça ne prouve rien — on peut ouvrir la boîte sans rien prendre.

Notre idée : **regarder les cases**. Si une case était pleine avant et
qu'elle est vide après, le comprimé a été pris. C'est ça, la différence avec
un pilulier connecté ordinaire.

## Les quatre morceaux du système

Le projet est découpé en quatre programmes séparés qui se parlent.

**Le circuit** (dossier `wokwi/`) — un petit ordinateur ESP32 avec un bouton
qui représente le couvercle. Quand le couvercle s'ouvre ou se ferme, il
prévient l'API par Internet. Il n'existe pas physiquement : il est
**simulé** sur le site Wokwi.

**L'API** (dossier `api/`) — le cerveau. Elle reçoit les événements du
circuit, garde tout en base de données, applique les règles du projet
(qu'est-ce qui compte comme une prise ? quand faut-il douter ?) et répond
aux questions de l'application mobile.

**Le service d'analyse d'images** (dossier `analyse-images/`) — l'œil. On lui
donne une photo du plateau, il répond « case 0 pleine, case 1 vide, case
2 pleine… » pour les 28 cases, avec un score de confiance pour chacune.

**L'application mobile** (dossier `mobile/`) — ce que le patient voit sur son
téléphone : ses médicaments, ses horaires, ses rappels, et le résultat de
chaque prise.

## Le voyage d'une prise, étape par étape

C'est le scénario central du projet. Suivons-le du début à la fin.

1. **Le patient ouvre le couvercle.** Le circuit détecte le bouton et envoie
   un message à l'API : « OUVERTURE, à telle heure ».
2. **L'API note l'ouverture.** Elle marque les prises attendues à ce moment-là
   comme « en cours de vérification ».
3. **Le patient prend son comprimé et referme.** Le circuit envoie
   « FERMETURE ».
4. **L'API demande une photo.** Elle appelle le service d'analyse : « prends
   une photo du plateau de ce pilulier ».
5. **Le service d'analyse regarde.** Il produit une image du plateau, la
   découpe en 28 morceaux, et classe chaque morceau : pleine ou vide.
6. **L'API compare.** Elle met côte à côte cette photo et la **photo de
   référence** (voir plus bas), et repère les cases qui étaient pleines et
   qui sont maintenant vides.
7. **L'API décide.** Une case vidée au bon moment = prise confirmée. Si le
   score de confiance est trop bas, elle dit « ambigu » plutôt que de
   confirmer à tort.
8. **Le patient voit le résultat** sur son téléphone.

## Trois règles à comprendre absolument

**La comparaison va dans un seul sens.** Une case qui passe de pleine à vide,
c'est une prise. Une case qui passerait de vide à pleine ne veut rien dire —
personne ne remet un comprimé dans sa case. Seul le sens plein → vide compte.

**Sans photo de référence, rien ne se confirme.** La photo de référence est
celle prise juste après que le patient a confirmé avoir rempli son pilulier
pour la semaine. C'est le point de départ des comparaisons. Tant que
personne n'a fait « J'ai rempli mon pilulier », aucune prise ne peut se
confirmer automatiquement. **Ce n'est pas un bug**, c'est voulu : sans point
de départ, on ne sait pas ce qui était censé être dans les cases.

**Dans le doute, on doute.** Se tromper dans un sens est bien plus grave que
dans l'autre. Dire « c'est pris » alors que le comprimé est encore là donne
une fausse sécurité — c'est dangereux. Dire « je ne suis pas sûr » alors que
le comprimé a bien été pris est juste agaçant : le patient confirme à la
main. Le système est réglé pour préférer le second cas.

## Ce qui est réel, ce qui est simulé

C'est la question que le correcteur posera en premier, alors autant être
clair.

| Vraiment réel | Simulé |
|---|---|
| L'API, ses règles, sa base de données | Le boîtier physique : il n'existe pas |
| Le classifieur qui regarde les images | Le circuit : il tourne sur les serveurs de Wokwi |
| Les scores et les verdicts | La caméra : il n'y en a aucune |
| Les requêtes réseau du circuit vers l'API | Les photos : elles sont **dessinées** |
| L'application mobile | |

Le point important : **le classifieur ne triche pas**. Le service d'analyse
connaît l'état réel de son plateau simulé, mais il ne le consulte jamais pour
répondre. Il dessine l'image, puis la classe comme il classerait n'importe
quelle photo — et il peut se tromper. C'est ce qui rend la démonstration
honnête.

Pourquoi dessiner les photos plutôt qu'en prendre ? Parce que rien dans le
système ne peut en produire : un ESP32 simulé n'a pas de caméra. Le détail
complet est dans `photos-simulees.md`.

## Où vivent les données

Tout est dans **MongoDB Atlas**, une base de données hébergée sur Internet.
Les collections principales : `utilisateurs`, `dispositifs` (les piluliers),
`medicaments`, `prises` (une par case et par jour), `evenementouvertures`
(chaque ouverture et fermeture) et `verifications` (le résultat de chaque
analyse d'image).

Les photos analysées y sont conservées **30 jours**, puis effacées
automatiquement. Le verdict et les scores, eux, restent : on peut donc
expliquer une décision longtemps après, sans garder d'images du domicile.

## Pour aller plus loin

- `FONCTIONNEMENT-service-analyse.md` — l'œil du système
- `FONCTIONNEMENT-api.md` — le cerveau
- `FONCTIONNEMENT-mobile.md` — l'application
- `FONCTIONNEMENT-circuit-wokwi.md` — le circuit
- `INSTALLATION-EQUIPE.md` — comment tout faire tourner chez soi
