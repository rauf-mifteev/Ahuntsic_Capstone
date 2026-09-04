const ApiError = require('../utils/ApiError');
const dispositifRepository = require('../repositories/dispositifRepository');
const evenementRepository = require('../repositories/evenementRepository');

const TYPES_VALIDES = ['OUVERTURE', 'FERMETURE'];

/**
 * F4 — recevoir les ouvertures/fermetures du couvercle envoyées par le
 * circuit (PC-40/41/42/43).
 *
 * Sécurité (AC de PC-42, "un pilulier inconnu est rejeté") : ce point
 * d'entrée n'est PAS protégé par un jeton utilisateur — le circuit n'a
 * jamais de compte ni de mot de passe. C'est `identifiantDispositif`
 * lui-même qui joue le rôle d'identifiant : s'il ne correspond à AUCUN
 * dispositif déjà associé (POST /dispositifs/associer, PC-38), l'API
 * refuse l'événement plutôt que de l'accepter à l'aveugle.
 *
 * Amélioration documentée pour un sprint futur : remplacer
 * `identifiantDispositif` par un jeton d'appareil signé (émis lors de
 * l'association) pour empêcher qu'un tiers connaissant seulement
 * l'identifiant n'envoie de faux événements.
 */
async function enregistrerEvenement({ identifiantDispositif, type, horodatage }) {
  if (!identifiantDispositif) {
    throw ApiError.badRequest("L'identifiant du dispositif est requis");
  }
  if (!TYPES_VALIDES.includes(type)) {
    throw ApiError.badRequest(`Type d'événement invalide : ${type}`);
  }

  const dispositif = await dispositifRepository.trouverParIdentifiant(identifiantDispositif);
  if (!dispositif) {
    // Pilulier inconnu : ni essayé de deviner un compte, ni créé de dispositif fantôme.
    throw ApiError.unauthorized('Dispositif inconnu ou non associé à un compte');
  }

  const horodatageEvenement = horodatage ? new Date(horodatage) : new Date();
  if (Number.isNaN(horodatageEvenement.getTime())) {
    throw ApiError.badRequest('Horodatage invalide');
  }

  const evenement = await evenementRepository.creer({
    dispositif: dispositif.id ?? dispositif._id,
    identifiantDispositif,
    type,
    horodatage: horodatageEvenement,
  });

  // Le fait même de recevoir un événement prouve que le dispositif est en
  // ligne : on met à jour son état plutôt que d'attendre un signal séparé.
  dispositif.etatConnexion = 'CONNECTE';
  dispositif.dernierContact = new Date();
  await dispositifRepository.sauvegarder(dispositif);

  return evenement;
}

module.exports = { enregistrerEvenement };
