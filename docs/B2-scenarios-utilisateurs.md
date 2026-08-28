# Scénarios d'utilisateurs

Six parcours, du point de vue du patient. Ils montrent comment les cas d'utilisation s'enchaînent. Voir [B1 · Diagramme de cas d'utilisation](B1-cas-utilisation.md).

### 1. Première configuration

1. Hélène crée son compte.
2. Elle donne une heure à ses créneaux : 8 h le matin, 20 h le soir.
3. Elle enregistre deux médicaments et les place dans les bons créneaux.
4. Elle entre l'identifiant de son pilulier.
5. Elle remplit son plateau et le confirme dans l'application.
6. Le boîtier prend la photo de référence. La grille de la semaine s'affiche.

### 2. Remplissage de la semaine

1. Hélène remplit son plateau le dimanche soir.
2. Elle confirme le remplissage dans l'application.
3. Le boîtier photographie le plateau, DEL allumées.
4. La photo devient la nouvelle référence.
5. Le système remarque que la case du jeudi soir est vide alors qu'elle devrait contenir un comprimé. Il prévient Hélène tout de suite.

### 3. Prise normale

1. À 8 h, la DEL du lundi matin s'allume et la notification arrive.
2. Hélène ouvre le couvercle, prend son comprimé, referme.
3. La fermeture déclenche la photo.
4. Le modèle voit que la case est passée de pleine à vide.
5. La prise est confirmée, la DEL s'éteint, la prise apparaît dans l'historique.

### 4. Prise ambiguë

1. Étapes 1 à 3 identiques.
2. Le score du modèle est sous le seuil. Peut-être un résidu au fond de la case.
3. Le système affiche « ambigu » et demande à Hélène de confirmer.
4. Elle confirme. La prise passe à « confirmée », et l'historique garde la trace que c'était manuel.

### 5. Prise manquée

1. À 20 h, la DEL s'allume et la notification arrive.
2. Personne n'ouvre le couvercle.
3. Après le délai, la tâche planifiée marque la prise comme manquée.
4. Une alerte apparaît et la DEL s'éteint. La prise compte comme non confirmée dans l'adhérence.

### 6. Panne du circuit

1. Le circuit perd sa connexion, ou on provoque la panne depuis l'écran de démonstration.
2. Aucun événement n'arrive au serveur.
3. Le système détecte l'absence de signal et prévient Hélène.
4. Elle peut confirmer ses prises à la main pendant ce temps.
5. Au rétablissement, le boîtier renvoie ce qu'il avait gardé en mémoire, avec l'heure d'origine.
