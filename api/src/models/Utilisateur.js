const mongoose = require('mongoose');

/**
 * Utilisateur (Partie A, diagramme de classes).
 * Le mot de passe n'est JAMAIS stocké en clair : seul son empreinte
 * bcrypt (`motDePasseHache`) est enregistrée, et `select: false` l'exclut
 * par défaut de toute lecture pour qu'un simple `find()` ne le renvoie
 * jamais par accident.
 */
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
      default: 'America/Toronto',
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
