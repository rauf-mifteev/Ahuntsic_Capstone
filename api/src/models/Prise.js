const mongoose = require('mongoose');

/**
 * Prise (Partie A, diagramme de classes) : une prise ATTENDUE pour un
 * médicament, un jour et un créneau donnés. Générée à l'avance pour les 7
 * prochains jours (voir dispositifService.associerDispositif), puis mise à
 * jour par les sprints suivants (F5/F6) quand le patient prend réellement
 * son médicament ou que le délai de tolérance expire.
 */
const priseSchema = new mongoose.Schema(
  {
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true, index: true },
    dispositif: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispositif', required: true },
    medicament: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicament', required: true },
    creneau: { type: Number, required: true, min: 1, max: 4 },
    // "AAAA-MM-JJ" — pratique pour requêter "les prises d'aujourd'hui" sans jongler avec les fuseaux horaires.
    date: { type: String, required: true },
    heurePrevue: { type: Date, required: true },
    statut: {
      type: String,
      enum: ['ATTENDUE', 'PRISE', 'MANQUEE'],
      default: 'ATTENDUE',
    },
  },
  { timestamps: true }
);

priseSchema.index({ utilisateur: 1, date: 1 });

priseSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.models.Prise || mongoose.model('Prise', priseSchema);
