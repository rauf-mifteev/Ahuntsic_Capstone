# Installer et faire tourner le projet chez soi

Guide pour Rauf et Chahrazad. Écrit pas à pas, sans rien supposer d'acquis.
Comptez **45 minutes** la première fois, dont beaucoup d'attente pendant les
téléchargements.

Pour la démonstration, l'API et le service d'analyse sont déployés sur Render :
`https://pilulier-api.onrender.com` et
`https://pilulier-analyse-images.onrender.com`. Ce guide explique comment faire
tourner **votre propre copie en local**, pour développer et tester sans toucher
à la version en ligne.

---

## Étape 0 — Ce qu'il faut installer avant

| Outil | Version | Vérifier avec |
|---|---|---|
| Node.js | 18 ou plus | `node --version` |
| Python | 3.10 ou plus | `python --version` |
| Git | n'importe laquelle | `git --version` |

Si `python` ouvre le Microsoft Store, c'est qu'il n'est pas installé.
Prenez-le sur python.org en **cochant « Add python.exe to PATH »**. Si ça ne
marche toujours pas, utilisez `py` au lieu de `python` partout.

**Sur votre téléphone** : installez **Expo Go en version SDK 54**.
Celui du Play Store ne marchera pas — il est en SDK 57 et refusera le projet.

Android : https://expo.dev/go?sdkVersion=54&platform=android&device=true

**Faites-le maintenant**, pas le jour de la démonstration.

---

## Étape 1 — Le service d'analyse d'images

C'est la partie la plus rapide et elle ne dépend de rien d'autre.

```powershell
cd analyse-images
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt -r requirements-dev.txt
python -m pytest tests/ -q
```

Attendu : **45 passed**.

> **Si PowerShell dit « l'exécution de scripts est désactivée »** :
> ```powershell
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
> ```
> puis recommencez l'activation. Ça ne vaut que pour cette fenêtre.

Le nom `(.venv)` doit apparaître au début de votre invite de commande.

Lancez ensuite le service :

```powershell
$env:MODELE_STRATEGIE = "seuillage"
python app.py
```

Attendu : `Uvicorn running on http://0.0.0.0:5001`.
**Laissez cette fenêtre ouverte.**

Ouvrez http://localhost:5001/docs dans un navigateur : vous devez voir la
documentation interactive du service.

---

## Étape 2 — La base de données

Le projet a besoin de MongoDB. **Demandez à Rauf la ligne `MONGODB_URI`** de
son fichier `api/.env` — c'est le plus simple, et vous verrez les mêmes
données que le reste de l'équipe.

Si vous préférez votre propre base : créez un compte gratuit sur MongoDB
Atlas, un cluster M0, un utilisateur avec le rôle *Read and write to any
database*, et autorisez votre adresse IP dans **Network Access**. Le projet
créera ses collections tout seul.

Puis, dans `api/`, copiez `.env.example` en `.env` et remplissez :

```
PORT=3000
MONGODB_URI=<la chaîne de connexion>
JWT_SECRET=<une valeur aléatoire>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
SERVICE_ANALYSE_URL=http://localhost:5001/analyser
SERVICE_ANALYSE_TIMEOUT_MS=9000
SEUIL_CONFIRMATION_SCORE=0.75
DELAI_VERIFICATION_RETARD_MS=300000
```

Pour générer le secret :
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> Le fichier `.env` ne doit **jamais** être committé. Il est déjà dans le
> `.gitignore`, ainsi que toutes ses variantes.

---

## Étape 3 — L'API

Dans une **deuxième** fenêtre :

```powershell
cd api
npm install
npm test
npm start
```

`npm test` doit afficher **174 passed**. Ces tests n'utilisent pas la base de
données, ils marchent même sans MongoDB.

`npm start` doit démarrer sur le port 3000. Vérifiez dans une autre fenêtre :
```powershell
curl.exe http://localhost:3000/api/sante
```

---

## Étape 4 — L'application sur votre téléphone

**Votre téléphone et votre ordinateur doivent être sur le même Wi-Fi.**

Trouvez l'adresse de votre PC :
```powershell
ipconfig
```
Cherchez « Adresse IPv4 » de votre carte Wi-Fi — quelque chose comme
`192.168.1.42` ou `10.0.0.87`.

Créez `mobile/.env` :
```
EXPO_PUBLIC_API_URL=http://<votre-ip>:3000/api
```

**N'écrivez pas `localhost`.** Pour votre téléphone, `localhost` désigne le
téléphone lui-même.

Puis, dans une **troisième** fenêtre :
```powershell
cd mobile
npm install
npx expo start
```

Scannez le code QR avec Expo Go.

