const dispositifService = require('./dispositifService');
const dispositifRepository = require('../repositories/dispositifRepository');
const evenementRepository = require('../repositories/evenementRepository');
const verificationRepository = require('../repositories/verificationRepository');

const LIMITE_PAR_DEFAUT = 20;

async function obtenirEvenementsRecents(utilisateurId, limite = LIMITE_PAR_DEFAUT) {
  const dispositif = await dispositifService.obtenirParUtilisateur(utilisateurId);
  const evenements = await evenementRepository.listerParDispositif(dispositif.id ?? dispositif._id, limite);

  const evenementsEnrichis = [];
  for (const evenement of evenements) {
    let verification = null;
    if (evenement.type === 'FERMETURE') {
      // eslint-disable-next-line no-await-in-loop -- volume borné par `limite` (20 par défaut)
      verification = await verificationRepository.trouverParEvenement(evenement.id ?? evenement._id);
    }
    evenementsEnrichis.push({
      id: evenement.id ?? evenement._id,
      type: evenement.type,
      horodatage: evenement.horodatage,
      verification: verification
        ? {
            estReference: verification.estReference,
            analyseEchouee: verification.analyseEchouee,
            strategieUtilisee: verification.strategieUtilisee,
            nombreZonesAnalysees: verification.etatsZones.length,
          }
        : null,
    });
  }

  return { dispositif, evenements: evenementsEnrichis };
}

async function basculerConnexion(utilisateurId, actif) {
  const dispositif = await dispositifService.obtenirParUtilisateur(utilisateurId);
  dispositif.modeDemoDeconnecte = actif;
  if (actif) {

    dispositif.etatConnexion = 'HORS_LIGNE';
  }
  await dispositifRepository.sauvegarder(dispositif);
  return dispositif;
}

module.exports = { obtenirEvenementsRecents, basculerConnexion };
