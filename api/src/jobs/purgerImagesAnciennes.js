const verificationRepository = require('../repositories/verificationRepository');

const NOMBRE_JOURS_CONSERVATION_IMAGE = 30;

async function purgerImagesAnciennes(maintenant = new Date()) {
  const dateLimite = new Date(maintenant);
  dateLimite.setDate(dateLimite.getDate() - NOMBRE_JOURS_CONSERVATION_IMAGE);

  const verificationsAPurger = await verificationRepository.listerImagesAPurger(dateLimite);

  for (const verification of verificationsAPurger) {
    verification.image = null;
    // eslint-disable-next-line no-await-in-loop -- volume attendu faible (une purge quotidienne)
    await verificationRepository.sauvegarder(verification);
  }

  return verificationsAPurger.length;
}

module.exports = { purgerImagesAnciennes, NOMBRE_JOURS_CONSERVATION_IMAGE };
