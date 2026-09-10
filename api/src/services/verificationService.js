const ApiError = require('../utils/ApiError');
const dispositifRepository = require('../repositories/dispositifRepository');
const verificationRepository = require('../repositories/verificationRepository');

async function obtenirDerniereReferencePourUtilisateur(utilisateurId) {
  const dispositif = await dispositifRepository.trouverParUtilisateur(utilisateurId);
  if (!dispositif) {
    throw ApiError.notFound('Aucun dispositif pour ce compte');
  }

  const verification = await verificationRepository.trouverDerniereReference(dispositif.id ?? dispositif._id);
  if (!verification) {
    throw ApiError.notFound('Aucune photo de référence pour ce dispositif pour le moment');
  }

  return verification;
}

module.exports = { obtenirDerniereReferencePourUtilisateur };
