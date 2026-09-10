const ApiError = require('../utils/ApiError');
const dispositifRepository = require('../repositories/dispositifRepository');
const priseRepository = require('../repositories/priseRepository');

async function obtenirCommandesDel(identifiantDispositif, maintenant = new Date()) {
  const dispositif = await dispositifRepository.trouverParIdentifiant(identifiantDispositif);
  if (!dispositif) {
    throw ApiError.unauthorized('Dispositif inconnu ou non associé à un compte');
  }

  if (dispositif.modeDemoDeconnecte) {
    throw new ApiError(503, 'Dispositif temporairement injoignable (démonstration)');
  }

  const prisesActives = await priseRepository.trouverActivesPourDel(dispositif.id ?? dispositif._id, maintenant);

  const indexDEL = prisesActives
    .map((prise) => dispositif.compartiments.find((c) => c.indice === prise.compartimentIndice))
    .filter(Boolean)
    .map((compartiment) => compartiment.indexDEL);

  return { indexDEL };
}

module.exports = { obtenirCommandesDel };
