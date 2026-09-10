const { Router } = require('express');
const delController = require('../controllers/delController');

const router = Router();

router.get('/circuit/:identifiantDispositif/commandes-del', delController.obtenirCommandes);

module.exports = router;
