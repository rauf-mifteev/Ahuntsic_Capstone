const mongoose = require('mongoose');

/**
 * ÉvénementOuverture (Partie A, diagramme de classes) : un événement brut
 * envoyé par le circuit (ouverture ou fermeture du couvercle). On garde
 * `identifiantDispositif` en plus de la référence `dispositif` : utile
 * pour déboguer sans jointure si un événement arrive juste après une
 * dissociation, et ça correspond à ce que le circuit envoie réellement.
 */
const evenementOuvertureSchema = new mongoose.Schema(
  {
    dispositif: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispositif', required: true, index: true },
    identifiantDispositif: { type: String, required: true },
    type: { type: String, enum: ['OUVERTURE', 'FERMETURE'], required: true },
    // Horodatage donné par le circuit (peut différer légèrement de la
    // réception si l'événement a été mis en mémoire tampon hors-ligne — PC-43).
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
