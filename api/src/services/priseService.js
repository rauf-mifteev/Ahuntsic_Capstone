const priseRepository = require('../repositories/priseRepository');

const NOMBRE_JOURS_GENERATION = 7;
const JOURS_SEMAINE_JS = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];

function formatDateISO(date) {
  return date.toISOString().slice(0, 10); // "AAAA-MM-JJ"
}

/**
 * Construit, sans les enregistrer, les Prises ATTENDUES des
 * `NOMBRE_JOURS_GENERATION` prochains jours (aujourd'hui inclus), pour
 * chaque médicament dont le jour de la semaine correspond et dont le
 * créneau a une heure configurée.
 *
 * Limite connue (documentée pour la suite) : le calcul utilise l'heure du
 * serveur (UTC) plutôt que le fuseau horaire du patient
 * (Utilisateur.fuseauHoraire). Acceptable pour ce sprint ; à corriger avec
 * une bibliothèque de fuseaux horaires (ex. luxon) avant la mise en
 * production réelle du calcul d'adhérence (F6).
 */
function genererPrisesAttendues({ utilisateurId, dispositif, medicaments }) {
  const prises = [];
  const aujourdhui = new Date();
  aujourdhui.setUTCHours(0, 0, 0, 0);

  for (let offset = 0; offset < NOMBRE_JOURS_GENERATION; offset += 1) {
    const jour = new Date(aujourdhui);
    jour.setUTCDate(jour.getUTCDate() + offset);
    const nomJour = JOURS_SEMAINE_JS[jour.getUTCDay()];

    for (const medicament of medicaments) {
      if (!medicament.joursSemaine.includes(nomJour)) continue;

      const plage = dispositif.plagesHoraires.find((p) => p.creneau === medicament.creneau);
      if (!plage || !plage.heure) continue; // ne devrait pas arriver (validé à la création du médicament)

      const [heures, minutes] = plage.heure.split(':').map(Number);
      const heurePrevue = new Date(jour);
      heurePrevue.setUTCHours(heures, minutes, 0, 0);

      prises.push({
        utilisateur: utilisateurId,
        dispositif: dispositif.id ?? dispositif._id,
        medicament: medicament.id ?? medicament._id,
        creneau: medicament.creneau,
        date: formatDateISO(jour),
        heurePrevue,
        statut: 'ATTENDUE',
      });
    }
  }

  return prises;
}

async function genererEtEnregistrerProchainesPrises(params) {
  const prises = genererPrisesAttendues(params);
  await priseRepository.creerPlusieurs(prises);
  return prises;
}

module.exports = { genererPrisesAttendues, genererEtEnregistrerProchainesPrises, NOMBRE_JOURS_GENERATION };
