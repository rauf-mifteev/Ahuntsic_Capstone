jest.mock('../src/repositories/medicamentRepository');
jest.mock('../src/services/dispositifService');

const medicamentRepository = require('../src/repositories/medicamentRepository');
const dispositifService = require('../src/services/dispositifService');
const medicamentService = require('../src/services/medicamentService');

function faireDispositif(heures = ['08:00', null, null, null]) {
  return {
    plagesHoraires: heures.map((heure, i) => ({ creneau: i + 1, heure, delaiTolerance: 60 })),
  };
}

const medicamentValide = {
  nom: 'Metformine',
  dosage: '500 mg',
  creneau: 1,
  joursSemaine: ['LUNDI', 'MERCREDI', 'VENDREDI'],
};

describe('medicamentService.creerMedicament', () => {
  it('refuse un nom vide', async () => {
    await expect(
      medicamentService.creerMedicament('u1', { ...medicamentValide, nom: '  ' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuse un créneau invalide', async () => {
    await expect(
      medicamentService.creerMedicament('u1', { ...medicamentValide, creneau: 9 })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuse une liste de jours vide', async () => {
    await expect(
      medicamentService.creerMedicament('u1', { ...medicamentValide, joursSemaine: [] })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuse un jour invalide', async () => {
    await expect(
      medicamentService.creerMedicament('u1', { ...medicamentValide, joursSemaine: ['FUNDI'] })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("refuse si le créneau visé n'a pas encore d'heure configurée (RG-02/RG-10)", async () => {
    dispositifService.obtenirParUtilisateur.mockResolvedValue(faireDispositif([null, null, null, null]));

    await expect(medicamentService.creerMedicament('u1', medicamentValide)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(medicamentRepository.creer).not.toHaveBeenCalled();
  });

  it('crée le médicament quand le créneau a une heure', async () => {
    dispositifService.obtenirParUtilisateur.mockResolvedValue(faireDispositif(['08:00', null, null, null]));
    medicamentRepository.creer.mockResolvedValue({ id: 'm1', ...medicamentValide });

    const resultat = await medicamentService.creerMedicament('u1', medicamentValide);

    expect(medicamentRepository.creer).toHaveBeenCalledWith(
      expect.objectContaining({ utilisateur: 'u1', nom: 'Metformine', creneau: 1 })
    );
    expect(resultat.id).toBe('m1');
  });
});

describe('medicamentService.listerMedicaments', () => {
  it("délègue au dépôt", async () => {
    medicamentRepository.listerParUtilisateur.mockResolvedValue([{ id: 'm1' }]);
    const resultat = await medicamentService.listerMedicaments('u1');
    expect(resultat).toEqual([{ id: 'm1' }]);
    expect(medicamentRepository.listerParUtilisateur).toHaveBeenCalledWith('u1');
  });
});
