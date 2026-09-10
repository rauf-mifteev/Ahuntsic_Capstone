const mongoose = require('mongoose');

const priseSchema = new mongoose.Schema(
  {
    dispositif: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispositif', required: true, index: true },
    compartimentIndice: { type: Number, required: true, min: 0, max: 27 },

    date: { type: String, required: true },
    heurePrevue: { type: Date, required: true },

    delaiTolerance: { type: Number, required: true },
    statut: {
      type: String,
      enum: ['PREVUE', 'EN_VERIFICATION', 'CONFIRMEE', 'MANQUEE', 'AMBIGUE'],
      default: 'PREVUE',
    },
    origineConfirmation: {
      type: String,
      enum: ['AUTOMATIQUE', 'MANUELLE', null],
      default: null,
    },
    dateChangementStatut: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

priseSchema.index({ dispositif: 1, date: 1 });
priseSchema.index({ dispositif: 1, compartimentIndice: 1, statut: 1 });

priseSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.models.Prise || mongoose.model('Prise', priseSchema);
