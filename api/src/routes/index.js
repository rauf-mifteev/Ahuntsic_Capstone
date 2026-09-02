const { Router } = require('express');

const router = Router();

/**
 * Vérification de disponibilité, utilisée par l'hébergeur et par la CI.
 * Ne dépend d'aucune base de données : si l'API répond ici, le processus
 * Node tourne. La disponibilité de MongoDB se vérifie séparément si besoin.
 */
router.get('/sante', (req, res) => {
  res.status(200).json({ etat: 'ok', horodatage: new Date().toISOString() });
});

module.exports = router;
