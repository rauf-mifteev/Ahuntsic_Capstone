const ApiError = require('../utils/ApiError');

/**
 * Gestionnaire d'erreurs centralisé. Toute route ou middleware qui appelle
 * next(err) — ou lève une erreur dans une fonction async enveloppée par
 * `asyncHandler` — finit ici. Le format de réponse est le même partout dans
 * l'API : { error: { message, details? } }.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }

  // Erreur de validation Mongoose (schéma) -> 400 plutôt que 500
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: { message: err.message } });
  }

  // Clé dupliquée MongoDB (index unique) -> 409 plutôt que 500. Sans ce
  // cas, une contrainte d'unicité inattendue (ex. le bogue trouvé sur
  // Dispositif.identifiantDispositif, voir models/Dispositif.js) renvoie
  // "Erreur interne du serveur" sans aucun indice — ici, au moins le nom
  // du champ en cause apparaît, ce qui aurait rendu ce bogue-là visible
  // immédiatement plutôt que de devoir le déduire d'un symptôme indirect.
  if (err.code === 11000) {
    const champ = Object.keys(err.keyPattern || {})[0] || 'valeur';
    return res.status(409).json({ error: { message: `Conflit : ${champ} déjà utilisé(e)` } });
  }

  // Erreur inattendue : on ne renvoie jamais la pile d'appel au client.
  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({ error: { message: 'Erreur interne du serveur' } });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `Route inconnue : ${req.method} ${req.originalUrl}` } });
}

/** Enveloppe un contrôleur async pour transmettre ses rejets à errorHandler. */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, notFoundHandler, asyncHandler };
