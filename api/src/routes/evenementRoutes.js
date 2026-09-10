const { Router } = require('express');
const evenementController = require('../controllers/evenementController');

const router = Router();

router.post('/evenements', evenementController.enregistrer);

module.exports = router;
