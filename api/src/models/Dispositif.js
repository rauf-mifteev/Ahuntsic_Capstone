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

// Même convention d'ordre que zones.py (service Python) : indice = (créneau-1)*7 + position
// du jour dans JOURS_ORDRE. Les deux bouts du système (photo <-> base de données) doivent
// s'accorder sur CET ordre précis pour qu'un "indice de zone" renvoyé par le service d'analyse
// pointe vers le bon Compartiment sans ambiguïté.
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

/**
 * Compartiment (Partie A, diagramme de classes) : un couple (jour de
 * semaine, créneau) FIXE et récurrent — 28 par dispositif, créés une
 * seule fois (voir la note du diagramme de classes). Ce n'est PAS la
 * même chose qu'une Prise, qui porte une date précise et se répète
 * chaque semaine sur le même Compartiment.
 *
 * `indice` est ce que le service d'analyse d'images renvoie dans chaque
 * ScoreZone (voir analyse-images/zones.py) : c'est la clé qui relie une
 * zone de la photo à un Compartiment précis. `indexDEL` est la position
 * physique dans le bandeau de DEL adressables (PC-62) — ici toujours
 * égal à `indice`, ce qui est le choix de câblage le plus simple ; si le
 * câblage réel du boîtier diffère, seule cette correspondance change.
 */
const compartimentSchema = new mongoose.Schema(
  {
    indice: { type: Number, required: true, min: 0, max: 27 },
    jourSemaine: { type: String, enum: JOURS_ORDRE, required: true },
    creneau: { type: Number, required: true, min: 1, max: 4 },
    indexDEL: { type: Number, required: true },
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
 * On en déduit qu'un Dispositif "en attente" (identifiantDispositif absent
 * tant qu'il n'est pas associé — voir la note sur ce champ plus bas)
 * existe dès la création du compte, avec ses 4 PlageHoraire ET ses 28
 * Compartiment déjà en place. "Associer le pilulier" (PC-37/38) ne crée
 * donc pas un nouveau Dispositif : ça renseigne son identifiantDispositif.
 * Ça respecte la cardinalité 1—1 du diagramme de classes ET l'ordre du
 * diagramme de séquence sans les contredire.
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
      unique: true,
      sparse: true,
      // Pas de `default: null` ici : c'est la cause d'un vrai bogue trouvé
      // en test. Un index "sparse" exclut les documents où le champ est
      // ABSENT — mais si Mongoose lui donne explicitement la valeur `null`
      // (ce que fait un `default: null`), le champ EXISTE avec cette
      // valeur, et l'index sparse+unique le compte quand même. Résultat :
      // le premier compte créé passait, puis chaque compte suivant
      // échouait sur une erreur MongoDB E11000 (clé dupliquée) au moment
      // de créer son Dispositif — après que l'Utilisateur ait déjà été
      // enregistré, d'où le "Erreur interne du serveur" alors que le
      // compte existait bel et bien en base. En laissant le champ
      // simplement absent tant qu'il n'est pas renseigné (voir
      // associerDispositif), l'index sparse fonctionne comme prévu.
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
    // RG-13 : posé par POST /api/dispositifs/moi/confirmer-remplissage (PC-57),
    // lu puis remis à false par evenementService dès que la prochaine
    // FERMETURE avec photo arrive — voir la note de conception dans
    // services/evenementService.js.
    prochaineFermetureEstReference: { type: Boolean, default: false },
    // PC-70 : bascule de démonstration. Tant qu'actif, les points d'entrée
    // appelés par le circuit (/evenements, /circuit/.../commandes-del)
    // répondent 503 pour CE dispositif — ce qui provoque un vrai échec
    // réseau côté circuit et déclenche la mémoire tampon déjà construite
    // en PC-43, sans qu'aucun code du firmware n'ait à changer.
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
