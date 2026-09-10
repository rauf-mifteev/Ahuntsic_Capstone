const { Router } = require('express');
const verificationController = require('../controllers/verificationController');
const { authentificationRequise } = require('../middleware/authMiddleware');

const router = Router();

router.get('/verifications/reference', authentificationRequise, verificationController.obtenirDerniereReference);

module.exports = router;
