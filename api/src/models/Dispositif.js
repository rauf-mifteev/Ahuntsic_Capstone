const mongoose = require('mongoose');

const plageHoraireSchema = new mongoose.Schema(
  {
    creneau: { type: Number, required: true, min: 1, max: 4 },

    heure: { type: String, default: null, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure invalide (HH:mm)'] },

    delaiTolerance: { type: Number, default: 60, min: 5 },
  },
  { _id: false }
);

const JOURS_ORDRE = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];
const NB_CRENEAUX = 4;

function genererCompartiments() {
  const compartiments = [];
  for (let creneau = 1; creneau <= NB_CRENEAUX; creneau += 1) {
    JOURS_ORDRE.forEach((jourSemaine, colonneJour) => {
      const indice = (creneau - 1) * JOURS_ORDRE.length + colonneJour;
      compartiments.push({ indice, jourSemaine, creneau, indexDEL: indice });
    });
  }
  return compartiments;
}

const compartimentSchema = new mongoose.Schema(
  {
    indice: { type: Number, required: true, min: 0, max: 27 },
    jourSemaine: { type: String, enum: JOURS_ORDRE, required: true },
    creneau: { type: Number, required: true, min: 1, max: 4 },
    indexDEL: { type: Number, required: true },
  },
  { _id: false }
);

const dispositifSchema = new mongoose.Schema(
  {
    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: true,
      unique: true,
    },
    identifiantDispositif: {
      type: String,
      unique: true,
      sparse: true,

    },
    dernierContact: { type: Date, default: null },
    etatConnexion: {
      type: String,
      enum: ['CONNECTE', 'HORS_LIGNE'],
      default: 'HORS_LIGNE',
    },
    plagesHoraires: {
      type: [plageHoraireSchema],
      default: () => [1, 2, 3, 4].map((creneau) => ({ creneau })),
      validate: {
        validator: (v) => v.length === 4,
        message: 'Un dispositif a toujours exactement 4 plages horaires (RG-10).',
      },
    },
    compartiments: {
      type: [compartimentSchema],
      default: genererCompartiments,
      validate: {
        validator: (v) => v.length === 28,
        message: 'Un dispositif a toujours exactement 28 compartiments (7 jours × 4 créneaux).',
      },
    },

    prochaineFermetureEstReference: { type: Boolean, default: false },

    modeDemoDeconnecte: { type: Boolean, default: false },
  },
  { timestamps: true }
);

dispositifSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.models.Dispositif || mongoose.model('Dispositif', dispositifSchema);
module.exports.JOURS_ORDRE = JOURS_ORDRE;
module.exports.genererCompartiments = genererCompartiments;
