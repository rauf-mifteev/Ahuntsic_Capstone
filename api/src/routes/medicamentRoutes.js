const { Router } = require('express');
const medicamentController = require('../controllers/medicamentController');
const { authentificationRequise } = require('../middleware/authMiddleware');

const router = Router();

// Voir la note dans dispositifRoutes.js : middleware posé par route, pas via router.use().
router.post('/medicaments', authentificationRequise, medicamentController.creer);
router.get('/medicaments', authentificationRequise, medicamentController.lister);

module.exports = router;
