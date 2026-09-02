const createApp = require('./app');
const env = require('./config/env');

// NOTE (Sprint 1, PC-35) : à ce stade l'API ne fait qu'écouter sur le port
// configuré, pour que l'intégration continue et le premier déploiement aient
// quelque chose à valider. La connexion à MongoDB Atlas est ajoutée dans
// PC-36 (mise en service de la base de données et sortie de la
// configuration hors du code).
const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API pilulier à l'écoute sur le port ${env.port} (${env.nodeEnv})`);
});
