const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const priseRepository = require('../repositories/priseRepository');
const dispositifRepository = require('../repositories/dispositifRepository');
const { creneauxDe } = require('../models/Medicament');

const NOMBRE_JOURS_GENERATION = 7;
const JOURS_SEMAINE_JS = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];

const TRANSITIONS_VALIDES = {
  PREVUE: ['EN_VERIFICATION', 'MANQUEE'],
  EN_VERIFICATION: ['CONFIRMEE', 'AMBIGUE', 'MANQUEE'],
  AMBIGUE: ['CONFIRMEE', 'MANQUEE'],
  CONFIRMEE: [],
  MANQUEE: [],
};

function formatDateISO(date) {
  return date.toISOString().slice(0, 10);
}

const { FUSEAU_PAR_DEFAUT } = require('../models/Utilisateur');

function decalageZoneMs(instantMs, fuseauHoraire) {
  const parties = new Intl.DateTimeFormat('en-US', {
    timeZone: fuseauHoraire,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instantMs));

  const valeur = (type) => Number(parties.find((p) => p.type === type).value);

  const commeUtc = Date.UTC(
    valeur('year'),
    valeur('month') - 1,
    valeur('day'),
    valeur('hour') % 24,
    valeur('minute'),
    valeur('second')
  );
  return commeUtc - instantMs;
}

function dateCalendaireLocale(instant, fuseauHoraire) {
  const parties = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuseauHoraire,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const valeur = (type) => Number(parties.find((p) => p.type === type).value);
  return { annee: valeur('year'), mois: valeur('month'), jour: valeur('day') };
}

function instantDepuisHeureLocale({ annee, mois, jour, heures, minutes }, fuseauHoraire) {
  const approximation = Date.UTC(annee, mois - 1, jour, heures, minutes, 0, 0);
  const premierDecalage = decalageZoneMs(approximation, fuseauHoraire);
  let instant = approximation - premierDecalage;

  const secondDecalage = decalageZoneMs(instant, fuseauHoraire);
  if (secondDecalage !== premierDecalage) {
    instant = approximation - secondDecalage;
  }
  return new Date(instant);
}

function transitionner(prise, statutCible, { origineConfirmation } = {}) {
  const autorises = TRANSITIONS_VALIDES[prise.statut] || [];
  if (!autorises.includes(statutCible)) {
    throw ApiError.conflict(`Transition de statut invalide : ${prise.statut} -> ${statutCible} (RG-06)`);
  }
  prise.statut = statutCible;
  prise.dateChangementStatut = new Date();
  if (statutCible === 'CONFIRMEE') {
    prise.origineConfirmation = origineConfirmation || 'AUTOMATIQUE';
  }
  return prise;
}

function genererPrisesAttendues({ dispositif, medicaments, fuseauHoraire = FUSEAU_PAR_DEFAUT }) {
  const prises = [];
  const debut = dateCalendaireLocale(new Date(), fuseauHoraire);

  for (let offset = 0; offset < NOMBRE_JOURS_GENERATION; offset += 1) {

    const calendrier = new Date(Date.UTC(debut.annee, debut.mois - 1, debut.jour + offset));
    const annee = calendrier.getUTCFullYear();
    const mois = calendrier.getUTCMonth() + 1;
    const jourDuMois = calendrier.getUTCDate();
    const nomJour = JOURS_SEMAINE_JS[calendrier.getUTCDay()];

    for (const plage of dispositif.plagesHoraires) {
      if (!plage.heure) continue;

      const unMedicamentPourCeJour = medicaments.some(
        (m) => creneauxDe(m).includes(plage.creneau) && m.joursSemaine.includes(nomJour)
      );
      if (!unMedicamentPourCeJour) continue;

      const compartiment = dispositif.compartiments.find(
        (c) => c.creneau === plage.creneau && c.jourSemaine === nomJour
      );
      if (!compartiment) continue;

      const [heures, minutes] = plage.heure.split(':').map(Number);
      const heurePrevue = instantDepuisHeureLocale(
        { annee, mois, jour: jourDuMois, heures, minutes },
        fuseauHoraire
      );

      prises.push({
        dispositif: dispositif.id ?? dispositif._id,
        compartimentIndice: compartiment.indice,

        date: formatDateISO(calendrier),
        heurePrevue,
        delaiTolerance: plage.delaiTolerance,
        statut: 'PREVUE',
      });
    }
  }

  return prises;
}

async function genererEtEnregistrerProchainesPrises({ dispositif, medicaments, fuseauHoraire }) {
  const prises = genererPrisesAttendues({ dispositif, medicaments, fuseauHoraire });
  await priseRepository.creerPlusieurs(prises);
  return prises;
}

