const { Router } = require('express');
const medicamentController = require('../controllers/medicamentController');
const { authentificationRequise } = require('../middleware/authMiddleware');

const router = Router();

router.post('/medicaments', authentificationRequise, medicamentController.creer);
router.put('/medicaments/:id', authentificationRequise, medicamentController.modifier);
router.get('/medicaments', authentificationRequise, medicamentController.lister);

module.exports = router;
