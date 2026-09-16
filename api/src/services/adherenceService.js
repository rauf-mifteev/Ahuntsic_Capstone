const ApiError = require('../utils/ApiError');
const dispositifRepository = require('../repositories/dispositifRepository');
const priseRepository = require('../repositories/priseRepository');

const NOMBRE_JOURS_PAR_DEFAUT = 7;
const NOMBRE_JOURS_MAXIMUM = 31;

const STATUTS_EN_ATTENTE = ['PREVUE', 'EN_VERIFICATION', 'AMBIGUE'];

function dateDecalee(dateCalendaire, joursEnArriere) {
  const [annee, mois, jour] = dateCalendaire.split('-').map(Number);
  const instant = Date.UTC(annee, mois - 1, jour) - joursEnArriere * 24 * 60 * 60 * 1000;
  return new Date(instant).toISOString().slice(0, 10);
}

function comptabiliser(prises) {
  const confirmees = prises.filter((prise) => prise.statut === 'CONFIRMEE');
  const manquees = prises.filter((prise) => prise.statut === 'MANQUEE');
  const enAttente = prises.filter((prise) => STATUTS_EN_ATTENTE.includes(prise.statut));

  const reglees = confirmees.length + manquees.length;

  return {
    total: prises.length,
    confirmees: confirmees.length,
    confirmeesAutomatiquement: confirmees.filter((p) => p.origineConfirmation === 'AUTOMATIQUE').length,
    confirmeesManuellement: confirmees.filter((p) => p.origineConfirmation === 'MANUELLE').length,
    manquees: manquees.length,
    enAttente: enAttente.length,
    tauxAdherence: reglees === 0 ? null : confirmees.length / reglees,
  };
}

async function obtenirHistorique(utilisateurId, { dateFin, nombreJours = NOMBRE_JOURS_PAR_DEFAUT } = {}) {
  if (!Number.isInteger(nombreJours) || nombreJours < 1 || nombreJours > NOMBRE_JOURS_MAXIMUM) {
    throw ApiError.badRequest(`Le nombre de jours doit être un entier entre 1 et ${NOMBRE_JOURS_MAXIMUM}`);
  }

  const dispositif = await dispositifRepository.trouverParUtilisateur(utilisateurId);
  if (!dispositif) {
    throw ApiError.notFound('Aucun dispositif pour ce compte');
  }

  const dateDebut = dateDecalee(dateFin, nombreJours - 1);
  const prises = await priseRepository.listerParPeriodePourDispositif(
    dispositif.id ?? dispositif._id,
    dateDebut,
    dateFin
  );

  const parJour = [];
  for (let recul = nombreJours - 1; recul >= 0; recul -= 1) {
    const date = dateDecalee(dateFin, recul);
    parJour.push({ date, ...comptabiliser(prises.filter((prise) => prise.date === date)) });
  }

  return {
    debut: dateDebut,
    fin: dateFin,
    nombreJours,
    resume: comptabiliser(prises),
    parJour,
  };
}

module.exports = {
  obtenirHistorique,
  comptabiliser,
  dateDecalee,
  NOMBRE_JOURS_PAR_DEFAUT,
  NOMBRE_JOURS_MAXIMUM,
};
