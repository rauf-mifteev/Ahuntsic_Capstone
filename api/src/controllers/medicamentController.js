const medicamentService = require('../services/medicamentService');
const { asyncHandler } = require('../middleware/errorHandler');

const creer = asyncHandler(async (req, res) => {
  const medicament = await medicamentService.creerMedicament(req.utilisateurId, req.body);
  res.status(201).json({ medicament });
});

const lister = asyncHandler(async (req, res) => {
  const medicaments = await medicamentService.listerMedicaments(req.utilisateurId);
  res.status(200).json({ medicaments });
});

module.exports = { creer, lister };
