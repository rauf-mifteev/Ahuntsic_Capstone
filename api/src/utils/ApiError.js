/**
 * Erreur métier générique, portée par un code HTTP explicite.
 * Utilisée par les services pour signaler un refus (règle de gestion
 * violée, ressource introuvable, conflit, etc.) sans coupler la couche
 * métier au framework HTTP.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Authentification requise') {
    return new ApiError(401, message);
  }

  static forbidden(message = "Accès refusé") {
    return new ApiError(403, message);
  }

  static notFound(message = 'Ressource introuvable') {
    return new ApiError(404, message);
  }

  static conflict(message, details) {
    return new ApiError(409, message, details);
  }
}

module.exports = ApiError;
