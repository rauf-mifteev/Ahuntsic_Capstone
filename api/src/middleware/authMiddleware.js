const ApiError = require('../utils/ApiError');
const authService = require('../services/authService');

/**
 * Protège une route : exige un en-tête `Authorization: Bearer <jeton>`
 * valide. Sur succès, attache `req.utilisateurId` pour que les
 * contrôleurs sachent pour quel compte agir. (F1, AC : "les routes
 * protégées refusent une requête sans jeton".)
 */
function authentificationRequise(req, res, next) {
  const enTete = req.headers.authorization || '';
  const [type, jeton] = enTete.split(' ');

  if (type !== 'Bearer' || !jeton) {
    return next(ApiError.unauthorized('Jeton manquant'));
  }

  try {
    req.utilisateurId = authService.verifierJeton(jeton);
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { authentificationRequise };
