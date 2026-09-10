
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
    serviceAnalyseUrl: process.env.SERVICE_ANALYSE_URL || 'http://localhost:5001/analyser',
    serviceAnalyseTimeoutMs: parseInt(process.env.SERVICE_ANALYSE_TIMEOUT_MS, 10) || 9000,

    seuilConfirmationScore: parseFloat(process.env.SEUIL_CONFIRMATION_SCORE) || 0.75,

    delaiVerificationRetardMs: parseInt(process.env.DELAI_VERIFICATION_RETARD_MS, 10) || 5 * 60 * 1000,
  };

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
