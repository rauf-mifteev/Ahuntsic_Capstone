jest.mock('../src/repositories/priseRepository');

const priseRepository = require('../src/repositories/priseRepository');
const priseService = require('../src/services/priseService');

function faireDispositif(heures = ['08:00', '12:00', '18:00', '22:00']) {
  return {
    id: 'd1',
    plagesHoraires: heures.map((heure, i) => ({ creneau: i + 1, heure, delaiTolerance: 60 })),
  };
}

function fairePrise(surcharges = {}) {
  return {
    compartimentIndice: 0,
    date: '2026-07-15',
    heurePrevue: new Date('2026-07-15T12:00:00.000Z'),
    delaiTolerance: 60,
    statut: 'PREVUE',
    ...surcharges,
  };
}

beforeEach(() => {
  priseRepository.sauvegarder.mockImplementation((p) => Promise.resolve(p));
});

describe('replanifierPrisesAVenir', () => {
  it("déplace une prise PREVUE quand l'heure de son créneau change", async () => {
    const prise = fairePrise();
    priseRepository.listerReplanifiablesPourDispositif.mockResolvedValue([prise]);

    await priseService.replanifierPrisesAVenir({
      dispositif: faireDispositif(['09:30', '12:00', '18:00', '22:00']),
      creneauxModifies: [1],
      fuseauHoraire: 'America/Toronto',
    });

    expect(prise.heurePrevue.toISOString()).toBe('2026-07-15T13:30:00.000Z');
    expect(priseRepository.sauvegarder).toHaveBeenCalledWith(prise);
  });

  it("déplace aussi une prise dont l'heure est DÉJÀ passée", async () => {

    const prise = fairePrise({ heurePrevue: new Date('2000-01-01T12:00:00.000Z') });
    priseRepository.listerReplanifiablesPourDispositif.mockResolvedValue([prise]);

    await priseService.replanifierPrisesAVenir({
      dispositif: faireDispositif(['09:30', '12:00', '18:00', '22:00']),
      creneauxModifies: [1],
      fuseauHoraire: 'America/Toronto',
    });

    expect(prise.heurePrevue.toISOString()).toBe('2026-07-15T13:30:00.000Z');
  });

  it("ne touche pas les créneaux qui n'ont pas changé", async () => {
    const prise = fairePrise({ compartimentIndice: 14 });
    priseRepository.listerReplanifiablesPourDispositif.mockResolvedValue([prise]);

    await priseService.replanifierPrisesAVenir({
      dispositif: faireDispositif(),
      creneauxModifies: [1],
      fuseauHoraire: 'America/Toronto',
    });

    expect(priseRepository.sauvegarder).not.toHaveBeenCalled();
  });

  it('ne touche jamais une prise déjà engagée ou résolue (RG-06)', async () => {

    priseRepository.listerReplanifiablesPourDispositif.mockResolvedValue([]);

    await priseService.replanifierPrisesAVenir({
      dispositif: faireDispositif(['09:30', '12:00', '18:00', '22:00']),
      creneauxModifies: [1],
      fuseauHoraire: 'America/Toronto',
    });

    expect(priseRepository.listerReplanifiablesPourDispositif).toHaveBeenCalledWith('d1');
    expect(priseRepository.sauvegarder).not.toHaveBeenCalled();
  });

  it("n'écrit rien quand l'heure recalculée est identique", async () => {
    const prise = fairePrise();
    priseRepository.listerReplanifiablesPourDispositif.mockResolvedValue([prise]);

    await priseService.replanifierPrisesAVenir({
      dispositif: faireDispositif(),
      creneauxModifies: [1],
      fuseauHoraire: 'America/Toronto',
    });

    expect(priseRepository.sauvegarder).not.toHaveBeenCalled();
  });

  it('ne fait rien si aucun créneau n’a changé', async () => {
    await priseService.replanifierPrisesAVenir({
      dispositif: faireDispositif(),
      creneauxModifies: [],
      fuseauHoraire: 'America/Toronto',
    });

    expect(priseRepository.listerReplanifiablesPourDispositif).not.toHaveBeenCalled();
  });

  it('reporte aussi le délai de tolérance', async () => {
    const prise = fairePrise();
    priseRepository.listerReplanifiablesPourDispositif.mockResolvedValue([prise]);
    const dispositif = faireDispositif();
    dispositif.plagesHoraires[0].delaiTolerance = 30;

    await priseService.replanifierPrisesAVenir({
      dispositif,
      creneauxModifies: [1],
      fuseauHoraire: 'America/Toronto',
    });

    expect(prise.delaiTolerance).toBe(30);
  });
});
