const mongoose = require('mongoose');

const JOURS_VALIDES = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];

const medicamentSchema = new mongoose.Schema(
  {
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true, index: true },
    nom: { type: String, required: [true, 'Le nom du médicament est requis'], trim: true },
    dosage: { type: String, required: [true, 'Le dosage est requis'], trim: true },
    notesApparence: { type: String, default: '' },
    // Le créneau (1 à 4) porte l'heure : deux médicaments dans le même
    // créneau partagent donc forcément la même heure (RG-01), et un
    // médicament ne peut pas être à deux heures différentes dans le même
    // créneau (RG-02) puisqu'il n'y a qu'une heure par créneau.
    creneau: { type: Number, required: true, min: 1, max: 4 },
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

module.exports = mongoose.models.Medicament || mongoose.model('Medicament', medicamentSchema);
module.exports.JOURS_VALIDES = JOURS_VALIDES;
