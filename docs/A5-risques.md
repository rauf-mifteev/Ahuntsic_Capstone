# Gestion des risques

Section 2.8 du [cahier des charges](A3-cahier-des-charges.md).

R-01 — On n'arrive pas à livrer ce qu'on a promis
Cause : beaucoup de parties techniques à couvrir, sprints d'une semaine sans marge.
Impact : très élevé. C'est notre plus gros risque.
Mesure : périmètre réduit et justifié dès le départ, priorisation stricte, mesure de notre vitesse réelle dès le premier sprint, et écart entre promis et livré annoncé honnêtement à chaque revue.

R-02 — Une seule personne comprend chaque partie
Cause : l'application mobile, l'API et l'objet intelligent reposent chacun sur une personne.
Impact : élevé. Si elle est absente, un tiers du système est bloqué.
Mesure : chaque personne présente sa partie aux deux autres et l'explique dans le dépôt, relecture de code obligatoire, service d'analyse séparé pour pouvoir travailler avec un faux service, mêlées quotidiennes.

R-03 — Le modèle n'est pas assez fiable
Cause : peu de photos et peu de temps pour l'entraîner.
Impact : très élevé. Le modèle n'est pas juste un vérificateur, c'est le capteur du système.
Mesure : éclairage par en dessous qui donne des formes très contrastées dans des conditions toujours pareilles, problème réduit à « vide ou non vide » sur des zones fixes, photos prises en parallèle du développement, version par seuillage gardée en secours, et statut « ambigu » qui évite une mauvaise réponse.

R-04 — Le système confirme une prise qui n'a pas eu lieu
Cause : seuil trop bas ou mauvaise photo.
Impact : très élevé. C'est pire que ne rien confirmer, parce que le patient s'y fierait.
Mesure : seuil réglable calibré pour préférer le doute, mesure séparée des erreurs dans les deux sens, trace de qui a confirmé, textes qui parlent de la case vidée et non du médicament avalé, et confirmation explicite du remplissage hebdomadaire (RG-13) pour qu'aucune comparaison n'ait lieu sans photo de référence valide.

R-05 — La caméra brise et tout s'arrête
Cause : le boîtier n'a qu'une caméra et aucun capteur dans les cases.
Impact : élevé. Sans elle, le système ne détecte plus rien.
Mesure : l'interrupteur du couvercle sert de secours, le système passe en confirmation manuelle, et l'application dit clairement qu'elle ne vérifie plus.

R-06 — L'environnement en ligne tombe
Cause : dépendance à des services infonuagiques gratuits.
Impact : élevé. Toutes nos démonstrations se font en ligne.
Mesure : tout est mis en place dès le premier sprint, vérifié avant chaque revue, la configuration est sortie du code, et la procédure de déploiement est écrite pour que plus d'une personne puisse la refaire.

R-07 — Le client refuse notre périmètre
Cause : périmètre jugé trop petit, ou refus de la simulation.
Impact : élevé.
Mesure : validation dès la première rencontre, justification écrite de chaque retrait, démonstration que ce qui reste couvre tout ce qui est évalué, et acceptation de chaque livraison au fur et à mesure.

R-08 — Des données de santé sont exposées
Cause : les photos et l'historique d'adhérence sont des données de santé indirectes.
Impact : élevé pour la crédibilité du produit.
Mesure : chaque patient ne voit que ses données, communications chiffrées, mots de passe hachés, aucune clé dans le dépôt, photos conservées 30 jours puis supprimées (verdicts et scores conservés indéfiniment), données validées des deux côtés.

R-09 — L'application est difficile à utiliser pour le public visé
Cause : risque de la concevoir pour des gens à l'aise avec la technologie alors que nos utilisateurs peuvent être des personnes âgées.
Impact : moyen à élevé.
Mesure : règles WCAG 2.1 AA, statuts distingués autrement que par la couleur, aucune photo à prendre pour le patient, guidage lumineux, et tests sur un vrai téléphone par les trois membres à chaque sprint.

R-10 — Wokwi devient indisponible
Cause : changement de conditions ou limite sur les requêtes sortantes.
Impact : moyen. Ça casserait notre démonstration de l'objet intelligent.
Mesure : vérification rapide que les requêtes sortantes fonctionnent, interface conçue pour pouvoir changer la source des événements, et séquence d'événements enregistrée qu'on peut rejouer.
