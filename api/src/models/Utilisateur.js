const mongoose = require('mongoose');

const FUSEAU_PAR_DEFAUT = 'America/Toronto';

const utilisateurSchema = new mongoose.Schema(
  {
    courriel: {
      type: String,
      required: [true, 'Le courriel est requis'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Courriel invalide'],
    },
    motDePasseHache: {
      type: String,
      required: true,
      select: false,
    },
    fuseauHoraire: {
      type: String,
      default: FUSEAU_PAR_DEFAUT,
    },
    preferences: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

utilisateurSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.motDePasseHache;
    return ret;
  },
});

module.exports = mongoose.models.Utilisateur || mongoose.model('Utilisateur', utilisateurSchema);
module.exports.FUSEAU_PAR_DEFAUT = FUSEAU_PAR_DEFAUT;
