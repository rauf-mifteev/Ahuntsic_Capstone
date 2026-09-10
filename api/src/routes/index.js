const { Router } = require('express');
const authRoutes = require('./authRoutes');
const dispositifRoutes = require('./dispositifRoutes');
const medicamentRoutes = require('./medicamentRoutes');
const evenementRoutes = require('./evenementRoutes');
const priseRoutes = require('./priseRoutes');
const verificationRoutes = require('./verificationRoutes');
const circuitRoutes = require('./circuitRoutes');
const demoRoutes = require('./demoRoutes');

const router = Router();

router.get('/sante', (req, res) => {
  res.status(200).json({ etat: 'ok', horodatage: new Date().toISOString() });
});

router.use(authRoutes);
router.use(dispositifRoutes);
router.use(medicamentRoutes);
router.use(evenementRoutes);
router.use(priseRoutes);
router.use(verificationRoutes);
router.use(circuitRoutes);
router.use(demoRoutes);

module.exports = router;
