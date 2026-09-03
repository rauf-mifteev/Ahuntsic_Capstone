const Prise = require('../models/Prise');

const priseRepository = {
  async creerPlusieurs(prises) {
    if (prises.length === 0) return [];
    return Prise.insertMany(prises);
  },

  async compterParDispositif(dispositifId) {
    return Prise.countDocuments({ dispositif: dispositifId });
  },
};

module.exports = priseRepository;
