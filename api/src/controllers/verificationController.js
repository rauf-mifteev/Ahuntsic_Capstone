const verificationService = require('../services/verificationService');
const { asyncHandler } = require('../middleware/errorHandler');

const obtenirDerniereReference = asyncHandler(async (req, res) => {
  const verification = await verificationService.obtenirDerniereReferencePourUtilisateur(req.utilisateurId);
  res.status(200).json({ verification });
});

module.exports = { obtenirDerniereReference };
