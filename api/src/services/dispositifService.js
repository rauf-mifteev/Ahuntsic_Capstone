const ApiError = require('../utils/ApiError');
const dispositifRepository = require('../repositories/dispositifRepository');

const REGEX_HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

async function creerParDefaut(utilisateurId) {
  return dispositifRepository.creerParDefaut(utilisateurId);
}

async function obtenirParUtilisateur(utilisateurId) {
  const dispositif = await dispositifRepository.trouverParUtilisateur(utilisateurId);
  if (!dispositif) {
    throw ApiError.notFound('Aucun dispositif pour ce compte');
  }
  return dispositif;
}

/**
 * F2 — attribuer une heure à chacun des 4 créneaux (RG-10 : jamais plus de
 * 4 heures différentes par jour — automatiquement vrai puisqu'il n'y a que
 * 4 créneaux, chacun avec une seule heure).
 */
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

  for (const plage of plages) {
    const cible = dispositif.plagesHoraires.find((p) => p.creneau === plage.creneau);
    cible.heure = plage.heure ?? cible.heure;
    if (plage.delaiTolerance !== undefined) {
      cible.delaiTolerance = plage.delaiTolerance;
    }
  }

  await dispositifRepository.sauvegarder(dispositif);
  return dispositif;
}

module.exports = { creerParDefaut, obtenirParUtilisateur, mettreAJourPlagesHoraires };
