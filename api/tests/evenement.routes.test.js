jest.mock('../src/services/evenementService');

const request = require('supertest');
const evenementService = require('../src/services/evenementService');
const createApp = require('../src/app');

const app = createApp();

describe('POST /api/evenements', () => {
  it("n'exige pas de jeton utilisateur (le circuit n'en a pas)", async () => {
    evenementService.enregistrerEvenement.mockResolvedValue({ id: 'e1' });

    const res = await request(app)
      .post('/api/evenements')
      .send({ identifiantDispositif: 'ESP32-ABC', type: 'OUVERTURE', horodatage: new Date().toISOString() });

    expect(res.status).toBe(201);
    expect(res.body.evenements).toHaveLength(1);
  });

  it('accepte un tableau (lot envoyé après une coupure réseau, PC-43)', async () => {
    evenementService.enregistrerEvenement.mockResolvedValue({ id: 'e1' });

    const res = await request(app)
      .post('/api/evenements')
      .send([
        { identifiantDispositif: 'ESP32-ABC', type: 'OUVERTURE', horodatage: new Date().toISOString() },
        { identifiantDispositif: 'ESP32-ABC', type: 'FERMETURE', horodatage: new Date().toISOString() },
      ]);

    expect(res.status).toBe(201);
    expect(evenementService.enregistrerEvenement).toHaveBeenCalledTimes(2);
  });

  it('renvoie 401 pour un dispositif inconnu', async () => {
    const ApiError = require('../src/utils/ApiError');
    evenementService.enregistrerEvenement.mockRejectedValue(
      ApiError.unauthorized('Dispositif inconnu ou non associé à un compte')
    );

    const res = await request(app)
      .post('/api/evenements')
      .send({ identifiantDispositif: 'ESP32-INCONNU', type: 'OUVERTURE', horodatage: new Date().toISOString() });

    expect(res.status).toBe(401);
  });
});
