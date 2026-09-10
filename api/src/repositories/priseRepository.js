const Prise = require('../models/Prise');

const priseRepository = {
  async creerPlusieurs(prises) {
    if (prises.length === 0) return [];
    return Prise.insertMany(prises);
  },

  async sauvegarder(prise) {
    return prise.save();
  },

  async trouverParId(id) {
    return Prise.findById(id);
  },

  async listerParDispositif(dispositifId) {
    return Prise.find({ dispositif: dispositifId }, 'compartimentIndice date').lean();
  },

  async listerReplanifiablesPourDispositif(dispositifId) {
    return Prise.find({ dispositif: dispositifId, statut: 'PREVUE' });
  },

  async listerPourDispositifEtDate(dispositifId, date) {
    return Prise.find({ dispositif: dispositifId, date }).sort({ compartimentIndice: 1 });
  },

  async trouverPrisesDuesPourOuverture(dispositifId, maintenant) {
    return Prise.find({ dispositif: dispositifId, statut: 'PREVUE', heurePrevue: { $lte: maintenant } });
  },

  async trouverEnVerificationPourCompartiment(dispositifId, compartimentIndice) {
    return Prise.findOne({ dispositif: dispositifId, compartimentIndice, statut: 'EN_VERIFICATION' }).sort({
      heurePrevue: -1,
    });
  },

  async trouverActivesPourDel(dispositifId, maintenant) {
    return Prise.find({
      dispositif: dispositifId,
      statut: { $in: ['PREVUE', 'EN_VERIFICATION', 'AMBIGUE'] },
      heurePrevue: { $lte: maintenant },
    });
  },

  async trouverEnRetard(maintenant) {
    return Prise.find({
      statut: { $in: ['PREVUE', 'EN_VERIFICATION', 'AMBIGUE'] },
      $expr: {
        $lt: [{ $add: ['$heurePrevue', { $multiply: ['$delaiTolerance', 60000] }] }, maintenant],
      },
    });
  },
};

module.exports = priseRepository;
