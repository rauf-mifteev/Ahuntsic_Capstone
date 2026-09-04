const { Router } = require('express');
const evenementController = require('../controllers/evenementController');

const router = Router();

// Pas de authentificationRequise ici : le circuit n'a pas de compte utilisateur.
// L'identifiantDispositif joue le rôle de credential (voir evenementService.js).
router.post('/evenements', evenementController.enregistrer);

module.exports = router;
