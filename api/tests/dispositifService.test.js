jest.mock('../src/repositories/dispositifRepository');

const dispositifRepository = require('../src/repositories/dispositifRepository');
const dispositifService = require('../src/services/dispositifService');

function faireDispositif() {
  return {
    id: 'd1',
    utilisateur: 'u1',
    identifiantDispositif: null,
    plagesHoraires: [1, 2, 3, 4].map((creneau) => ({ creneau, heure: null, delaiTolerance: 60 })),
  };
}

describe('dispositifService.mettreAJourPlagesHoraires', () => {
  it('refuse si les 4 créneaux ne sont pas tous fournis (RG-10)', async () => {
    dispositifRepository.trouverParUtilisateur.mockResolvedValue(faireDispositif());

    await expect(
      dispositifService.mettreAJourPlagesHoraires('u1', [{ creneau: 1, heure: '08:00' }])
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuse un créneau hors de 1 à 4', async () => {
    dispositifRepository.trouverParUtilisateur.mockResolvedValue(faireDispositif());

    const plages = [
      { creneau: 5, heure: '08:00' },
      { creneau: 2, heure: '12:00' },
      { creneau: 3, heure: '18:00' },
      { creneau: 4, heure: '21:00' },
    ];

    await expect(dispositifService.mettreAJourPlagesHoraires('u1', plages)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("refuse une heure mal formée", async () => {
    dispositifRepository.trouverParUtilisateur.mockResolvedValue(faireDispositif());

    const plages = [
      { creneau: 1, heure: '8h00' },
      { creneau: 2, heure: '12:00' },
      { creneau: 3, heure: '18:00' },
      { creneau: 4, heure: '21:00' },
    ];

    await expect(dispositifService.mettreAJourPlagesHoraires('u1', plages)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('met à jour les 4 créneaux et sauvegarde le dispositif', async () => {
    const dispositif = faireDispositif();
    dispositifRepository.trouverParUtilisateur.mockResolvedValue(dispositif);
    dispositifRepository.sauvegarder.mockResolvedValue(dispositif);

    const plages = [
      { creneau: 1, heure: '08:00' },
      { creneau: 2, heure: '12:00' },
      { creneau: 3, heure: '18:00' },
      { creneau: 4, heure: '21:00' },
    ];

    const resultat = await dispositifService.mettreAJourPlagesHoraires('u1', plages);

    expect(resultat.plagesHoraires.map((p) => p.heure)).toEqual(['08:00', '12:00', '18:00', '21:00']);
    expect(dispositifRepository.sauvegarder).toHaveBeenCalledWith(dispositif);
  });
});

describe('dispositifService.obtenirParUtilisateur', () => {
  it("lève une 404 si l'utilisateur n'a pas de dispositif", async () => {
    dispositifRepository.trouverParUtilisateur.mockResolvedValue(null);

    await expect(dispositifService.obtenirParUtilisateur('u1')).rejects.toMatchObject({ statusCode: 404 });
  });
});
