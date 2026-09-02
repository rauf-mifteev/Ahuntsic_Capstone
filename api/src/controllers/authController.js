const authService = require('../services/authService');
const { asyncHandler } = require('../middleware/errorHandler');

const inscription = asyncHandler(async (req, res) => {
  const { courriel, motDePasse } = req.body;
  const { utilisateur, jeton } = await authService.inscrire({ courriel, motDePasse });
  res.status(201).json({ utilisateur, jeton });
});

const connexion = asyncHandler(async (req, res) => {
  const { courriel, motDePasse } = req.body;
  const { utilisateur, jeton } = await authService.connecter({ courriel, motDePasse });
  res.status(200).json({ utilisateur, jeton });
});

const moi = asyncHandler(async (req, res) => {
  const utilisateur = await authService.obtenirParId(req.utilisateurId);
  res.status(200).json({ utilisateur });
});

module.exports = { inscription, connexion, moi };
