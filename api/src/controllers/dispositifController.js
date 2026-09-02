const dispositifService = require('../services/dispositifService');
const { asyncHandler } = require('../middleware/errorHandler');

const obtenirMonDispositif = asyncHandler(async (req, res) => {
  const dispositif = await dispositifService.obtenirParUtilisateur(req.utilisateurId);
  res.status(200).json({ dispositif });
});

const mettreAJourPlagesHoraires = asyncHandler(async (req, res) => {
  const dispositif = await dispositifService.mettreAJourPlagesHoraires(req.utilisateurId, req.body.plagesHoraires);
  res.status(200).json({ dispositif });
});

module.exports = { obtenirMonDispositif, mettreAJourPlagesHoraires };
