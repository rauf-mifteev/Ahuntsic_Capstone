const Utilisateur = require('../models/Utilisateur');

const utilisateurRepository = {
  async creer({ courriel, motDePasseHache }) {
    const utilisateur = await Utilisateur.create({ courriel, motDePasseHache });
    return utilisateur;
  },

  async trouverParCourrielAvecMotDePasse(courriel) {
    return Utilisateur.findOne({ courriel: courriel.toLowerCase() }).select('+motDePasseHache');
  },

  async trouverParId(id) {
    return Utilisateur.findById(id);
  },

  async supprimer(id) {
    return Utilisateur.findByIdAndDelete(id);
  },
};

module.exports = utilisateurRepository;
