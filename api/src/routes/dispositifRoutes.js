const { Router } = require('express');
const dispositifController = require('../controllers/dispositifController');
const { authentificationRequise } = require('../middleware/authMiddleware');

const router = Router();

router.get('/dispositifs/moi', authentificationRequise, dispositifController.obtenirMonDispositif);
router.put(
  '/dispositifs/moi/plages-horaires',
  authentificationRequise,
  dispositifController.mettreAJourPlagesHoraires
);
router.post('/dispositifs/associer', authentificationRequise, dispositifController.associer);
router.post(
  '/dispositifs/moi/confirmer-remplissage',
  authentificationRequise,
  dispositifController.confirmerRemplissage
);

module.exports = router;
