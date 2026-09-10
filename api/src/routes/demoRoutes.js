const { Router } = require('express');
const demoController = require('../controllers/demoController');
const { authentificationRequise } = require('../middleware/authMiddleware');

const router = Router();

router.get('/demo/evenements-recents', authentificationRequise, demoController.obtenirEvenementsRecents);
router.post('/demo/connexion', authentificationRequise, demoController.basculerConnexion);

module.exports = router;
