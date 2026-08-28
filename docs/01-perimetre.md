# Périmètre du projet

Ce qu'on livre, ce qu'on ne livre pas, et pourquoi. Cette section est aussi la section 2.1.3 du [cahier des charges](03-cahier-des-charges.md).

On simule l'objet intelligent

L'objet intelligent reste simulé pendant tout le projet. On n'achète aucune pièce.

L'interrupteur du couvercle et le microcontrôleur ESP32 sont simulés sur Wokwi. Le circuit est virtuel, mais son code est réel et il envoie de vraies requêtes vers notre API en ligne. Pour la caméra et l'éclairage, on utilise le téléphone et un montage simple : le plateau sur une plaque transparente, une lampe au-dessus, le téléphone en dessous. Les photos ressemblent à celles du vrai boîtier et le logiciel est le même.

Ça nous évite les délais de livraison, la soudure, le réglage des composants et le risque qu'une pièce brise la veille d'une démonstration. Quatre séances sur cinq se font à distance, alors un boîtier unique serait difficile à faire circuler. On ne perd aucune compétence : analyse, modélisation, architecture, développement, base de données, tests et déploiement se font pareil. Le budget matériel est nul.

**Ce qui est inclus**
L'application mobile : compte, configuration, rappels, résultats, historique, adhérence. L'API et la base de données en ligne. Le circuit ESP32 simulé sur Wokwi. Le modèle qui classe les 28 cases en vide ou non vide. Le guidage lumineux. La détection des prises par comparaison de photos. Le statut « ambigu » que le patient peut régler. La confirmation du remplissage hebdomadaire, qui établit la photo de référence. Un écran de démonstration avec panne provoquée. Le dépôt de code, l'intégration continue, l'environnement en ligne et le carnet de produit.

**Ce qui est exclu**
Le matériel physique, pour les raisons ci-dessus.

Le partage du suivi avec un proche. Ça voudrait dire un deuxième type d'utilisateur, une deuxième série d'écrans et une gestion de permissions. Trop de travail, et ça n'aide pas à démontrer la dimension intelligente. Le modèle de données garde la place pour l'ajouter plus tard.

Plusieurs boîtiers par compte, l'adhérence médicament par médicament, et la traduction. On manque de temps et rien de ça ne sert à la démonstration.

Le moteur qui distribue les comprimés. C'est le coût qu'on veut éviter chez les concurrents.

La reconnaissance du type de pilule. Problème de vision difficile et peu fiable : les médicaments ont des milliers d'apparences, et un générique change de forme d'un renouvellement à l'autre. Aucun produit sur le marché ne le fait.

La confirmation que le médicament a été avalé. On ne peut pas le prouver et ce serait risqué sur le plan légal.

Le lien avec un dossier médical ou une pharmacie. Le mode hors ligne complet, la version web et la version bureau. Le paiement.

**Ce que le produit ne fait pas**
Il vérifie que la bonne case a été vidée au bon moment. Il ne vérifie pas ce qu'il y a dedans, parce que ça dépend du remplissage. Si le mauvais comprimé a été mis dans une case, le système va le voir sortir et confirmer la prise. C'est comme ça pour tous les piluliers hebdomadaires : c'est au remplissage qu'on s'assure que tout est correct.
