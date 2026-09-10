const { creneauxDe } = require('../src/models/Medicament');
const priseService = require('../src/services/priseService');

describe('creneauxDe (ancien format et nouveau)', () => {
  it('renvoie la liste quand le médicament utilise le nouveau champ', () => {
    expect(creneauxDe({ creneaux: [1, 3] })).toEqual([1, 3]);
  });

  it("convertit l'ancien champ unique en liste d'un élément", () => {
    expect(creneauxDe({ creneau: 2 })).toEqual([2]);
  });

  it('privilégie le nouveau champ si les deux sont présents', () => {
    expect(creneauxDe({ creneaux: [4], creneau: 1 })).toEqual([4]);
  });

  it('renvoie une liste vide pour un médicament sans créneau', () => {
    expect(creneauxDe({})).toEqual([]);
    expect(creneauxDe(null)).toEqual([]);
  });
});

function faireDispositif(heures) {
  return {
    id: 'd1',
    plagesHoraires: heures.map((heure, i) => ({ creneau: i + 1, heure, delaiTolerance: 60 })),
    compartiments: Array.from({ length: 28 }, (_, indice) => ({
      indice,
      creneau: Math.floor(indice / 7) + 1,
      jourSemaine: ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'][indice % 7],
      indexDEL: indice,
    })),
  };
}

const TOUS_LES_JOURS = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];

describe('genererPrisesAttendues avec plusieurs créneaux', () => {
  it('génère une prise par créneau et par jour pour un médicament matin+soir', () => {
    const dispositif = faireDispositif(['08:00', null, '18:00', null]);
    const medicaments = [{ creneaux: [1, 3], joursSemaine: TOUS_LES_JOURS }];

    const prises = priseService.genererPrisesAttendues({ dispositif, medicaments });

    expect(prises).toHaveLength(14);
    const creneauxCouverts = new Set(prises.map((p) => Math.floor(p.compartimentIndice / 7) + 1));
    expect([...creneauxCouverts].sort()).toEqual([1, 3]);
  });

  it("un médicament à l'ancien format continue de produire ses prises", () => {
    const dispositif = faireDispositif(['08:00', null, null, null]);
    const medicaments = [{ creneau: 1, joursSemaine: ['LUNDI'] }];

    const prises = priseService.genererPrisesAttendues({ dispositif, medicaments });

    expect(prises).toHaveLength(1);
    expect(Math.floor(prises[0].compartimentIndice / 7) + 1).toBe(1);
  });

  it('ne double pas une prise quand deux médicaments partagent un créneau (RG-01)', () => {
    const dispositif = faireDispositif(['08:00', null, '18:00', null]);
    const medicaments = [
      { creneaux: [1, 3], joursSemaine: ['LUNDI'] },
      { creneaux: [1], joursSemaine: ['LUNDI'] },
    ];

    const prises = priseService.genererPrisesAttendues({ dispositif, medicaments });

    expect(prises).toHaveLength(2);
  });
});
