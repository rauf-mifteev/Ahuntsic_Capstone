jest.mock('../src/services/delService');

const request = require('supertest');
const delService = require('../src/services/delService');
const createApp = require('../src/app');

const app = createApp();

describe('GET /api/circuit/:identifiantDispositif/commandes-del', () => {
  it("n'exige pas de jeton utilisateur", async () => {
    delService.obtenirCommandesDel.mockResolvedValue({ indexDEL: [3, 10] });

    const res = await request(app).get('/api/circuit/ESP32-ABC/commandes-del');

    expect(res.status).toBe(200);
    expect(res.body.indexDEL).toEqual([3, 10]);
  });

  it('renvoie 401 pour un dispositif inconnu', async () => {
    const ApiError = require('../src/utils/ApiError');
    delService.obtenirCommandesDel.mockRejectedValue(ApiError.unauthorized('Dispositif inconnu'));

    const res = await request(app).get('/api/circuit/ID-INCONNU/commandes-del');

    expect(res.status).toBe(401);
  });
});
