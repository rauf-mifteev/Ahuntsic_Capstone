const Verification = require('../models/Verification');

const verificationRepository = {
  async creer(data) {
    return Verification.create(data);
  },

  async sauvegarder(verification) {
    return verification.save();
  },

  async trouverDernierePourComparaison(dispositifId, avantMoment) {
    return Verification.findOne({
      dispositif: dispositifId,
      analyseEchouee: false,
      etatsZones: { $ne: [] },
      moment: { $lt: avantMoment },
    }).sort({ moment: -1 });
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
