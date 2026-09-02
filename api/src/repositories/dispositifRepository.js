const Dispositif = require('../models/Dispositif');

const dispositifRepository = {
  /** Crée le dispositif "en attente" d'un utilisateur (voir note dans le modèle). */
  async creerParDefaut(utilisateurId) {
    return Dispositif.create({ utilisateur: utilisateurId });
  },

  async trouverParUtilisateur(utilisateurId) {
    return Dispositif.findOne({ utilisateur: utilisateurId });
  },

  async trouverParIdentifiant(identifiantDispositif) {
    return Dispositif.findOne({ identifiantDispositif });
  },

  async sauvegarder(dispositif) {
    return dispositif.save();
  },
};

module.exports = dispositifRepository;
