# L'application mobile — comment elle marche

Dossier : `mobile/`. Écrite en **React Native** avec **Expo** (SDK 54).

C'est la seule partie que le patient voit. Elle ne contient aucune règle
métier : elle affiche ce que l'API lui dit et lui transmet les actions du
patient.

## Comment on la lance

Expo permet de faire tourner l'application sur un vrai téléphone sans passer
par les magasins d'applications. On lance un serveur sur l'ordinateur, on
scanne un code QR avec l'application **Expo Go**, et l'application se charge.

**Piège important** : l'Expo Go du Play Store est en SDK 57 et **refuse** ce
projet, qui est en SDK 54. Il faut installer la version 54 depuis le lien
donné dans `INSTALLATION-EQUIPE.md`. Toute l'équipe doit le faire avant la
démonstration.

## Comment elle trouve l'API

Le fichier `mobile/.env` contient une seule ligne importante :

```
EXPO_PUBLIC_API_URL=https://pilulier-api.onrender.com/api
```

C'est l'adresse à utiliser pour la démonstration : l'API déployée, celle-là
même que le circuit appelle. Pour développer contre votre propre copie
locale, remplacez-la par l'adresse de votre PC sur le réseau, par exemple
`http://192.168.1.42:3000/api`.

**`localhost` ne marchera jamais depuis un téléphone.** Pour le téléphone,
`localhost` désigne le téléphone lui-même, pas l'ordinateur. Avec une copie
locale, les deux appareils doivent en plus être sur le même Wi-Fi.

Seules les variables commençant par `EXPO_PUBLIC_` sont visibles depuis
l'application — c'est une règle d'Expo, pas un choix du projet.

## Les écrans

**Connexion et inscription** — créer un compte, se connecter. Le jeton reçu
est gardé et rattaché automatiquement à chaque appel suivant.

**Tableau de bord** — l'écran d'accueil. Les prises du jour et leur état.

**Créneaux** — les heures des quatre moments de la journée. Les changer
replanifie les prises à venir.

**Médicaments** — ajouter, modifier, supprimer. Un médicament peut maintenant
être dans **plusieurs créneaux** : « Metformine, matin et soir » est possible.

**Remplissage** — le bouton « J'ai rempli mon pilulier ». Il prépare la
**photo de référence** : la prochaine fermeture du couvercle servira de point
de départ aux comparaisons. Sans ce geste, aucune prise ne se confirme.

**Résultat** — ce qui s'est passé à la dernière fermeture : prise confirmée,
ambiguë, ou case encore pleine. En cas de doute, le patient confirme
lui-même.

**Démonstration** — un écran de contrôle pour la revue : voir l'état du
circuit et **provoquer une panne réseau** volontairement.

## Les rappels

L'application programme des **notifications locales** : elles sont préparées
à l'avance sur le téléphone et se déclenchent même sans réseau.

Ce mécanisme n'a jamais fonctionné pendant tout le sprint, et l'explication
mérite d'être connue.

Le code demandait une notification en passant simplement une date. Depuis le
SDK 52, Expo exige un objet **typé** : il faut préciser qu'il s'agit d'un
déclencheur de type « date ». La vérification interne d'Expo refusait l'appel
avant même d'arriver au code de compatibilité prévu pour les anciennes
versions.

Mais le vrai coupable est ailleurs. L'appel était écrit comme ceci :

```js
planifierRappelsPourAujourdhui(...).catch(() => {})
```

Ce `.catch(() => {})` **avale l'erreur sans rien dire**. Expo refusait, à
chaque fois, silencieusement. Aucun message, aucun symptôme visible, une
fonctionnalité morte pendant des semaines.

**La leçon** : un `catch` vide transforme une panne bruyante en panne muette.
Remplacé par un `console.warn`, le problème s'est révélé en une minute. Il
vaut la peine de chercher s'il en reste ailleurs dans le code.

## Les appels à l'API

Le dossier `src/api/` regroupe tous les appels réseau, un fichier par sujet.
Le fichier `client.js` configure l'adresse de base et un délai d'attente de
45 secondes — long exprès, parce qu'un serveur gratuit endormi met plusieurs
dizaines de secondes à se réveiller.
