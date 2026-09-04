const evenementService = require('../services/evenementService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Accepte soit un seul événement ({identifiantDispositif, type, horodatage}),
 * soit un tableau d'événements. Le format tableau est ce qu'utilisera le
 * circuit pour renvoyer les événements accumulés pendant une coupure
 * réseau (PC-43) : le protocole n'a donc pas besoin de changer entre
 * PC-42 et PC-43.
 */
const enregistrer = asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];

  const evenements = [];
  for (const item of items) {
    // eslint-disable-next-line no-await-in-loop -- l'ordre d'enregistrement doit être préservé
    evenements.push(await evenementService.enregistrerEvenement(item));
  }

  res.status(201).json({ evenements });
});

module.exports = { enregistrer };