async function replanifierPrisesAVenir({
  dispositif,
  creneauxModifies,
  fuseauHoraire = FUSEAU_PAR_DEFAUT,
}) {
  if (!Array.isArray(creneauxModifies) || creneauxModifies.length === 0) return [];

  const dispositifId = dispositif.id ?? dispositif._id;
  const prises = await priseRepository.listerReplanifiablesPourDispositif(dispositifId);
  const replanifiees = [];

  for (const prise of prises) {
    const creneau = Math.floor(prise.compartimentIndice / 7) + 1;
    if (!creneauxModifies.includes(creneau)) continue;

    const plage = dispositif.plagesHoraires.find((p) => p.creneau === creneau);
    if (!plage || !plage.heure) continue;

    const [annee, mois, jour] = String(prise.date).split('-').map(Number);
    const [heures, minutes] = plage.heure.split(':').map(Number);
    const nouvelleHeure = instantDepuisHeureLocale({ annee, mois, jour, heures, minutes }, fuseauHoraire);

    const inchangee =
      new Date(prise.heurePrevue).getTime() === nouvelleHeure.getTime() &&
      prise.delaiTolerance === plage.delaiTolerance;
    if (inchangee) continue;

    prise.heurePrevue = nouvelleHeure;
    prise.delaiTolerance = plage.delaiTolerance;
    // eslint-disable-next-line no-await-in-loop -- volume faible (28 prises au plus)
    await priseRepository.sauvegarder(prise);
    replanifiees.push(prise);
  }

  return replanifiees;
}

async function synchroniserProchainesPrises({ dispositif, medicaments, fuseauHoraire }) {
  const attendues = genererPrisesAttendues({ dispositif, medicaments, fuseauHoraire });
  const dispositifId = dispositif.id ?? dispositif._id;
  const existantes = await priseRepository.listerParDispositif(dispositifId);

  const cle = (p) => `${p.compartimentIndice}|${p.date}`;
  const dejaPresentes = new Set(existantes.map(cle));
  const nouvelles = attendues.filter((p) => !dejaPresentes.has(cle(p)));

  await priseRepository.creerPlusieurs(nouvelles);
  return nouvelles;
}

async function demarrerVerificationsPourOuverture(dispositifId, maintenant = new Date()) {
  const prisesDues = await priseRepository.trouverPrisesDuesPourOuverture(dispositifId, maintenant);
  for (const prise of prisesDues) {
    transitionner(prise, 'EN_VERIFICATION');
    // eslint-disable-next-line no-await-in-loop -- volume attendu très faible (quelques prises max)
    await priseRepository.sauvegarder(prise);
  }
  return prisesDues;
}

async function reglerDepuisComparaison(dispositifId, compartimentsVides, verificationActuelle) {
  const scoresParIndice = new Map(verificationActuelle.etatsZones.map((z) => [z.indice, z.score]));
  const resultats = [];

  for (const indice of compartimentsVides) {
    // eslint-disable-next-line no-await-in-loop -- ordre de traitement peu importe ici, mais volume faible
    const prise = await priseRepository.trouverEnVerificationPourCompartiment(dispositifId, indice);
    if (!prise) continue;

    const score = scoresParIndice.get(indice) ?? 0;
    if (score >= env.seuilConfirmationScore) {
      transitionner(prise, 'CONFIRMEE', { origineConfirmation: 'AUTOMATIQUE' });
    } else {
      transitionner(prise, 'AMBIGUE');
    }

    // eslint-disable-next-line no-await-in-loop
    await priseRepository.sauvegarder(prise);
    resultats.push(prise);
  }

  return resultats;
}

async function confirmerManuellement(prise) {
  transitionner(prise, 'CONFIRMEE', { origineConfirmation: 'MANUELLE' });
  return priseRepository.sauvegarder(prise);
}

async function annulerConfirmation(prise) {
  if (prise.statut !== 'AMBIGUE') {
    throw ApiError.conflict("Seule une prise « ambiguë » peut être annulée de cette façon (RG-06)");
  }
  prise.dateChangementStatut = new Date();
  return priseRepository.sauvegarder(prise);
}

async function marquerEnRetardCommeManquees(maintenant = new Date()) {
  const enRetard = await priseRepository.trouverEnRetard(maintenant);
  for (const prise of enRetard) {
    transitionner(prise, 'MANQUEE');
    // eslint-disable-next-line no-await-in-loop
    await priseRepository.sauvegarder(prise);
  }
  return enRetard;
}

async function obtenirPrisePourUtilisateur(utilisateurId, priseId) {
  const dispositif = await dispositifRepository.trouverParUtilisateur(utilisateurId);
  const prise = dispositif && (await priseRepository.trouverParId(priseId));

  if (!dispositif || !prise || String(prise.dispositif) !== String(dispositif.id ?? dispositif._id)) {
    throw ApiError.notFound('Prise introuvable');
  }
  return prise;
}

async function listerPourUtilisateurEtDate(utilisateurId, date) {
  const dispositif = await dispositifRepository.trouverParUtilisateur(utilisateurId);
  if (!dispositif) {
    throw ApiError.notFound('Aucun dispositif pour ce compte');
  }
  return priseRepository.listerPourDispositifEtDate(dispositif.id ?? dispositif._id, date);
}

module.exports = {
  genererPrisesAttendues,
  genererEtEnregistrerProchainesPrises,
  synchroniserProchainesPrises,
  replanifierPrisesAVenir,
  instantDepuisHeureLocale,
  FUSEAU_PAR_DEFAUT,
  demarrerVerificationsPourOuverture,
  reglerDepuisComparaison,
  confirmerManuellement,
  annulerConfirmation,
  marquerEnRetardCommeManquees,
  obtenirPrisePourUtilisateur,
  listerPourUtilisateurEtDate,
  transitionner,
  TRANSITIONS_VALIDES,
  NOMBRE_JOURS_GENERATION,
};
