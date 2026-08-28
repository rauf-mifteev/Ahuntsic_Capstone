# Dimension intelligente

## 3.1 Notre proposition

Notre dimension intelligente a deux parties : un objet connecté qui capte quelque chose du monde réel, et un modèle qui traite ce qu'il capte.

Un interrupteur sur le couvercle détecte l'ouverture, en simulation. Le microcontrôleur est un ESP32, simulé sur Wokwi. Il envoie de vraies requêtes HTTP vers l'API en ligne. Vingt-huit DEL éclairent pour la photo et guident le patient. Une seule caméra grand angle est placée sous le plateau. Le modèle classe chacune des 28 zones de l'image en vide ou non vide.

On utilise MobileNetV3-Small, un modèle déjà entraîné sur ImageNet, dont on réentraîne seulement les dernières couches. Il compte environ 2,5 millions de paramètres, fonctionne sans carte graphique et analyse les 28 zones en moins d'une seconde. Une seule photo donne 28 exemples étiquetés, alors une trentaine de photos suffisent.

En parallèle, on écrit une version simple par seuillage avec OpenCV. Elle nous sert de point de comparaison chiffré et de solution de secours.

## 3.2 Réponses aux quatre questions du client

Est-ce que ça apporte une capacité que le produit n'aurait pas autrement ?

Oui. Le modèle n'est pas ajouté par-dessus un capteur : il est le capteur. Le boîtier n'a aucun capteur dans les cases. Sans analyse d'image, le système saurait seulement que le couvercle a été ouvert. Il ne pourrait pas dire quelle case a été vidée, ni faire la différence entre une ouverture sans prise et une vraie prise, ni voir qu'il reste un comprimé.

Est-ce que ça change quelque chose pour l'utilisateur ?

Oui. L'adhérence est calculée sur des prises vérifiées, pas sur des ouvertures. C'est la différence entre un chiffre auquel on peut se fier et un chiffre décoratif. Les trois résultats possibles mènent à trois comportements différents dans l'application. Le guidage lumineux, contrôlé par la même logique, demande moins d'effort au patient.

Est-ce réalisable en trois sprints ?

Oui, grâce à quatre décisions. La simulation enlève le risque matériel. Le problème est réduit à « vide ou non vide » sur des zones fixes, au lieu de reconnaître des pilules. On choisit un seul modèle d'avance. Et l'éclairage par en dessous transforme la tâche en lecture de formes noires sur fond blanc, toujours dans les mêmes conditions. C'est bien plus simple à apprendre qu'une reconnaissance en lumière variable.

Que se passe-t-il si ça tombe en panne ou si ça se trompe ?

Quatre cas sont prévus. Si le score est trop bas, le système affiche « ambigu » et demande une vérification : il ne tranche jamais. Le patient confirme lui-même et on garde la trace que c'était manuel. Si le service d'analyse ne répond pas, l'ouverture est enregistrée sans vérification et l'application continue de fonctionner. Si le boîtier perd la connexion, le système le détecte, prévient le patient et propose la confirmation manuelle. Si la caméra ou le modèle ne fonctionnent plus, l'interrupteur sait quand même qu'on a ouvert le couvercle, et l'application le dit clairement.

## 3.3 Acceptation par le client


