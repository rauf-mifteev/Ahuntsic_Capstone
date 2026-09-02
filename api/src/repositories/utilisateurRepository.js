const Utilisateur = require('../models/Utilisateur');

/**
 * Patron Répertoire (voir docs/B6-patrons-conception.md) : seul module
 * autorisé à parler directement à Mongoose pour la collection Utilisateur.
 * Le reste du code (services) ne connaît que ces méthodes ; si le schéma
 * change, seul ce fichier bouge.
 */
const utilisateurRepository = {
  async creer({ courriel, motDePasseHache }) {
    const utilisateur = await Utilisateur.create({ courriel, motDePasseHache });
    return utilisateur;
  },

  /** Inclut explicitement le mot de passe haché : nécessaire pour le comparer à la connexion. */
  async trouverParCourrielAvecMotDePasse(courriel) {
    return Utilisateur.findOne({ courriel: courriel.toLowerCase() }).select('+motDePasseHache');
  },

  async trouverParId(id) {
    return Utilisateur.findById(id);
  },
};

module.exports = utilisateurRepository;
