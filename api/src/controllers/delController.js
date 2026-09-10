const delService = require('../services/delService');
const { asyncHandler } = require('../middleware/errorHandler');

const obtenirCommandes = asyncHandler(async (req, res) => {
  const commandes = await delService.obtenirCommandesDel(req.params.identifiantDispositif);
  res.status(200).json(commandes);
});

module.exports = { obtenirCommandes };
