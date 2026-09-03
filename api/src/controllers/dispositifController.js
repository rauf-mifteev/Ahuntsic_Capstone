const dispositifService = require('../services/dispositifService');
const medicamentRepository = require('../repositories/medicamentRepository');
const priseService = require('../services/priseService');
const { asyncHandler } = require('../middleware/errorHandler');

const obtenirMonDispositif = asyncHandler(async (req, res) => {
  const dispositif = await dispositifService.obtenirParUtilisateur(req.utilisateurId);
  res.status(200).json({ dispositif });
});

const mettreAJourPlagesHoraires = asyncHandler(async (req, res) => {
  const dispositif = await dispositifService.mettreAJourPlagesHoraires(req.utilisateurId, req.body.plagesHoraires);
  res.status(200).json({ dispositif });
});

const associer = asyncHandler(async (req, res) => {
  const { dispositif, nombrePrisesGenerees } = await dispositifService.associerDispositif(
    req.utilisateurId,
    req.body.identifiantDispositif,
    { medicamentRepository, priseService }
  );
  res.status(200).json({ dispositif, nombrePrisesGenerees });
});

module.exports = { obtenirMonDispositif, mettreAJourPlagesHoraires, associer };
