const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Corps de requête JSON invalide' } });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: { message: err.message } });
  }

  if (err.code === 11000) {
    const champ = Object.keys(err.keyPattern || {})[0] || 'valeur';
    return res.status(409).json({ error: { message: `Conflit : ${champ} déjà utilisé(e)` } });
  }

  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({ error: { message: 'Erreur interne du serveur' } });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `Route inconnue : ${req.method} ${req.originalUrl}` } });
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, notFoundHandler, asyncHandler };
