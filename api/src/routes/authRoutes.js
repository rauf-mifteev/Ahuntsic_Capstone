const { Router } = require('express');
const authController = require('../controllers/authController');
const { authentificationRequise } = require('../middleware/authMiddleware');

const router = Router();

router.post('/comptes', authController.inscription);
router.post('/comptes/connexion', authController.connexion);

router.get('/comptes/moi', authentificationRequise, authController.moi);

module.exports = router;
