const { Router } = require('express');
const authController = require('../controllers/authController');
const { authentificationRequise } = require('../middleware/authMiddleware');

const router = Router();

// F1 — Compte et connexion
router.post('/comptes', authController.inscription);
router.post('/comptes/connexion', authController.connexion);

// Route protégée : sert à la fois à l'app (afficher le compte courant) et
// de démonstration que le middleware d'authentification fonctionne.
router.get('/comptes/moi', authentificationRequise, authController.moi);

module.exports = router;