> **Si l'application ne joint pas l'API** : c'est presque toujours le
> pare-feu Windows qui bloque le port 3000. Deux solutions.
>
> La simple, qui contourne tout :
> ```powershell
> npx expo start --tunnel
> ```
> Plus lent, mais traverse n'importe quel réseau.
>
> Ou ouvrez le port, dans une fenêtre **administrateur** :
> ```powershell
> New-NetFirewallRule -DisplayName "Pilulier API" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
> ```

---

## Étape 5 — Le circuit Wokwi

À faire seulement si vous voulez la chaîne complète. Les étapes 1 à 4
suffisent pour utiliser l'application.

**La contrainte à comprendre d'abord** : le circuit tourne sur les serveurs de
Wokwi. Il ne peut joindre ni `localhost`, ni votre adresse locale. Il lui faut
une **adresse publique**.

**5a. Ouvrir un tunnel** vers votre API, dans une quatrième fenêtre :
```powershell
npx localtunnel --port 3000
```
Notez l'adresse `https://...` affichée et vérifiez-la :
```powershell
curl.exe https://<adresse-du-tunnel>/api/sante
```

**5b. Configurer le circuit.** Copiez `wokwi/src/config_locale.h.example` en
`wokwi/src/config_locale.h` et remplissez :
```c
#define URL_API_BASE "https://<adresse-du-tunnel>/api"
#define IDENTIFIANT_DISPOSITIF "ESP32-DEMO-001"
```

L'identifiant doit correspondre à un pilulier **déjà associé** à un compte
depuis l'application, sinon l'API répondra 401.

**5c. Installer PlatformIO et compiler :**
```powershell
pip install platformio
cd wokwi
pio run
```
La première compilation prend une dizaine de minutes (téléchargement des
outils ESP32). Les suivantes, une minute.

**5d. Lancer la simulation** avec l'extension VS Code **Wokwi Simulator**.
Elle peut demander de créer un compte gratuit.

Dans le moniteur série, vous devez voir la connexion Wi-Fi, la
synchronisation de l'heure, puis `POST /evenements -> code 201` à chaque clic
sur le bouton.

> **L'adresse du tunnel change à chaque redémarrage.** Il faut alors modifier
> `config_locale.h` **et recompiler**.
>
> **Wokwi gratuit refuse parfois la connexion** (`transport closed 1006`).
> Attendez deux minutes, ne relancez pas en boucle.

---

## Étape 6 — Essayer le scénario complet

L'ordre compte. Sans photo de référence, aucune prise ne peut se confirmer.

1. **Créer un compte** dans l'application et se connecter.
2. **Régler les créneaux** et **ajouter un médicament**.
3. **Associer le pilulier** `ESP32-DEMO-001` (ou votre propre identifiant).
4. **Confirmer le remplissage** : remplissez le plateau simulé, puis fermez le
   couvercle sur Wokwi. Ça crée la **photo de référence**.
   ```powershell
   curl.exe -X POST http://localhost:5001/simulation/remplir -H "Content-Type: application/json" -d '{\"dispositifId\":\"ESP32-DEMO-001\"}'
   ```
5. **Simuler une prise** : videz une case, puis refermez le couvercle.
   ```powershell
   curl.exe -X POST http://localhost:5001/simulation/prendre -H "Content-Type: application/json" -d '{\"dispositifId\":\"ESP32-DEMO-001\",\"indice\":12}'
   ```
   L'application doit afficher le résultat.
6. **Voir le rappel** : avancez l'heure d'un créneau à dans deux minutes.
7. **Provoquer une panne** depuis l'écran de démonstration, cliquer plusieurs
   fois sur le bouton Wokwi (**lentement, 6 secondes entre deux clics**),
   rétablir, et vérifier que tout est renvoyé sans perte.

---

## Récapitulatif des fenêtres à garder ouvertes

| Fenêtre | Dossier | Commande |
|---|---|---|
| 1 | `analyse-images` | `python app.py` |
| 2 | `api` | `npm start` |
| 3 | `mobile` | `npx expo start` |
| 4 | n'importe où | `npx localtunnel --port 3000` (Wokwi seulement) |

Toujours démarrer le service d'analyse **avant** l'API.

---

## Si ça ne marche pas

| Symptôme | Cause la plus probable |
|---|---|
| `ModuleNotFoundError` en Python | l'environnement virtuel n'est pas activé — cherchez `(.venv)` |
| Expo Go refuse le projet | mauvaise version d'Expo Go, il faut le SDK 54 |
| L'app ne joint pas l'API | `localhost` dans `mobile/.env`, ou pare-feu — essayez `--tunnel` |
| Connexion MongoDB en timeout | votre IP n'est pas autorisée dans **Network Access** |
| Le circuit reçoit 401 | l'identifiant n'est associé à aucun compte |
| Le circuit n'atteint pas l'API | le tunnel est fermé, ou son adresse a changé |
| Toujours le même verdict | `MODELE_STRATEGIE` est sur `factice`, passez à `seuillage` |
| Aucune prise ne se confirme | le remplissage hebdomadaire n'a jamais été confirmé |
