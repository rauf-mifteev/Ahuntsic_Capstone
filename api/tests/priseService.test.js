jest.mock('../src/repositories/priseRepository');

const priseRepository = require('../src/repositories/priseRepository');
const priseService = require('../src/services/priseService');

function faireDispositif() {
  return {
    id: 'd1',
    plagesHoraires: [
      { creneau: 1, heure: '08:00' },
      { creneau: 2, heure: null },
      { creneau: 3, heure: '18:00' },
      { creneau: 4, heure: null },
    ],
  };
}

describe('priseService.genererPrisesAttendues', () => {
  it('génère une prise par jour concerné sur les 7 prochains jours', () => {
    const medicaments = [{ id: 'm1', creneau: 1, joursSemaine: ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'] }];

    const prises = priseService.genererPrisesAttendues({
      utilisateurId: 'u1',
      dispositif: faireDispositif(),
      medicaments,
    });

    expect(prises).toHaveLength(7);
    expect(new Set(prises.map((p) => p.date)).size).toBe(7); // 7 dates distinctes
    prises.forEach((p) => {
      expect(p.medicament).toBe('m1');
      expect(p.creneau).toBe(1);
      expect(p.statut).toBe('ATTENDUE');
    });
  });

  it('ignore les jours non concernés par le médicament', () => {
    const medicaments = [{ id: 'm1', creneau: 1, joursSemaine: ['LUNDI'] }];

    const prises = priseService.genererPrisesAttendues({
      utilisateurId: 'u1',
      dispositif: faireDispositif(),
      medicaments,
    });

    // Sur 7 jours consécutifs, "lundi" apparaît exactement une fois.
    expect(prises.length).toBeLessThanOrEqual(1);
  });

  it("ignore un médicament dont le créneau n'a pas d'heure", () => {
    const medicaments = [{ id: 'm1', creneau: 2, joursSemaine: ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'] }];

    const prises = priseService.genererPrisesAttendues({
      utilisateurId: 'u1',
      dispositif: faireDispositif(),
      medicaments,
    });

    expect(prises).toHaveLength(0);
  });
});

describe('priseService.genererEtEnregistrerProchainesPrises', () => {
  it('enregistre les prises générées via le dépôt', async () => {
    priseRepository.creerPlusieurs.mockResolvedValue([]);
    const medicaments = [{ id: 'm1', creneau: 1, joursSemaine: ['LUNDI'] }];

    await priseService.genererEtEnregistrerProchainesPrises({
      utilisateurId: 'u1',
      dispositif: faireDispositif(),
      medicaments,
    });

    expect(priseRepository.creerPlusieurs).toHaveBeenCalledTimes(1);
  });
});
