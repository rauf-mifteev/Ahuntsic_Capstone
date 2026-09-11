# Le circuit simulé — comment il marche

Dossier : `wokwi/`. Un **ESP32** programmé en C++, simulé sur le site
**Wokwi**. Compilé avec **PlatformIO**.

## Ce qu'est ce circuit

Un ESP32 est un petit ordinateur avec du Wi-Fi, qu'on trouve dans beaucoup
d'objets connectés. Le nôtre n'existe pas physiquement : Wokwi le simule dans
le navigateur. Mais **le programme est réel** et **les requêtes réseau sont
réelles** : le circuit simulé se connecte vraiment à Internet et appelle
vraiment notre API.

Ce choix est assumé et documenté dans `A1-perimetre.md` : construire le
boîtier n'était pas dans le périmètre du projet.

## Ce qu'il y a sur la carte

**Un bouton-poussoir** (broche 4) qui joue le rôle du capteur de couvercle.
Appuyé = couvercle ouvert, relâché = couvercle fermé.

**Un voyant d'état réseau** (broche 2), allumé quand le Wi-Fi est connecté.

**Quatre voyants de créneau** (broches 16 à 19) : matin, midi, soir, coucher.

Pourquoi 4 voyants et non 28 ? Parce qu'à un instant donné, toutes les cases
en attente appartiennent forcément au jour courant. Un boîtier réel n'a besoin
d'éclairer que « aujourd'hui ». Regrouper par créneau suffit, et 4 voyants
sont plus lisibles que 28.

## Ce que fait le programme

Au démarrage : connexion au réseau `Wokwi-GUEST` (le Wi-Fi simulé que Wokwi
fournit gratuitement, avec un vrai accès Internet), puis synchronisation de
l'heure par Internet — un ESP32 n'a pas d'horloge fiable au démarrage.

Ensuite, en boucle, trois choses. Il **surveille le bouton** et envoie un
événement à chaque changement. Il **réessaie d'envoyer** ce qui n'est pas
passé. Et toutes les 4 secondes, il **demande à l'API quels voyants allumer**.

## La mémoire tampon

C'est la fonctionnalité qu'on montre en démonstration.

Si l'envoi échoue — réseau coupé, API endormie — l'événement n'est pas perdu :
il est rangé dans une mémoire de 20 places. Dès que la connexion revient, tout
est renvoyé **d'un coup**, sous forme de liste, et l'API accepte ce format.

Chaque événement garde **l'heure de son propre clic**, pas celle du renvoi.
C'est ce qui rend la reconstitution fidèle : quatre événements arrivés dans la
même seconde peuvent porter des heures espacées de plusieurs minutes.

Si la mémoire se remplit, le **plus ancien** est abandonné. Perdre un
événement très vieux est moins grave que perdre celui qui vient de se
produire.

## Le fichier de configuration personnel

`src/config_locale.h` contient l'adresse de l'API et l'identifiant du
pilulier. Il n'est **jamais partagé** : chacun a le sien, et le fichier est
ignoré par git. Un modèle est fourni : `config_locale.h.example`.

L'identifiant doit correspondre à un pilulier **déjà associé** à un compte,
sinon l'API répond 401. C'est voulu.

## La contrainte à connaître absolument

**Le circuit simulé ne peut pas joindre votre ordinateur.** Il tourne sur les
serveurs de Wokwi ; pour lui, `localhost` et `192.168.x.x` n'existent pas.

Il lui faut une **adresse publique**. Pour la démonstration, c'est l'API
déployée : `https://pilulier-api.onrender.com`. Son adresse ne change pas. Pour
tester votre propre copie locale, ouvrez un **tunnel** temporaire qui donne une
adresse publique vers votre machine. C'est décrit dans
`INSTALLATION-EQUIPE.md`.

L'adresse du tunnel **change à chaque redémarrage**. Il faut alors modifier
`config_locale.h` **et recompiler**.

## Deux pièges rencontrés

**Cliquer lentement pendant la démonstration de panne.** Laissez au moins 6
secondes entre deux clics. L'envoi réseau bloque le programme pendant environ
5 secondes ; pendant ce temps, le bouton n'est pas lu et un appui peut passer
inaperçu. Ce n'est **pas** la mémoire tampon qui perd des événements — c'est
une limite du programme, qu'un vrai capteur éviterait en utilisant une
interruption.

**Un message d'erreur normal.** À chaque requête sécurisée, la console affiche
`setSocketOption(): fail on 0, errno: 9`. C'est un bruit connu de la
bibliothèque ESP32, sans aucune conséquence — les requêtes aboutissent bien.

## Le fichier `diagram.json`

Il décrit le câblage. Il contenait une erreur qui empêchait toute simulation
de démarrer : trois fils de masse branchés sur des broches inexistantes.
Wokwi refusait le montage sans message clair. Corrigé.

Le programme, lui, était bon depuis le début — c'est le plan de câblage qui
n'avait jamais été exécuté.
