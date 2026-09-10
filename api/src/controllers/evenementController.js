const evenementService = require('../services/evenementService');
const { asyncHandler } = require('../middleware/errorHandler');

const enregistrer = asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];

  const resultats = [];
  for (const item of items) {
    // eslint-disable-next-line no-await-in-loop -- l'ordre d'enregistrement doit être préservé
    resultats.push(await evenementService.enregistrerEvenement(item));
  }

  const evenements = resultats.map(({ evenement, verification }) => ({
    ...(evenement.toJSON ? evenement.toJSON() : evenement),
    verification: verification ? (verification.toJSON ? verification.toJSON() : verification) : null,
  }));

  res.status(201).json({ evenements });
});

module.exports = { enregistrer };
