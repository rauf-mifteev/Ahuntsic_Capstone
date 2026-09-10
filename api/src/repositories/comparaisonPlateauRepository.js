const ComparaisonPlateau = require('../models/ComparaisonPlateau');

const comparaisonPlateauRepository = {
  async creer(data) {
    return ComparaisonPlateau.create(data);
  },

  async listerRecentesParDispositif(dispositifId, limite = 20) {
    return ComparaisonPlateau.find({ dispositif: dispositifId }).sort({ moment: -1 }).limit(limite);
  },
};

module.exports = comparaisonPlateauRepository;
