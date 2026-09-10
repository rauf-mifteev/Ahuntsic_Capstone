const { Router } = require('express');
const priseController = require('../controllers/priseController');
const { authentificationRequise } = require('../middleware/authMiddleware');

const router = Router();

router.get('/prises', authentificationRequise, priseController.lister);
router.get('/prises/:id', authentificationRequise, priseController.obtenirUne);
router.put('/prises/:id/confirmer', authentificationRequise, priseController.confirmer);
router.put('/prises/:id/annuler-confirmation', authentificationRequise, priseController.annulerConfirmation);

module.exports = router;
