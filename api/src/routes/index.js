const { Router } = require('express');
const authRoutes = require('./authRoutes');
const dispositifRoutes = require('./dispositifRoutes');
const medicamentRoutes = require('./medicamentRoutes');
const evenementRoutes = require('./evenementRoutes');

const router = Router();

/**
 * Vérification de disponibilité, utilisée par l'hébergeur et par la CI.
 * Ne dépend d'aucune base de données : si l'API répond ici, le processus
 * Node tourne. La disponibilité de MongoDB se vérifie séparément si besoin.
 */
router.get('/sante', (req, res) => {
  res.status(200).json({ etat: 'ok', horodatage: new Date().toISOString() });
});

router.use(authRoutes);
router.use(dispositifRoutes);
router.use(medicamentRoutes);
router.use(evenementRoutes);

module.exports = router;
