const createApp = require('./app');
const env = require('./config/env');
const { connectDatabase } = require('./config/database');


/**
 * Démarrage du processus : on se connecte d'abord à MongoDB Atlas, puis on
 * ouvre le port HTTP seulement si la connexion a réussi. Si la base n'est
 * pas joignable, on préfère un échec bruyant au démarrage (visible dans les
 * journaux de l'hébergeur) plutôt qu'une API qui répond mais qui échoue sur
 * chaque requête (R-06).
 */
async function start() {
  await connectDatabase();

  const app = createApp();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`API pilulier à l'écoute sur le port ${env.port} (${env.nodeEnv})`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Échec du démarrage de l'API :", err);
  process.exit(1);
});
