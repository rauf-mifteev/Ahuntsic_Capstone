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

/**
 * F3 — associer le pilulier physique/simulé au compte (PC-37/38).
 *
 * RG-09 : un compte n'a qu'un seul pilulier à la fois. Comme le Dispositif
 * "en attente" existe déjà depuis l'inscription (voir la note dans
 * models/Dispositif.js), "associer" revient à lui attribuer son premier
 * (et unique) identifiantDispositif — une deuxième tentative est refusée.
 *
 * Dépendances passées en paramètres (plutôt qu'importées directement)
 * pour éviter un cycle de dépendances entre services et garder ce module
 * facile à tester : voir l'appel dans dispositifController.
 */
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

  // Séquence 04_sequence_configuration.puml : l'association déclenche la
  // génération des 7 prochains jours de prises attendues, à partir des
  // médicaments déjà enregistrés (F2).
  const medicaments = await medicamentRepository.listerParUtilisateur(utilisateurId);
  const prisesGenerees = await priseService.genererEtEnregistrerProchainesPrises({
    utilisateurId,
    dispositif,
    medicaments,
  });

  return { dispositif, nombrePrisesGenerees: prisesGenerees.length };
}

module.exports = {
  creerParDefaut,
  obtenirParUtilisateur,
  mettreAJourPlagesHoraires,
  associerDispositif,
};
