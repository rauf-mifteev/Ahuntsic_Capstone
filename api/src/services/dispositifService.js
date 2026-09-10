const ApiError = require('../utils/ApiError');
const dispositifRepository = require('../repositories/dispositifRepository');
const utilisateurRepository = require('../repositories/utilisateurRepository');
const priseService = require('./priseService');
const { FUSEAU_PAR_DEFAUT } = require('../models/Utilisateur');

const REGEX_HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

async function creerParDefaut(utilisateurId) {
  return dispositifRepository.creerParDefaut(utilisateurId);
}

async function fuseauHorairePour(utilisateurId) {
  try {
    const utilisateur = await utilisateurRepository.trouverParId(utilisateurId);
    return utilisateur?.fuseauHoraire || FUSEAU_PAR_DEFAUT;
  } catch {
    return FUSEAU_PAR_DEFAUT;
  }
}

async function obtenirParUtilisateur(utilisateurId) {
  const dispositif = await dispositifRepository.trouverParUtilisateur(utilisateurId);
  if (!dispositif) {
    throw ApiError.notFound('Aucun dispositif pour ce compte');
  }
  return dispositif;
}

async function mettreAJourPlagesHoraires(utilisateurId, plages) {
  if (!Array.isArray(plages) || plages.length !== 4) {
    throw ApiError.badRequest('Les 4 créneaux doivent être fournis (RG-10)');
  }

  const dispositif = await obtenirParUtilisateur(utilisateurId);

  for (const plage of plages) {
    if (![1, 2, 3, 4].includes(plage.creneau)) {
      throw ApiError.badRequest(`Créneau invalide : ${plage.creneau}`);
    }
    if (plage.heure !== null && plage.heure !== undefined && !REGEX_HEURE.test(plage.heure)) {
      throw ApiError.badRequest(`Heure invalide pour le créneau ${plage.creneau} (format HH:mm attendu)`);
    }
  }

  const creneauxModifies = [];
  for (const plage of plages) {
    const cible = dispositif.plagesHoraires.find((p) => p.creneau === plage.creneau);
    const nouvelleHeure = plage.heure ?? cible.heure;
    const nouveauDelai = plage.delaiTolerance !== undefined ? plage.delaiTolerance : cible.delaiTolerance;

    if (nouvelleHeure !== cible.heure || nouveauDelai !== cible.delaiTolerance) {
      creneauxModifies.push(plage.creneau);
    }

    cible.heure = nouvelleHeure;
    cible.delaiTolerance = nouveauDelai;
  }

  await dispositifRepository.sauvegarder(dispositif);

  await priseService.replanifierPrisesAVenir({
    dispositif,
    creneauxModifies,
    fuseauHoraire: await fuseauHorairePour(utilisateurId),
  });

  return dispositif;
}

async function associerDispositif(utilisateurId, identifiantDispositif, { medicamentRepository, priseService }) {
  if (!identifiantDispositif || !identifiantDispositif.trim()) {
    throw ApiError.badRequest("L'identifiant du dispositif est requis");
  }

  const dispositif = await obtenirParUtilisateur(utilisateurId);

  if (dispositif.identifiantDispositif) {
    throw ApiError.conflict('Ce compte est déjà associé à un pilulier (RG-09)');
  }

  const dejaPris = await dispositifRepository.trouverParIdentifiant(identifiantDispositif.trim());
  if (dejaPris) {
    throw ApiError.conflict('Ce pilulier est déjà associé à un autre compte');
  }

  dispositif.identifiantDispositif = identifiantDispositif.trim();
  dispositif.etatConnexion = 'CONNECTE';
  dispositif.dernierContact = new Date();
  await dispositifRepository.sauvegarder(dispositif);

  const medicaments = await medicamentRepository.listerParUtilisateur(utilisateurId);
  const prisesGenerees = await priseService.genererEtEnregistrerProchainesPrises({
    utilisateurId,
    dispositif,
    medicaments,
    fuseauHoraire: await fuseauHorairePour(utilisateurId),
  });

  return { dispositif, nombrePrisesGenerees: prisesGenerees.length };
}

async function demanderPhotoReference(utilisateurId) {
  const dispositif = await obtenirParUtilisateur(utilisateurId);
  dispositif.prochaineFermetureEstReference = true;
  await dispositifRepository.sauvegarder(dispositif);
  return dispositif;
}

module.exports = {
  creerParDefaut,
  fuseauHorairePour,
  obtenirParUtilisateur,
  mettreAJourPlagesHoraires,
  associerDispositif,
  demanderPhotoReference,
};
