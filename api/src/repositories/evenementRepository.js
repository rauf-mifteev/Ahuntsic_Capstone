const EvenementOuverture = require('../models/EvenementOuverture');

const evenementRepository = {
  async creer(data) {
    return EvenementOuverture.create(data);
  },

  async listerParDispositif(dispositifId, limite = 50) {
    return EvenementOuverture.find({ dispositif: dispositifId }).sort({ horodatage: -1 }).limit(limite);
  },
};

module.exports = evenementRepository;
