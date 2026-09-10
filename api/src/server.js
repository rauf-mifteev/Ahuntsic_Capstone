const createApp = require('./app');
const env = require('./config/env');
const { connectDatabase } = require('./config/database');
const { purgerImagesAnciennes } = require('./jobs/purgerImagesAnciennes');
const priseService = require('./services/priseService');

const UNE_JOURNEE_MS = 24 * 60 * 60 * 1000;

async function start() {
  await connectDatabase();

  const app = createApp();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`API pilulier à l'écoute sur le port ${env.port} (${env.nodeEnv})`);
  });

  purgerImagesAnciennes().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Échec de la purge des images au démarrage :', err);
  });
  setInterval(() => {
    purgerImagesAnciennes().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Échec de la purge périodique des images :', err);
    });
  }, UNE_JOURNEE_MS);

  priseService.marquerEnRetardCommeManquees().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Échec de la vérification des prises en retard au démarrage :', err);
  });
  setInterval(() => {
    priseService.marquerEnRetardCommeManquees().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Échec de la vérification périodique des prises en retard :', err);
    });
  }, env.delaiVerificationRetardMs);
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Échec du démarrage de l'API :", err);
  process.exit(1);
});
