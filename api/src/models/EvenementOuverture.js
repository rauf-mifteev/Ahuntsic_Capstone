const mongoose = require('mongoose');

const evenementOuvertureSchema = new mongoose.Schema(
  {
    dispositif: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispositif', required: true, index: true },
    identifiantDispositif: { type: String, required: true },
    type: { type: String, enum: ['OUVERTURE', 'FERMETURE'], required: true },

    horodatage: { type: Date, required: true },
    recuLe: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

evenementOuvertureSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports =
  mongoose.models.EvenementOuverture || mongoose.model('EvenementOuverture', evenementOuvertureSchema);
