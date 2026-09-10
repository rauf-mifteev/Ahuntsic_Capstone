const priseService = require('../services/priseService');
const { asyncHandler } = require('../middleware/errorHandler');

const lister = asyncHandler(async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const prises = await priseService.listerPourUtilisateurEtDate(req.utilisateurId, date);
  res.status(200).json({ prises });
});

const obtenirUne = asyncHandler(async (req, res) => {
  const prise = await priseService.obtenirPrisePourUtilisateur(req.utilisateurId, req.params.id);
  res.status(200).json({ prise });
});

const confirmer = asyncHandler(async (req, res) => {
  const prise = await priseService.obtenirPrisePourUtilisateur(req.utilisateurId, req.params.id);
  const priseConfirmee = await priseService.confirmerManuellement(prise);
  res.status(200).json({ prise: priseConfirmee });
});

const annulerConfirmation = asyncHandler(async (req, res) => {
  const prise = await priseService.obtenirPrisePourUtilisateur(req.utilisateurId, req.params.id);
  const priseMiseAJour = await priseService.annulerConfirmation(prise);
  res.status(200).json({ prise: priseMiseAJour });
});

module.exports = { lister, obtenirUne, confirmer, annulerConfirmation };
