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
});
