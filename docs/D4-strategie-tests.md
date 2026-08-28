# Stratégie de tests

On teste en priorité ce qui casse le plus facilement et coûte le plus cher : les règles de gestion et le parcours principal.

Ce qu'on teste

Tests unitaires sur les règles de gestion : détection des cases vidées, photo de référence, délai avant qu'une prise soit manquée, seuil du modèle, calcul de l'adhérence.

Tests d'intégration sur l'API : réception d'un événement, refus d'un boîtier inconnu, cycle complet d'une vérification, première fermeture sans photo de référence.

Un test de bout en bout sur le parcours principal : remplissage, fermeture, photo, comparaison, résultat, historique.

Tests des pannes : score trop bas, service d'analyse qui ne répond pas, perte de connexion, mauvaise photo.

Tests manuels sur un vrai téléphone, iOS et Android, une fois par sprint.

Évaluation du modèle sur des photos réservées, jamais utilisées pour l'entraînement. On compte séparément les deux types d'erreurs. Confirmer une prise qui n'a pas eu lieu est la pire.

Outils

Jest pour les tests unitaires et d'intégration. GitHub Actions pour les lancer automatiquement.

Comment on travaille

Les tests s'écrivent pendant le sprint où on développe la fonctionnalité, pas après.

Ils tournent à chaque fusion. Si un test échoue, on ne fusionne pas.

Si l'intégration continue reste rouge plus d'une journée, on arrête d'ajouter du code et on la répare.
