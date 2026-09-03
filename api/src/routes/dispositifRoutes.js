const { Router } = require('express');
const dispositifController = require('../controllers/dispositifController');
const { authentificationRequise } = require('../middleware/authMiddleware');

const router = Router();

// Toutes les routes /dispositifs concernent le dispositif du compte connecté :
// pas besoin (ni souhaitable) d'exposer un identifiant Mongo dans l'URL.
// Le middleware est posé route par route (et non via router.use) car ce
// sous-routeur est monté à la racine de l'API : un router.use() global ici
// intercepterait aussi les requêtes destinées à d'autres routes (ex. une
// route inconnue ne renverrait plus jamais 404, mais toujours 401).
router.get('/dispositifs/moi', authentificationRequise, dispositifController.obtenirMonDispositif);
router.put(
  '/dispositifs/moi/plages-horaires',
  authentificationRequise,
  dispositifController.mettreAJourPlagesHoraires
);
router.post('/dispositifs/associer', authentificationRequise, dispositifController.associer);

module.exports = router;
