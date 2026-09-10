const verificationRepository = require('../repositories/verificationRepository');
const comparaisonPlateauRepository = require('../repositories/comparaisonPlateauRepository');

function comparerZones(etatsZonesPrecedentes, etatsZonesActuelles) {
  const precedentesParIndice = new Map(etatsZonesPrecedentes.map((z) => [z.indice, z]));
  const compartimentsVides = [];

  for (const zoneActuelle of etatsZonesActuelles) {
    const zonePrecedente = precedentesParIndice.get(zoneActuelle.indice);
    if (zonePrecedente && zonePrecedente.occupee === true && zoneActuelle.occupee === false) {
      compartimentsVides.push(zoneActuelle.indice);
    }
  }

  return compartimentsVides.sort((a, b) => a - b);
}

async function comparerEtEnregistrer(dispositifId, verificationActuelle) {
  const verificationReference = await verificationRepository.trouverDerniereReference(dispositifId);

  if (!verificationReference) {
    return null;
  }

  const compartimentsVides = comparerZones(verificationReference.etatsZones, verificationActuelle.etatsZones);

  return comparaisonPlateauRepository.creer({
    dispositif: dispositifId,
    verificationReference: verificationReference.id ?? verificationReference._id,
    verificationActuelle: verificationActuelle.id ?? verificationActuelle._id,
    moment: verificationActuelle.moment,
    compartimentsVides,
  });
}

module.exports = { comparerZones, comparerEtEnregistrer };
