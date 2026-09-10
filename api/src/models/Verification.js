const mongoose = require('mongoose');

const scoreZoneSchema = new mongoose.Schema(
  {
    indice: { type: Number, required: true, min: 0, max: 27 },
    occupee: { type: Boolean, required: true },
    score: { type: Number, required: true, min: 0, max: 1 },
  },
  { _id: false }
);

const verificationSchema = new mongoose.Schema(
  {
    dispositif: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispositif', required: true, index: true },
    evenementOuverture: { type: mongoose.Schema.Types.ObjectId, ref: 'EvenementOuverture', required: true },

    image: { type: String, default: null },
    moment: { type: Date, required: true },
    estReference: { type: Boolean, default: false },
    etatsZones: { type: [scoreZoneSchema], default: [] },
    strategieUtilisee: { type: String, default: null },
    analyseEchouee: { type: Boolean, default: false },

    photoSimulee: { type: Boolean, default: false },
  },
  { timestamps: true }
);

verificationSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.image;
    return ret;
  },
});

module.exports = mongoose.models.Verification || mongoose.model('Verification', verificationSchema);
