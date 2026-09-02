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

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
