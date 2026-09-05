const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

/**
 * Construit l'application Express, sans se connecter à MongoDB ni écouter
 * sur un port : c'est le rôle de server.js. Séparer les deux permet aux
 * tests (supertest) d'importer `app` directement, sans ouvrir de vraie
 * connexion réseau ni de vraie base de données.
 */
function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: '5mb' })); // 5mb : marge pour les photos du plateau (sprint 2)

  // express.json() ne s'exécute que si Content-Type: application/json est
  // envoyé ; sinon req.body reste `undefined` (pas `{}`). Sans ce filet, un
  // contrôleur qui déstructure req.body (ex. `const { courriel } = req.body`)
  // plante avec une erreur 500 générique et peu utile face à une requête mal
  // formée (en-tête manquant, corps vide) plutôt que de répondre 400 proprement.
  app.use((req, res, next) => {
    if (!req.body) req.body = {};
    next();
  });

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
