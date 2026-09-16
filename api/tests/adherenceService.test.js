jest.mock('../src/repositories/dispositifRepository');
jest.mock('../src/repositories/priseRepository');

const dispositifRepository = require('../src/repositories/dispositifRepository');
const priseRepository = require('../src/repositories/priseRepository');
const adherenceService = require('../src/services/adherenceService');

function prise(date, statut, origineConfirmation = null) {
  return { date, statut, origineConfirmation };
}

beforeEach(() => {
  dispositifRepository.trouverParUtilisateur.mockResolvedValue({ id: 'd1' });
  priseRepository.listerParPeriodePourDispositif.mockResolvedValue([]);
});

describe('adherenceService.obtenirHistorique', () => {
  it('demande au dépôt exactement la période voulue', async () => {
    await adherenceService.obtenirHistorique('u1', { dateFin: '2026-09-15', nombreJours: 7 });

    expect(priseRepository.listerParPeriodePourDispositif).toHaveBeenCalledWith('d1', '2026-09-09', '2026-09-15');
  });

  it("exclut les prises encore en attente du taux d'adhérence", async () => {
    priseRepository.listerParPeriodePourDispositif.mockResolvedValue([
      prise('2026-09-15', 'CONFIRMEE', 'AUTOMATIQUE'),
      prise('2026-09-15', 'CONFIRMEE', 'MANUELLE'),
      prise('2026-09-15', 'MANQUEE'),
      prise('2026-09-15', 'PREVUE'),
      prise('2026-09-15', 'AMBIGUE'),
    ]);

    const { resume } = await adherenceService.obtenirHistorique('u1', { dateFin: '2026-09-15', nombreJours: 1 });

    expect(resume.tauxAdherence).toBeCloseTo(2 / 3);
    expect(resume.enAttente).toBe(2);
    expect(resume.total).toBe(5);
  });

  it('distingue les confirmations automatiques des confirmations manuelles', async () => {
    priseRepository.listerParPeriodePourDispositif.mockResolvedValue([
      prise('2026-09-15', 'CONFIRMEE', 'AUTOMATIQUE'),
      prise('2026-09-15', 'CONFIRMEE', 'MANUELLE'),
      prise('2026-09-15', 'CONFIRMEE', 'MANUELLE'),
    ]);

    const { resume } = await adherenceService.obtenirHistorique('u1', { dateFin: '2026-09-15', nombreJours: 1 });

    expect(resume.confirmeesAutomatiquement).toBe(1);
    expect(resume.confirmeesManuellement).toBe(2);
  });

  it("renvoie un taux nul, et non zéro, quand aucune prise n'est encore réglée", async () => {
    priseRepository.listerParPeriodePourDispositif.mockResolvedValue([prise('2026-09-15', 'PREVUE')]);

    const { resume } = await adherenceService.obtenirHistorique('u1', { dateFin: '2026-09-15', nombreJours: 1 });

    expect(resume.tauxAdherence).toBeNull();
  });

  it('renvoie une ligne par jour, du plus ancien au plus récent, même les jours vides', async () => {
    priseRepository.listerParPeriodePourDispositif.mockResolvedValue([prise('2026-09-15', 'CONFIRMEE', 'AUTOMATIQUE')]);

    const { parJour, debut, fin } = await adherenceService.obtenirHistorique('u1', {
      dateFin: '2026-09-15',
      nombreJours: 3,
    });

    expect(parJour.map((j) => j.date)).toEqual(['2026-09-13', '2026-09-14', '2026-09-15']);
    expect(parJour[0].total).toBe(0);
    expect(parJour[0].tauxAdherence).toBeNull();
    expect(parJour[2].confirmees).toBe(1);
    expect(debut).toBe('2026-09-13');
    expect(fin).toBe('2026-09-15');
  });

  it('traverse correctement un changement de mois', async () => {
    const { parJour } = await adherenceService.obtenirHistorique('u1', { dateFin: '2026-10-02', nombreJours: 4 });

    expect(parJour.map((j) => j.date)).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
  });

  it('refuse un nombre de jours hors bornes', async () => {
    await expect(
      adherenceService.obtenirHistorique('u1', { dateFin: '2026-09-15', nombreJours: 0 })
    ).rejects.toMatchObject({ statusCode: 400 });

    await expect(
      adherenceService.obtenirHistorique('u1', { dateFin: '2026-09-15', nombreJours: 365 })
    ).rejects.toMatchObject({ statusCode: 400 });

    await expect(
      adherenceService.obtenirHistorique('u1', { dateFin: '2026-09-15', nombreJours: Number('abc') })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('renvoie 404 quand le compte n\'a aucun pilulier associé', async () => {
    dispositifRepository.trouverParUtilisateur.mockResolvedValue(null);

    await expect(
      adherenceService.obtenirHistorique('u1', { dateFin: '2026-09-15', nombreJours: 7 })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
