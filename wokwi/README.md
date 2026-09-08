# Circuit simulé (Wokwi) — PC-43

Ce package correspond au même contenu que celui de PC-41 (les deux zips
sont désormais identiques en fait, puisque le firmware final regroupe
directement les fonctionnalités de PC-41 et PC-43 dans un seul
`main.cpp`) : bouton-poussoir, DEL réseau, 4 DEL de créneaux, moniteur
série, mémoire tampon hors-ligne, `config_locale.h`, et plateforme
épinglée.

Si vous avez déjà extrait le zip de PC-41, **vous n'avez rien de plus à
faire pour PC-43** — la mémoire tampon hors-ligne y est déjà incluse.

Voir le `README.md` du package PC-41 pour le détail complet (configuration
locale, ouverture de la simulation, utilisation, problèmes déjà corrigés).

## Tester spécifiquement la mémoire tampon (PC-43)

1. Modifier temporairement `URL_API_BASE` (dans `config_locale.h`) vers
   une adresse invalide, ou couper le Wi-Fi virtuel dans le simulateur.
2. Recompiler (`pio run`) et relancer la simulation.
3. Cliquer plusieurs fois sur le bouton-poussoir.
4. Le moniteur série doit afficher :
   `Événement mis en mémoire tampon (n en attente).`
5. Remettre la bonne URL, recompiler, relancer.
6. Le moniteur série doit afficher :
   `Tampon vidé avec succès (n événement(s) renvoyés).`

## Remarque — cold start Render

Si votre API tourne sur le plan gratuit de Render, les tout premiers
événements après une période d'inactivité peuvent échouer avec un code
négatif (ex. `-11`, le temps que le service se réveille). C'est justement
ce que le tampon absorbe : ces événements sont mis en attente puis
renvoyés automatiquement, sans être perdus.
