const Medicament = require('../models/Medicament');

const medicamentRepository = {
  async creer(data) {
    return Medicament.create(data);
  },

  async listerParUtilisateur(utilisateurId) {
    return Medicament.find({ utilisateur: utilisateurId }).sort({ nom: 1 });
  },

  async trouverParId(id) {
    return Medicament.findById(id);
  },

  async sauvegarder(medicament) {
    return medicament.save();
  },
};

module.exports = medicamentRepository;
