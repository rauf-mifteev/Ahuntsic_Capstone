jest.mock('../src/repositories/medicamentRepository');
jest.mock('../src/repositories/priseRepository');
jest.mock('../src/services/dispositifService');

const medicamentRepository = require('../src/repositories/medicamentRepository');
const priseRepository = require('../src/repositories/priseRepository');
const dispositifService = require('../src/services/dispositifService');
const medicamentService = require('../src/services/medicamentService');

function faireDispositif(heures = ['08:00', '12:00', '18:00', '22:00'], associe = true) {
  return {
    id: 'd1',
    identifiantDispositif: associe ? 'ESP32-DEMO-001' : null,
    plagesHoraires: heures.map((heure, i) => ({ creneau: i + 1, heure, delaiTolerance: 60 })),
    compartiments: Array.from({ length: 28 }, (_, indice) => ({
      indice,
      creneau: Math.floor(indice / 7) + 1,
      jourSemaine: ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'][indice % 7],
      indexDEL: indice,
    })),
  };
}

function faireMedicament(surcharges = {}) {
  return {
    _id: 'm1',
    utilisateur: 'u1',
    nom: 'Metformine',
    dosage: '500 mg',
    notesApparence: '',
    creneaux: [1],
    joursSemaine: ['LUNDI'],
    ...surcharges,
  };
}

beforeEach(() => {
  dispositifService.obtenirParUtilisateur.mockResolvedValue(faireDispositif());
  dispositifService.fuseauHorairePour.mockResolvedValue('America/Toronto');
  medicamentRepository.listerParUtilisateur.mockResolvedValue([]);
  medicamentRepository.sauvegarder.mockImplementation((m) => Promise.resolve(m));
  priseRepository.listerParDispositif.mockResolvedValue([]);
  priseRepository.creerPlusieurs.mockResolvedValue([]);
});

describe('medicamentService.modifierMedicament', () => {
  it('modifie le dosage sans toucher au reste', async () => {
    const medicament = faireMedicament();
    medicamentRepository.trouverParId.mockResolvedValue(medicament);

    await medicamentService.modifierMedicament('u1', 'm1', { dosage: '850 mg' });

    expect(medicament.dosage).toBe('850 mg');
    expect(medicament.nom).toBe('Metformine');
    expect(medicament.creneaux).toEqual([1]);
    expect(medicamentRepository.sauvegarder).toHaveBeenCalledWith(medicament);
  });

  it('permet de passer un médicament de un à deux créneaux', async () => {
    const medicament = faireMedicament();
    medicamentRepository.trouverParId.mockResolvedValue(medicament);

    await medicamentService.modifierMedicament('u1', 'm1', { creneaux: [1, 3] });

    expect(medicament.creneaux).toEqual([1, 3]);
  });

  it("efface l'ancien champ `creneau` quand on modifie les créneaux", async () => {

    const medicament = faireMedicament({ creneaux: undefined, creneau: 2 });
    medicamentRepository.trouverParId.mockResolvedValue(medicament);

    await medicamentService.modifierMedicament('u1', 'm1', { creneaux: [4] });

    expect(medicament.creneaux).toEqual([4]);
    expect(medicament.creneau).toBeUndefined();
  });

  it('applique les mêmes validations qu’à la création', async () => {
    medicamentRepository.trouverParId.mockResolvedValue(faireMedicament());

    await expect(medicamentService.modifierMedicament('u1', 'm1', { creneaux: [] }))
      .rejects.toMatchObject({ statusCode: 400 });
    await expect(medicamentService.modifierMedicament('u1', 'm1', { creneaux: [9] }))
      .rejects.toMatchObject({ statusCode: 400 });
    await expect(medicamentService.modifierMedicament('u1', 'm1', { joursSemaine: [] }))
      .rejects.toMatchObject({ statusCode: 400 });
    await expect(medicamentService.modifierMedicament('u1', 'm1', { nom: '  ' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it("refuse un créneau sans heure configurée", async () => {
    dispositifService.obtenirParUtilisateur.mockResolvedValue(faireDispositif(['08:00', null, null, null]));
    medicamentRepository.trouverParId.mockResolvedValue(faireMedicament());

    await expect(medicamentService.modifierMedicament('u1', 'm1', { creneaux: [1, 2] }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it("renvoie 404 — pas 403 — pour le médicament de quelqu'un d'autre", async () => {

    medicamentRepository.trouverParId.mockResolvedValue(faireMedicament({ utilisateur: 'u2' }));

    await expect(medicamentService.modifierMedicament('u1', 'm1', { dosage: '1 g' }))
      .rejects.toMatchObject({ statusCode: 404 });
    expect(medicamentRepository.sauvegarder).not.toHaveBeenCalled();
  });

  it('renvoie 404 pour un médicament inexistant', async () => {
    medicamentRepository.trouverParId.mockResolvedValue(null);

    await expect(medicamentService.modifierMedicament('u1', 'inconnu', { dosage: '1 g' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('régénération des prises après un changement de traitement', () => {
  it('crée les prises manquantes quand on ajoute un médicament', async () => {

    medicamentRepository.creer.mockResolvedValue(faireMedicament());
    medicamentRepository.listerParUtilisateur.mockResolvedValue([faireMedicament()]);

    await medicamentService.creerMedicament('u1', {
      nom: 'Metformine', dosage: '500 mg', creneaux: [1], joursSemaine: ['LUNDI'],
    });

    expect(priseRepository.creerPlusieurs).toHaveBeenCalled();
    expect(priseRepository.creerPlusieurs.mock.calls[0][0].length).toBeGreaterThan(0);
  });

  it('régénère aussi après une modification', async () => {
    medicamentRepository.trouverParId.mockResolvedValue(faireMedicament());
    medicamentRepository.listerParUtilisateur.mockResolvedValue([faireMedicament({ creneaux: [1, 3] })]);

    await medicamentService.modifierMedicament('u1', 'm1', { creneaux: [1, 3] });

    expect(priseRepository.creerPlusieurs).toHaveBeenCalled();
  });

  it("n'insère rien si toutes les prises existent déjà (idempotence)", async () => {
    const medicament = faireMedicament();
    medicamentRepository.creer.mockResolvedValue(medicament);
    medicamentRepository.listerParUtilisateur.mockResolvedValue([medicament]);

    await medicamentService.creerMedicament('u1', {
      nom: 'Metformine', dosage: '500 mg', creneaux: [1], joursSemaine: ['LUNDI'],
    });
    const premieres = priseRepository.creerPlusieurs.mock.calls[0][0];
    expect(premieres.length).toBeGreaterThan(0);

    priseRepository.creerPlusieurs.mockClear();
    priseRepository.listerParDispositif.mockResolvedValue(
      premieres.map((p) => ({ compartimentIndice: p.compartimentIndice, date: p.date }))
    );

    await medicamentService.creerMedicament('u1', {
      nom: 'Metformine', dosage: '500 mg', creneaux: [1], joursSemaine: ['LUNDI'],
    });

    expect(priseRepository.creerPlusieurs).toHaveBeenCalledWith([]);
  });

  it('ne planifie rien tant que le pilulier n’est pas associé', async () => {
    dispositifService.obtenirParUtilisateur.mockResolvedValue(faireDispositif(undefined, false));
    medicamentRepository.creer.mockResolvedValue(faireMedicament());

    await medicamentService.creerMedicament('u1', {
      nom: 'Metformine', dosage: '500 mg', creneaux: [1], joursSemaine: ['LUNDI'],
    });

    expect(priseRepository.creerPlusieurs).not.toHaveBeenCalled();
  });
});
