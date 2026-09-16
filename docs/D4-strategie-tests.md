# Stratégie de tests

On teste en priorité ce qui casse le plus facilement et coûte le plus cher : les règles de gestion et le parcours principal.

Ce qu'on teste

Tests unitaires sur les règles de gestion : détection des cases vidées, photo de référence, délai avant qu'une prise soit manquée, seuil du modèle, calcul de l'adhérence.

Tests d'intégration sur l'API : réception d'un événement, refus d'un boîtier inconnu, cycle complet d'une vérification, première fermeture sans photo de référence.

Un test de bout en bout sur le parcours principal : remplissage, fermeture, photo, comparaison, résultat, historique.

Tests des pannes : score trop bas, service d'analyse qui ne répond pas, perte de connexion, mauvaise photo.

Tests manuels sur un vrai téléphone, iOS et Android, une fois par sprint.

Évaluation du modèle sur des photos réservées, jamais utilisées pour l'entraînement. On compte séparément les deux types d'erreurs. Confirmer une prise qui n'a pas eu lieu est la pire. On mesure aussi la tenue du modèle quand l'éclairage change, parce que sur des images propres le seuillage suffit et ne départage rien : voir [la mesure de robustesse](mesure-robustesse.md).

Outils

Jest pour l'API et l'application mobile. pytest pour le service d'analyse d'images. GitHub Actions pour les lancer automatiquement : un workflow par partie du projet, dans `.github/workflows/`, chacun déclenché seulement par les fichiers qui le concernent.

Comment on travaille

Les tests s'écrivent pendant le sprint où on développe la fonctionnalité, pas après.

Ils tournent à chaque fusion. Si un test échoue, on ne fusionne pas.

Si l'intégration continue reste rouge plus d'une journée, on arrête d'ajouter du code et on la répare.

Trois pièges verrouillés par un test

Certains tests n'existent pas pour couvrir une fonction, mais pour empêcher une erreur précise de revenir. Leur intérêt n'est pas lisible dans le code du test lui-même, alors il est noté ici.

**L'ordre de déclaration des routes.** `/prises/historique` doit être déclarée **avant** `/prises/:id`. Dans le cas contraire, Express prend le mot « historique » pour un identifiant de prise et la route d'historique devient inatteignable. Un test vérifie que c'est bien le service d'adhérence qui répond, et non celui des prises.

**Un taux d'adhérence absent n'est pas un taux de zéro.** Quand aucune prise n'est encore réglée sur la période, le calcul renvoie `null`, jamais `0`. Les deux valeurs ont un sens opposé : `null` veut dire « on ne sait pas encore », `0` veut dire « tout a été manqué ». L'écran doit pouvoir afficher un tiret plutôt qu'un pourcentage faux et décourageant. Un autre test fixe la règle du calcul : seules les prises réglées comptent, celles encore en attente sont exclues du dénominateur.

**Le jour du patient, pas celui d'UTC.** Un test place l'horloge au 16 juillet à 01h00 UTC, ce qui correspond au 15 juillet à 21h00 à Toronto. La journée affichée doit rester celle du patient. Sans ce test, les prises du soir basculeraient au lendemain pour tous les fuseaux à l'ouest de Greenwich.
