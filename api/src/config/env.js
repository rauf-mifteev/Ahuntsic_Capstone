/**
 * Point d'entrée unique pour lire la configuration de l'API.
 *
 * Règle du projet (exigence non fonctionnelle « Maintenance », Partie A
 * section 2.2.6) : le seuil du modèle, les délais et toute valeur qui
 * change selon l'environnement sont des paramètres, jamais des valeurs
 * écrites en dur dans le code. Ce module est le seul endroit qui lit
 * `process.env` ; le reste du code importe cet objet.
 */
const dotenv = require('dotenv');

dotenv.config();

const REQUIRED_IN_PRODUCTION = ['MONGODB_URI', 'JWT_SECRET'];

function readEnv() {
  const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    mongodbUri: process.env.MONGODB_URI || '',
    jwtSecret: process.env.JWT_SECRET || 'test-secret-do-not-use-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    corsOrigin: process.env.CORS_ORIGIN || '*',
  };

  // En production, on refuse de démarrer sans configuration complète plutôt
  // que de tomber en panne silencieusement plus tard (R-06 / R-08).
  if (env.nodeEnv === 'production') {
    const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(
        `Variables d'environnement manquantes en production : ${missing.join(', ')}`
      );
    }
  }

  return env;
}

module.exports = readEnv();
