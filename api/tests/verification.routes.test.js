jest.mock('../src/services/authService');
jest.mock('../src/services/verificationService');

const request = require('supertest');
const authService = require('../src/services/authService');
const verificationService = require('../src/services/verificationService');
const createApp = require('../src/app');

const app = createApp();

beforeEach(() => {
  authService.verifierJeton.mockReturnValue('u1');
});

describe('GET /api/verifications/reference', () => {
  it('refuse sans jeton', async () => {
    const res = await request(app).get('/api/verifications/reference');
    expect(res.status).toBe(401);
  });

  it('renvoie la dernière photo de référence', async () => {
    verificationService.obtenirDerniereReferencePourUtilisateur.mockResolvedValue({
      id: 'v1',
      estReference: true,
      etatsZones: [{ indice: 0, occupee: false, score: 0.9 }],
    });

    const res = await request(app).get('/api/verifications/reference').set('Authorization', 'Bearer x');

    expect(res.status).toBe(200);
    expect(res.body.verification.id).toBe('v1');
  });

  it("renvoie 404 si aucune photo de référence n'existe encore", async () => {
    const ApiError = require('../src/utils/ApiError');
    verificationService.obtenirDerniereReferencePourUtilisateur.mockRejectedValue(
      ApiError.notFound('Aucune photo de référence pour ce dispositif pour le moment')
    );

    const res = await request(app).get('/api/verifications/reference').set('Authorization', 'Bearer x');

    expect(res.status).toBe(404);
  });
});
