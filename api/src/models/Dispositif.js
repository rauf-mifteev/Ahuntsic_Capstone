const mongoose = require('mongoose');

/**
 * PlageHoraire (Partie A, diagramme de classes) : un des 4 moments de
 * prise possibles dans une journée. Sous-document, jamais manipulé seul
 * (pas de _id ni de repository dédié) : il n'existe qu'à l'intérieur d'un
 * Dispositif, avec lequel il a un cycle de vie lié 1..4 (cardinalité
 * stricte du diagramme de classes).
 */
const plageHoraireSchema = new mongoose.Schema(
  {
    creneau: { type: Number, required: true, min: 1, max: 4 },
    // null tant que le patient n'a pas choisi d'heure pour ce créneau.
    heure: { type: String, default: null, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure invalide (HH:mm)'] },
    // Délai de tolérance avant qu'une prise sur ce créneau soit jugée manquée (RG-05).
    delaiTolerance: { type: Number, default: 60, min: 5 }, // minutes
  },
  { _id: false }
);

/**
 * Dispositif (le "pilulier" du patient).
 *
 * Décision de conception (documentée pour la revue) : le diagramme de
 * classes fixe une cardinalité stricte 1—1 entre Utilisateur et
 * Dispositif, et 1—4 entre Dispositif et PlageHoraire. Le diagramme de
 * séquence 04_sequence_configuration.puml montre aussi le patient
 * attribuer une heure à ses créneaux (PUT /dispositifs/{id}/plages-horaires)
 * AVANT d'associer un pilulier physique/simulé (POST /dispositifs/associer).
 *
 * On en déduit qu'un Dispositif "en attente" (identifiantDispositif = null)
 * existe dès la création du compte, avec ses 4 PlageHoraire déjà en place
 * mais sans heure. "Associer le pilulier" (PC-37/38) ne crée donc pas un
 * nouveau Dispositif : ça renseigne son identifiantDispositif. Ça respecte
 * la cardinalité 1—1 du diagramme de classes ET l'ordre du diagramme de
 * séquence sans les contredire.
 */
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
      default: null,
      unique: true,
      sparse: true, // plusieurs documents peuvent avoir `null` sans violer l'unicité
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
