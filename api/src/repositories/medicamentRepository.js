const Medicament = require('../models/Medicament');

const medicamentRepository = {
  async creer(data) {
    return Medicament.create(data);
  },

  async listerParUtilisateur(utilisateurId) {
    return Medicament.find({ utilisateur: utilisateurId }).sort({ creneau: 1, nom: 1 });
  },

  async trouverParId(id) {
    return Medicament.findById(id);
  },
};

module.exports = medicamentRepository;
