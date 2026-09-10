const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const utilisateurRepository = require('../repositories/utilisateurRepository');
const dispositifService = require('./dispositifService');

const TOURS_DE_HACHAGE = 12;

function genererJeton(utilisateur) {
  return jwt.sign({ sub: utilisateur.id ?? utilisateur._id.toString() }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

async function inscrire({ courriel, motDePasse }) {
  if (!courriel || !motDePasse) {
    throw ApiError.badRequest('Courriel et mot de passe sont requis');
  }
  if (motDePasse.length < 8) {
    throw ApiError.badRequest('Le mot de passe doit contenir au moins 8 caractères');
  }

  const existant = await utilisateurRepository.trouverParCourrielAvecMotDePasse(courriel);
  if (existant) {

    throw ApiError.conflict('Impossible de créer ce compte');
  }

  const motDePasseHache = await bcrypt.hash(motDePasse, TOURS_DE_HACHAGE);
  const utilisateur = await utilisateurRepository.creer({ courriel, motDePasseHache });

  try {
    await dispositifService.creerParDefaut(utilisateur.id ?? utilisateur._id.toString());
  } catch (err) {
    await utilisateurRepository.supprimer(utilisateur.id ?? utilisateur._id.toString());
    throw err;
  }

  return { utilisateur, jeton: genererJeton(utilisateur) };
}

async function connecter({ courriel, motDePasse }) {
  if (!courriel || !motDePasse) {
    throw ApiError.badRequest('Courriel et mot de passe sont requis');
  }

  const utilisateur = await utilisateurRepository.trouverParCourrielAvecMotDePasse(courriel);
  if (!utilisateur) {
    throw ApiError.unauthorized('Courriel ou mot de passe invalide');
  }

  const motDePasseValide = await bcrypt.compare(motDePasse, utilisateur.motDePasseHache);
  if (!motDePasseValide) {
    throw ApiError.unauthorized('Courriel ou mot de passe invalide');
  }

  return { utilisateur, jeton: genererJeton(utilisateur) };
}

async function obtenirParId(id) {
  const utilisateur = await utilisateurRepository.trouverParId(id);
  if (!utilisateur) {
    throw ApiError.notFound('Utilisateur introuvable');
  }
  return utilisateur;
}

function verifierJeton(jeton) {
  try {
    const payload = jwt.verify(jeton, env.jwtSecret);
    return payload.sub;
  } catch (err) {
    throw ApiError.unauthorized('Jeton invalide ou expiré');
  }
}

module.exports = { inscrire, connecter, obtenirParId, verifierJeton, genererJeton };
