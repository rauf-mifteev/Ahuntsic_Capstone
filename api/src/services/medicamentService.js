const ApiError = require('../utils/ApiError');
const medicamentRepository = require('../repositories/medicamentRepository');
const dispositifService = require('./dispositifService');
const priseService = require('./priseService');
const { JOURS_VALIDES } = require('../models/Medicament');

function validerCreneaux(creneaux, dispositif) {
  if (!Array.isArray(creneaux) || creneaux.length === 0) {
    throw ApiError.badRequest('Au moins un créneau est requis');
  }
  const invalides = creneaux.filter((c) => ![1, 2, 3, 4].includes(c));
  if (invalides.length > 0) {
    throw ApiError.badRequest(`Créneau(x) invalide(s) : ${invalides.join(', ')} (attendu 1 à 4)`);
  }

  const uniques = [...new Set(creneaux)].sort((a, b) => a - b);

  const sansHeure = uniques.filter((c) => {
    const plage = dispositif.plagesHoraires.find((p) => p.creneau === c);
    return !plage || !plage.heure;
  });
  if (sansHeure.length > 0) {
    throw ApiError.badRequest(
      `Choisissez d'abord une heure pour le(s) créneau(x) ${sansHeure.join(', ')} avant d'y ajouter un médicament`
    );
  }

  return uniques;
}

async function creerMedicament(utilisateurId, { nom, dosage, notesApparence, creneau, creneaux, joursSemaine }) {
  if (!nom || !nom.trim()) {
    throw ApiError.badRequest('Le nom du médicament est requis');
  }
  if (!dosage || !dosage.trim()) {
    throw ApiError.badRequest('Le dosage est requis');
  }
  if (!Array.isArray(joursSemaine) || joursSemaine.length === 0) {
    throw ApiError.badRequest('Au moins un jour de la semaine est requis');
  }
  const joursInvalides = joursSemaine.filter((j) => !JOURS_VALIDES.includes(j));
  if (joursInvalides.length > 0) {
    throw ApiError.badRequest(`Jour(s) invalide(s) : ${joursInvalides.join(', ')}`);
  }

  const dispositif = await dispositifService.obtenirParUtilisateur(utilisateurId);

  const creneauxValides = validerCreneaux(creneaux ?? (creneau ? [creneau] : []), dispositif);

  const medicament = await medicamentRepository.creer({
    utilisateur: utilisateurId,
    nom: nom.trim(),
    dosage: dosage.trim(),
    notesApparence: notesApparence || '',
    creneaux: creneauxValides,
    joursSemaine,
  });

  await synchroniserPrises(utilisateurId, dispositif);
  return medicament;
}

async function modifierMedicament(utilisateurId, medicamentId, { nom, dosage, notesApparence, creneau, creneaux, joursSemaine }) {
  const medicament = await medicamentRepository.trouverParId(medicamentId);
  if (!medicament || String(medicament.utilisateur) !== String(utilisateurId)) {
    throw ApiError.notFound('Médicament introuvable');
  }

  if (nom !== undefined) {
    if (!nom || !nom.trim()) throw ApiError.badRequest('Le nom du médicament est requis');
    medicament.nom = nom.trim();
  }
  if (dosage !== undefined) {
    if (!dosage || !dosage.trim()) throw ApiError.badRequest('Le dosage est requis');
    medicament.dosage = dosage.trim();
  }
  if (notesApparence !== undefined) {
    medicament.notesApparence = notesApparence || '';
  }
  if (joursSemaine !== undefined) {
    if (!Array.isArray(joursSemaine) || joursSemaine.length === 0) {
      throw ApiError.badRequest('Au moins un jour de la semaine est requis');
    }
    const joursInvalides = joursSemaine.filter((j) => !JOURS_VALIDES.includes(j));
    if (joursInvalides.length > 0) {
      throw ApiError.badRequest(`Jour(s) invalide(s) : ${joursInvalides.join(', ')}`);
    }
    medicament.joursSemaine = joursSemaine;
  }

  const dispositif = await dispositifService.obtenirParUtilisateur(utilisateurId);

  if (creneaux !== undefined || creneau !== undefined) {
    medicament.creneaux = validerCreneaux(creneaux ?? (creneau ? [creneau] : []), dispositif);

    medicament.creneau = undefined;
  }

  const modifie = await medicamentRepository.sauvegarder(medicament);
  await synchroniserPrises(utilisateurId, dispositif);
  return modifie;
}

async function synchroniserPrises(utilisateurId, dispositif) {
  if (!dispositif.identifiantDispositif) return;
  const medicaments = await medicamentRepository.listerParUtilisateur(utilisateurId);
  await priseService.synchroniserProchainesPrises({
    dispositif,
    medicaments,
    fuseauHoraire: await dispositifService.fuseauHorairePour(utilisateurId),
  });
}

async function listerMedicaments(utilisateurId) {
  return medicamentRepository.listerParUtilisateur(utilisateurId);
}

module.exports = { creerMedicament, modifierMedicament, listerMedicaments };
