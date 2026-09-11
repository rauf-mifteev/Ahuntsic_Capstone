const Verification = require('../models/Verification');

const verificationRepository = {
  async creer(data) {
    return Verification.create(data);
  },

  async sauvegarder(verification) {
    return verification.save();
  },

  async trouverDerniereReference(dispositifId) {
    return Verification.findOne({ dispositif: dispositifId, estReference: true }).sort({ moment: -1 });
  },

  async trouverParEvenement(evenementOuvertureId) {
    return Verification.findOne({ evenementOuverture: evenementOuvertureId });
  },

  async listerImagesAPurger(dateLimite) {
    return Verification.find({ image: { $ne: null }, moment: { $lt: dateLimite } });
  },
};

module.exports = verificationRepository;