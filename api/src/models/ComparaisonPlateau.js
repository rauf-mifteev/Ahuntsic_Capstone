const mongoose = require('mongoose');

const comparaisonPlateauSchema = new mongoose.Schema(
  {
    dispositif: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispositif', required: true, index: true },
    verificationReference: { type: mongoose.Schema.Types.ObjectId, ref: 'Verification', required: true },
    verificationActuelle: { type: mongoose.Schema.Types.ObjectId, ref: 'Verification', required: true },
    moment: { type: Date, required: true },
    compartimentsVides: { type: [Number], default: [] },
  },
  { timestamps: true }
);

comparaisonPlateauSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports =
  mongoose.models.ComparaisonPlateau || mongoose.model('ComparaisonPlateau', comparaisonPlateauSchema);
