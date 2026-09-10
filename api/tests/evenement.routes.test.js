jest.mock('../src/services/evenementService');

const request = require('supertest');
const evenementService = require('../src/services/evenementService');
const createApp = require('../src/app');

const app = createApp();

describe('POST /api/evenements', () => {
  it("n'exige pas de jeton utilisateur (le circuit n'en a pas)", async () => {
    evenementService.enregistrerEvenement.mockResolvedValue({ evenement: { id: 'e1' }, verification: null });

    const res = await request(app)
      .post('/api/evenements')
      .send({ identifiantDispositif: 'ESP32-ABC', type: 'OUVERTURE', horodatage: new Date().toISOString() });

    expect(res.status).toBe(201);
    expect(res.body.evenements).toHaveLength(1);
    expect(res.body.evenements[0].id).toBe('e1');
    expect(res.body.evenements[0].verification).toBeNull();
  });

  it('accepte un tableau (lot envoyé après une coupure réseau, PC-43)', async () => {
    evenementService.enregistrerEvenement.mockResolvedValue({ evenement: { id: 'e1' }, verification: null });

    const res = await request(app)
      .post('/api/evenements')
      .send([
        { identifiantDispositif: 'ESP32-ABC', type: 'OUVERTURE', horodatage: new Date().toISOString() },
        { identifiantDispositif: 'ESP32-ABC', type: 'FERMETURE', horodatage: new Date().toISOString() },
      ]);

    expect(res.status).toBe(201);
    expect(evenementService.enregistrerEvenement).toHaveBeenCalledTimes(2);
  });

  it("une FERMETURE avec image renvoie le verdict de la vérification", async () => {
    evenementService.enregistrerEvenement.mockResolvedValue({
      evenement: { id: 'e5', type: 'FERMETURE' },
      verification: { id: 'v1', etatsZones: [{ indice: 0, occupee: true, score: 0.1 }], analyseEchouee: false },
    });

    const res = await request(app)
      .post('/api/evenements')
      .send({
        identifiantDispositif: 'ESP32-ABC',
        type: 'FERMETURE',
        horodatage: new Date().toISOString(),
        image: 'ZmFrZS1pbWFnZQ==',
      });

    expect(res.status).toBe(201);
    expect(res.body.evenements[0].verification.etatsZones).toHaveLength(1);
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
