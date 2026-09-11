# Répétition du scénario complet — PC-71

Ce document est le déroulé à suivre pour répéter la démonstration **avant**
la revue (AC de PC-69 : "juger si l'équipe maîtrise son système en cas de
problème" — ça se prépare, ça ne s'improvise pas). Répétez-le en entier au
moins une fois, tous ensemble, dans les conditions réelles de la revue
(même réseau, même téléphone, même ordinateur).

---

## 1. Vérifications avant de commencer (la veille, pas 5 minutes avant)

| # | Vérification | Comment |
|---|---|---|
| 1 | L'API répond | `curl https://pilulier-api.onrender.com/api/sante` → doit répondre `{"etat":"ok",...}` en moins de 2-3 secondes. **Render (palier gratuit) met en veille un service inactif** : si ça fait plus de 15 minutes que personne ne l'a appelée, le premier appel peut prendre 30-50 secondes. Faites CET appel curl environ 5 minutes avant de commencer la démo pour "réveiller" le service. |
| 2 | Le service d'analyse répond | `curl https://pilulier-analyse-images.onrender.com/sante` → même remarque sur la mise en veille. |
| 3 | MongoDB Atlas est accessible | Depuis le tableau de bord Atlas, vérifiez qu'aucune alerte n'est active et que l'adresse IP autorisée couvre "Allow access from anywhere" (0.0.0.0/0) — sinon Render ne pourra pas se connecter. |
| 4 | L'application mobile est à jour | `cd mobile && npm install && npm start` sur l'ordinateur qui fera la démo, avec `EXPO_PUBLIC_API_URL` pointant vers l'API déployée (pas `localhost`). |
| 5 | Expo Go est à jour sur le téléphone de démo | Ouvrez Expo Go, vérifiez qu'aucune mise à jour n'est en attente (voir aussi `CORRECTIF_SDK54.md` si un écart de version SDK réapparaît). |
| 6 | Le circuit Wokwi est prêt | `wokwi/src/main.cpp` : `URL_API_BASE` pointe vers l'API déployée (pas `localhost`), `IDENTIFIANT_DISPOSITIF` correspond à ce que vous associerez dans l'app. |
| 7 | Un compte de démonstration existe déjà | Créez-le la veille (voir section 2, étapes 2.1-2.4) : ça évite de taper un mot de passe devant la salle et de perdre du temps si l'inscription échoue pour une raison bête (courriel déjà pris par un essai précédent, etc.). |

---

## 2. Déroulé de la démonstration (~10 minutes)

Chaque étape indique quel critère d'acceptation elle démontre — utile pour
ne rien oublier ET pour répondre si on vous demande "où voit-on que...".

### 2.1 — Compte et connexion (F1)
1. Ouvrir l'app → écran de connexion.
2. Se connecter avec le compte de démo préparé la veille.
3. *Ce que ça montre :* l'authentification fonctionne, le mot de passe
   n'est jamais visible ni transmis en clair (mentionner le hachage
   bcrypt si on pose la question, sans avoir à le montrer à l'écran).

### 2.2 — Configuration (F2)
1. Tableau de bord → "Configurer mon traitement".
2. Montrer les 4 créneaux déjà remplis (ou en remplir un en direct pour
   montrer la validation du format d'heure).
3. "Mes médicaments" → montrer 2-3 médicaments déjà enregistrés, dont deux
   qui partagent le même créneau (pour illustrer RG-01 si demandé).

### 2.3 — Association du pilulier (F3, RG-09)
*(à sauter si déjà associé avant la démo pour gagner du temps — mentionner
que ça a été fait)*
1. "Associer mon pilulier" → entrer l'identifiant du circuit Wokwi.
2. Démarrer la simulation Wokwi *avant* si ce n'est pas déjà fait — la DEL
   bleue doit être allumée (Wi-Fi connecté) avant d'associer.
3. *Ce que ça montre :* le nombre de prises générées pour les 7 prochains
   jours (affiché après l'association).

### 2.4 — Remplissage hebdomadaire et photo de référence (F10, RG-13)
1. Dans l'app : "Confirmer le remplissage hebdomadaire" → "J'ai rempli mon
   pilulier".
2. Remplir le plateau simulé (une seule commande, à préparer d'avance) :
   ```bash
   curl -X POST $SERVICE_ANALYSE/simulation/remplir \
     -H "Content-Type: application/json" -d '{"dispositifId":"ESP32-DEMO-001"}'
   ```
3. Sur le circuit Wokwi : cliquer le bouton-poussoir (ouverture) puis le
   relâcher (fermeture) pour simuler la fermeture du couvercle qui
   déclenche la photo de référence.
4. L'app doit afficher "Tout est en ordre" (ou la liste des cases vides
   détectées, selon la stratégie de classification active côté service
   d'analyse — voir `analyse-images/README.md`, `MODELE_STRATEGIE`).

> **À dire à voix haute pendant la démo** : la photo n'est pas prise par
> un appareil, elle est dessinée par le service d'analyse à partir du
> plateau simulé (voir section 2.2 du guide du Sprint 2). Le classifieur,
> lui, est réel et peut se tromper. Mieux vaut l'annoncer que se le faire
> demander.

> **Astuce de démonstration** : pour ne pas avoir à attendre une vraie
> heure de prise, changez temporairement l'heure d'un créneau (section
> 2.2) pour dans 1-2 minutes, juste avant de commencer la démo. Le rappel
> local (section 2.6) et la prise elle-même arriveront pendant que vous
> parlez des autres écrans.

### 2.5 — Prise normale : ouverture, fermeture, verdict (F4, F9, RG-03, RG-06)
1. Sur Wokwi : cliquer le bouton (ouverture du couvercle).
2. Sur le tableau de bord de l'app : la prise du jour passe à "En cours"
   (badge ambre) — actualiser l'écran si besoin (tirer vers le bas ou
   revenir en arrière/avant).
3. Simuler la prise du comprimé dans la case concernée (le plateau simulé
   passe de pleine à vide — c'est ce que la photo montrera) :
   ```bash
   curl -X POST $SERVICE_ANALYSE/simulation/prendre \
     -H "Content-Type: application/json" -d '{"dispositifId":"ESP32-DEMO-001","indice":12}'
   ```
4. Relâcher le bouton (fermeture) → la photo est analysée.
4. Retourner sur le tableau de bord : le badge passe à "Confirmée" (vert)
   ou "À confirmer" (ambre, cas ambigu) selon la stratégie active.
   - Si "À confirmer" : ouvrir la prise, montrer les deux boutons "Oui,
     je l'ai pris" / "Non, pas pris" (RG-06 : la prise ne redevient
     jamais "manquée" toute seule après une confirmation manuelle).

### 2.6 — Rappel local (F9, PC-60/61)
1. Si l'astuce de la section 2.4 a été utilisée, une notification doit
   apparaître sur le téléphone à l'heure programmée.
2. Toucher la notification → l'app s'ouvre directement sur l'écran de
   résultat de cette prise précise (AC de PC-60).

### 2.7 — DEL (RG-12, PC-62)
1. Montrer la DEL du créneau concerné allumée sur le circuit Wokwi tant
   que la prise n'est pas réglée.
2. Confirmer la prise (dans l'app ou en fermant le couvercle) → la DEL
   s'éteint au plus tard 4 secondes après (fréquence de sondage du
   firmware, voir `wokwi/README.md`).

### 2.8 — Démonstration en direct et panne provoquée (F-démo, PC-69/70)
*C'est le moment le plus important de la revue — ne pas le bâcler.*
1. Ouvrir l'écran "Démonstration en direct" depuis le tableau de bord.
2. Cliquer le bouton Wokwi une ou deux fois → montrer les événements
   apparaître dans la liste en direct (moins de 3 secondes de délai).
3. Cliquer **"Couper la connexion"** dans l'app.
4. Expliquer AU CLIENT, dans des mots simples : *"Le pilulier ne peut plus
   envoyer d'informations à l'application. Rien n'est perdu : le circuit
   garde en mémoire ce qui se passe et le transmettra dès que la
   connexion reviendra."* (reprendre le texte affiché à l'écran, voir AC
   "sans jargon").
5. Cliquer le bouton Wokwi 2-3 fois pendant la coupure : dans le moniteur
   série de Wokwi, montrer les messages *"événement mis en mémoire
   tampon"*.
6. Cliquer **"Rétablir la connexion"** dans l'app.
7. Dans les ~5 secondes suivantes (prochaine tentative du firmware, voir
   `DELAI_ENTRE_TENTATIVES_MS`), montrer les événements accumulés
   apparaître d'un coup dans l'écran de démonstration.
8. *Ce que ça montre, explicitement à voix haute :* "aucun événement
   généré pendant la panne n'a été perdu" — c'est littéralement l'AC.

---

## 3. Ce qui peut mal tourner, et quoi faire

| Symptôme | Cause probable | Action |
|---|---|---|
| L'API met 30-50 secondes à répondre au premier appel | Mise en veille Render (palier gratuit) | Réveillez-la 5 min avant (section 1, point 1). Si ça arrive quand même en pleine démo, ne paniquez pas : dites-le simplement — "notre hébergement gratuit met le service en veille après inactivité, un appel normal prend moins d'une seconde une fois réveillé" — c'est un vrai sujet d'ingénierie, pas une honte à cacher. |
| "Project is incompatible with this version of Expo Go" | Écart de version SDK | Voir `CORRECTIF_SDK54.md`. Vérifiez la veille, pas le jour même. |
| Le circuit Wokwi ne se connecte pas au Wi-Fi simulé | Simulateur Wokwi démarré avant que la page soit complètement chargée | Rafraîchir la page wokwi.com et relancer la simulation. |
| L'événement envoyé par Wokwi renvoie 401 | Le pilulier n'a pas encore été associé à un compte, ou `IDENTIFIANT_DISPOSITIF` (firmware) ne correspond pas à ce qui a été saisi dans l'app | Vérifier les deux valeurs sont identiques, caractère pour caractère. |
| Aucune notification n'apparaît à l'heure prévue | Permission de notifications refusée sur le téléphone, ou app en arrière-plan depuis longtemps (iOS peut retarder) | Vérifier les réglages de notification du téléphone avant la démo ; préférer Android pour la démo si le problème persiste sur iOS. |
| Le verdict est toujours "ambigu" ou toujours "confirmé", jamais l'inverse | `MODELE_STRATEGIE=factice` avec un comportement fixe (voir `analyse-images/README.md`) | Pour la démo, régler `MODELE_STRATEGIE=seuillage` sur le service déployé — c'est le vrai classificateur, pas un simulateur, et il réagit vraiment à ce que "voit" la photo envoyée. |
| Chaque vérification affiche « analyse échouée » | L'API ne joint pas le service d'analyse : `SERVICE_ANALYSE_URL` ne se termine pas par `/analyser`, ou le service dormait | Sur Render, dans `pilulier-api` → Environment, vérifier que `SERVICE_ANALYSE_URL` vaut `https://pilulier-analyse-images.onrender.com/analyser`. Réveiller le service (`/sante`) puis refaire une fermeture. |
| La photo de référence ne semble jamais arriver (écran de remplissage bloqué sur "en attente") | Le couvercle n'a pas été fermé après avoir cliqué "J'ai rempli mon pilulier", ou le circuit est hors ligne | Vérifier l'état du circuit sur l'écran de démonstration avant de relancer l'étape 2.4. |

---

## 4. Répartition des rôles pendant la démo

Décidez-le à l'avance, pas en salle :

| Rôle | Qui | Fait quoi |
|---|---|---|
| Présentateur·rice principal·e | à définir | Parle, suit le script de la section 2 |
| Opérateur·rice Wokwi | à définir | Clique le bouton-poussoir au bon moment, surveille le moniteur série |
| Filet de sécurité | à définir | Ordinateur de secours avec l'app déjà ouverte et connectée, au cas où le téléphone de démo a un problème ; garde ce document ouvert pour rappeler l'ordre des étapes |

---

## 5. Checklist finale (à cocher pendant la répétition)

- [ ] Étape 2.1 — connexion réussie sans hésitation
- [ ] Étape 2.2 — écrans de configuration s'affichent correctement
- [ ] Étape 2.3 — association réussie, nombre de prises généré affiché
- [ ] Étape 2.4 — photo de référence prise, cases vides détectées (ou "tout en ordre")
- [ ] Étape 2.5 — verdict de prise affiché (confirmée ou ambiguë), boutons manuels fonctionnels si ambiguë
- [ ] Étape 2.6 — notification reçue et tap fonctionnel
- [ ] Étape 2.7 — DEL du créneau visible, s'éteint après confirmation
- [ ] Étape 2.8 — coupure ET rétablissement de connexion démontrés, événements tampon visibles après reconnexion
- [ ] Durée totale mesurée : \_\_\_\_ minutes (viser 10 minutes ou moins)
- [ ] Tout le monde dans l'équipe a vu la répétition complète au moins une fois
