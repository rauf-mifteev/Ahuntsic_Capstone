const ApiError = require('../utils/ApiError');
const dispositifRepository = require('../repositories/dispositifRepository');
const evenementRepository = require('../repositories/evenementRepository');
const verificationRepository = require('../repositories/verificationRepository');
const comparaisonService = require('./comparaisonService');
const comparaisonPlateauService = require('./comparaisonPlateauService');
const priseService = require('./priseService');

const TYPES_VALIDES = ['OUVERTURE', 'FERMETURE'];

async function enregistrerEvenement({ identifiantDispositif, type, horodatage, image }) {
  if (!identifiantDispositif) {
    throw ApiError.badRequest("L'identifiant du dispositif est requis");
  }
  if (!TYPES_VALIDES.includes(type)) {
    throw ApiError.badRequest(`Type d'événement invalide : ${type}`);
  }

  const dispositif = await dispositifRepository.trouverParIdentifiant(identifiantDispositif);
  if (!dispositif) {

    throw ApiError.unauthorized('Dispositif inconnu ou non associé à un compte');
  }

  if (dispositif.modeDemoDeconnecte) {
    throw new ApiError(503, 'Dispositif temporairement injoignable (démonstration)');
  }

  const horodatageEvenement = horodatage ? new Date(horodatage) : new Date();
  if (Number.isNaN(horodatageEvenement.getTime())) {
    throw ApiError.badRequest('Horodatage invalide');
  }

  const dispositifId = dispositif.id ?? dispositif._id;

  const evenement = await evenementRepository.creer({
    dispositif: dispositifId,
    identifiantDispositif,
    type,
    horodatage: horodatageEvenement,
  });

  dispositif.etatConnexion = 'CONNECTE';
  dispositif.dernierContact = new Date();
  await dispositifRepository.sauvegarder(dispositif);

  let verification = null;
  if (type === 'OUVERTURE') {

    await priseService.demarrerVerificationsPourOuverture(dispositifId, horodatageEvenement);
  } else if (type === 'FERMETURE') {
    verification = await declencherVerification({ dispositif, identifiantDispositif, evenement, image, horodatageEvenement });
  }

  return { evenement, verification };
}

async function declencherVerification({ dispositif, identifiantDispositif, evenement, image, horodatageEvenement }) {
  const dispositifId = dispositif.id ?? dispositif._id;

  const estReference = dispositif.prochaineFermetureEstReference === true;

  const verification = await verificationRepository.creer({
    dispositif: dispositifId,
    evenementOuverture: evenement.id ?? evenement._id,
    image: image || null,
    moment: horodatageEvenement,
    estReference,
    etatsZones: [],
    photoSimulee: !image,
    analyseEchouee: false,
  });

  try {

    const resultat = image
      ? await comparaisonService.analyserImage(image)
      : await comparaisonService.analyserPlateauSimule(identifiantDispositif);
    verification.etatsZones = resultat.resultats.map((r) => ({
      indice: r.indice,
      occupee: r.occupee,
      score: r.score,
    }));
    verification.strategieUtilisee = resultat.strategie;

    if (!image && resultat.image) {
      verification.image = resultat.image;
    }
    await verificationRepository.sauvegarder(verification);

    if (estReference) {

      dispositif.prochaineFermetureEstReference = false;
      await dispositifRepository.sauvegarder(dispositif);
      return verification;
    }

    const comparaison = await comparaisonPlateauService.comparerEtEnregistrer(dispositifId, verification);

    if (comparaison && comparaison.compartimentsVides.length > 0) {
      await priseService.reglerDepuisComparaison(dispositifId, comparaison.compartimentsVides, verification);
    }

    return verification;
  } catch (err) {

    verification.analyseEchouee = true;
    // eslint-disable-next-line no-console
    console.warn("Service d'analyse indisponible, fermeture enregistrée sans vérification :", err.message);
    await verificationRepository.sauvegarder(verification);
    return verification;
  }
}

module.exports = { enregistrerEvenement };
