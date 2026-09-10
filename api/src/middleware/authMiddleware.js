const ApiError = require('../utils/ApiError');
const authService = require('../services/authService');

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
