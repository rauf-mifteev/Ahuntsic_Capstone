const ApiError = require('../utils/ApiError');
const medicamentRepository = require('../repositories/medicamentRepository');
const dispositifService = require('./dispositifService');
const { JOURS_VALIDES } = require('../models/Medicament');

/**
 * F2 — enregistrer un médicament et l'assigner à un créneau.
 *
 * Règles appliquées ici :
 *  - RG-01 / RG-02 sont garanties par construction (voir Medicament.js) :
 *    la seule chose à valider est que le créneau choisi existe (1-4) et,
 *    plus important, qu'il a déjà une heure configurée. Sans cette
 *    vérification, un médicament pourrait être "assigné à une heure" qui
 *    n'existe pas encore, et le système ne saurait pas quand vérifier la
 *    prise — ce qui va à l'encontre du but même de F2.
 *  - RG-10 (max 4 heures différentes par jour) est garanti par la
 *    structure même du Dispositif (toujours exactement 4 créneaux).
 */
async function creerMedicament(utilisateurId, { nom, dosage, notesApparence, creneau, joursSemaine }) {
  if (!nom || !nom.trim()) {
    throw ApiError.badRequest('Le nom du médicament est requis');
  }
  if (!dosage || !dosage.trim()) {
    throw ApiError.badRequest('Le dosage est requis');
  }
  if (![1, 2, 3, 4].includes(creneau)) {
    throw ApiError.badRequest('Le créneau doit être 1, 2, 3 ou 4');
  }
  if (!Array.isArray(joursSemaine) || joursSemaine.length === 0) {
    throw ApiError.badRequest('Au moins un jour de la semaine est requis');
  }
  const joursInvalides = joursSemaine.filter((j) => !JOURS_VALIDES.includes(j));
  if (joursInvalides.length > 0) {
    throw ApiError.badRequest(`Jour(s) invalide(s) : ${joursInvalides.join(', ')}`);
  }

  const dispositif = await dispositifService.obtenirParUtilisateur(utilisateurId);
  const plage = dispositif.plagesHoraires.find((p) => p.creneau === creneau);
  if (!plage || !plage.heure) {
    throw ApiError.badRequest(
      `Choisissez d'abord une heure pour le créneau ${creneau} avant d'y ajouter un médicament`
    );
  }

  return medicamentRepository.creer({
    utilisateur: utilisateurId,
    nom: nom.trim(),
    dosage: dosage.trim(),
    notesApparence: notesApparence || '',
    creneau,
    joursSemaine,
  });
}

async function listerMedicaments(utilisateurId) {
  return medicamentRepository.listerParUtilisateur(utilisateurId);
}

module.exports = { creerMedicament, listerMedicaments };
