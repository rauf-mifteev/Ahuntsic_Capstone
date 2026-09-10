jest.mock('../src/services/authService');
jest.mock('../src/services/dispositifService');
jest.mock('../src/services/medicamentService');

const request = require('supertest');
const authService = require('../src/services/authService');
const dispositifService = require('../src/services/dispositifService');
const medicamentService = require('../src/services/medicamentService');
const createApp = require('../src/app');

const app = createApp();

beforeEach(() => {
  authService.verifierJeton.mockReturnValue('u1');
});

describe('Routes /dispositifs', () => {
  it('refuse sans jeton', async () => {
    const res = await request(app).get('/api/dispositifs/moi');
    expect(res.status).toBe(401);
  });

  it('GET /api/dispositifs/moi renvoie le dispositif du compte connecté', async () => {
    dispositifService.obtenirParUtilisateur.mockResolvedValue({ id: 'd1', identifiantDispositif: null });

    const res = await request(app).get('/api/dispositifs/moi').set('Authorization', 'Bearer x');

    expect(res.status).toBe(200);
    expect(res.body.dispositif.id).toBe('d1');
  });

  it('PUT /api/dispositifs/moi/plages-horaires met à jour les créneaux', async () => {
    dispositifService.mettreAJourPlagesHoraires.mockResolvedValue({ id: 'd1' });

    const plagesHoraires = [
      { creneau: 1, heure: '08:00' },
      { creneau: 2, heure: '12:00' },
      { creneau: 3, heure: '18:00' },
      { creneau: 4, heure: '21:00' },
    ];

    const res = await request(app)
      .put('/api/dispositifs/moi/plages-horaires')
      .set('Authorization', 'Bearer x')
      .send({ plagesHoraires });

    expect(res.status).toBe(200);
    expect(dispositifService.mettreAJourPlagesHoraires).toHaveBeenCalledWith('u1', plagesHoraires);
  });

  it('POST /api/dispositifs/associer associe le pilulier et renvoie le nombre de prises générées', async () => {
    dispositifService.associerDispositif.mockResolvedValue({
      dispositif: { id: 'd1', identifiantDispositif: 'ESP32-ABC' },
      nombrePrisesGenerees: 5,
    });

    const res = await request(app)
      .post('/api/dispositifs/associer')
      .set('Authorization', 'Bearer x')
      .send({ identifiantDispositif: 'ESP32-ABC' });

    expect(res.status).toBe(200);
    expect(res.body.nombrePrisesGenerees).toBe(5);
    expect(dispositifService.associerDispositif).toHaveBeenCalledWith(
      'u1',
      'ESP32-ABC',
      expect.objectContaining({ medicamentRepository: expect.anything(), priseService: expect.anything() })
    );
  });

  it('propage un conflit 409 si le pilulier est déjà associé (RG-09)', async () => {
    const ApiError = require('../src/utils/ApiError');
    dispositifService.associerDispositif.mockRejectedValue(
      ApiError.conflict('Ce compte est déjà associé à un pilulier (RG-09)')
    );

    const res = await request(app)
      .post('/api/dispositifs/associer')
      .set('Authorization', 'Bearer x')
      .send({ identifiantDispositif: 'ESP32-ABC' });

    expect(res.status).toBe(409);
  });

  it('POST /api/dispositifs/moi/confirmer-remplissage pose le drapeau de référence (RG-13)', async () => {
    dispositifService.demanderPhotoReference.mockResolvedValue({
      id: 'd1',
      prochaineFermetureEstReference: true,
    });

    const res = await request(app)
      .post('/api/dispositifs/moi/confirmer-remplissage')
      .set('Authorization', 'Bearer x');

    expect(res.status).toBe(200);
    expect(res.body.dispositif.prochaineFermetureEstReference).toBe(true);
  });
});

describe('Routes /medicaments', () => {
  it('POST /api/medicaments crée un médicament (201)', async () => {
    medicamentService.creerMedicament.mockResolvedValue({ id: 'm1', nom: 'Metformine' });

    const res = await request(app)
      .post('/api/medicaments')
      .set('Authorization', 'Bearer x')
      .send({ nom: 'Metformine', dosage: '500 mg', creneau: 1, joursSemaine: ['LUNDI'] });

    expect(res.status).toBe(201);
    expect(res.body.medicament.id).toBe('m1');
  });

  it('propage une erreur 400 du service (créneau sans heure)', async () => {
    const ApiError = require('../src/utils/ApiError');
    medicamentService.creerMedicament.mockRejectedValue(
      ApiError.badRequest("Choisissez d'abord une heure pour ce créneau")
    );

    const res = await request(app)
      .post('/api/medicaments')
      .set('Authorization', 'Bearer x')
      .send({ nom: 'Metformine', dosage: '500 mg', creneau: 1, joursSemaine: ['LUNDI'] });

    expect(res.status).toBe(400);
  });

  it('GET /api/medicaments liste les médicaments du compte connecté', async () => {
    medicamentService.listerMedicaments.mockResolvedValue([{ id: 'm1' }, { id: 'm2' }]);

    const res = await request(app).get('/api/medicaments').set('Authorization', 'Bearer x');

    expect(res.status).toBe(200);
    expect(res.body.medicaments).toHaveLength(2);
  });

  it('POST /api/medicaments accepte plusieurs créneaux', async () => {
    medicamentService.creerMedicament.mockResolvedValue({ id: 'm1', creneaux: [1, 3] });

    const res = await request(app)
      .post('/api/medicaments')
      .set('Authorization', 'Bearer x')
      .send({ nom: 'Metformine', dosage: '500 mg', creneaux: [1, 3], joursSemaine: ['LUNDI'] });

    expect(res.status).toBe(201);
    expect(medicamentService.creerMedicament).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ creneaux: [1, 3] })
    );
  });

  it('PUT /api/medicaments/:id modifie un médicament (200)', async () => {
    medicamentService.modifierMedicament.mockResolvedValue({ id: 'm1', dosage: '850 mg' });

    const res = await request(app)
      .put('/api/medicaments/m1')
      .set('Authorization', 'Bearer x')
      .send({ dosage: '850 mg', creneaux: [1, 3] });

    expect(res.status).toBe(200);
    expect(res.body.medicament.dosage).toBe('850 mg');
    expect(medicamentService.modifierMedicament).toHaveBeenCalledWith(
      'u1',
      'm1',
      expect.objectContaining({ dosage: '850 mg', creneaux: [1, 3] })
    );
  });

  it('PUT /api/medicaments/:id refuse sans jeton', async () => {
    const res = await request(app).put('/api/medicaments/m1').send({ dosage: '850 mg' });
    expect(res.status).toBe(401);
  });

  it('PUT /api/medicaments/:id propage le 404 du service', async () => {
    const ApiError = require('../src/utils/ApiError');
    medicamentService.modifierMedicament.mockRejectedValue(ApiError.notFound('Médicament introuvable'));

    const res = await request(app)
      .put('/api/medicaments/inconnu')
      .set('Authorization', 'Bearer x')
      .send({ dosage: '850 mg' });

    expect(res.status).toBe(404);
  });
});
