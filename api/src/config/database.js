const mongoose = require('mongoose');
const env = require('./env');

/**
 * Connexion à MongoDB Atlas (PC-36).
 *
 * La chaîne de connexion vient uniquement de la variable d'environnement
 * MONGODB_URI (voir env.js) : aucune valeur n'est écrite ici. En test, on
 * n'appelle jamais cette fonction — les tests mockent les repositories, donc
 * aucune connexion réseau réelle n'est nécessaire pour que `npm test` passe.
 */
async function connectDatabase() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('disconnected', () => {
    // eslint-disable-next-line no-console
    console.warn('MongoDB : connexion perdue.');
  });

  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 10000,
  });

  // eslint-disable-next-line no-console
  console.log('MongoDB : connecté.');

  return mongoose.connection;
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
