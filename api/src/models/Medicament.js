const mongoose = require('mongoose');

const JOURS_VALIDES = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];

const medicamentSchema = new mongoose.Schema(
  {
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true, index: true },
    nom: { type: String, required: [true, 'Le nom du médicament est requis'], trim: true },
    dosage: { type: String, required: [true, 'Le dosage est requis'], trim: true },
    notesApparence: { type: String, default: '' },

    creneaux: {
      type: [{ type: Number, min: 1, max: 4 }],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0 && new Set(v).size === v.length,
        message: 'Au moins un créneau est requis, sans doublon',
      },
    },

    creneau: { type: Number, min: 1, max: 4, default: undefined },
    joursSemaine: {
      type: [{ type: String, enum: JOURS_VALIDES }],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Au moins un jour de la semaine est requis',
      },
    },
  },
  { timestamps: true }
);

medicamentSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

function creneauxDe(medicament) {
  if (!medicament) return [];
  if (Array.isArray(medicament.creneaux) && medicament.creneaux.length > 0) {
    return medicament.creneaux;
  }
  return medicament.creneau ? [medicament.creneau] : [];
}

module.exports = mongoose.models.Medicament || mongoose.model('Medicament', medicamentSchema);
module.exports.JOURS_VALIDES = JOURS_VALIDES;
module.exports.creneauxDe = creneauxDe;
