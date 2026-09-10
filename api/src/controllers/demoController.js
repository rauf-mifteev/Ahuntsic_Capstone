const demoService = require('../services/demoService');
const { asyncHandler } = require('../middleware/errorHandler');

const obtenirEvenementsRecents = asyncHandler(async (req, res) => {
  const resultat = await demoService.obtenirEvenementsRecents(req.utilisateurId);
  res.status(200).json(resultat);
});

const basculerConnexion = asyncHandler(async (req, res) => {
  const dispositif = await demoService.basculerConnexion(req.utilisateurId, req.body.actif === true);
  res.status(200).json({ dispositif });
});

module.exports = { obtenirEvenementsRecents, basculerConnexion };
