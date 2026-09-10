jest.mock('../src/services/authService');
jest.mock('../src/services/priseService');

const request = require('supertest');
const authService = require('../src/services/authService');
const priseService = require('../src/services/priseService');
const createApp = require('../src/app');

const app = createApp();

beforeEach(() => {
  authService.verifierJeton.mockReturnValue('u1');
});

describe('GET /api/prises', () => {
  it('refuse sans jeton', async () => {
    const res = await request(app).get('/api/prises');
    expect(res.status).toBe(401);
  });

  it('liste les prises du jour par défaut', async () => {
    priseService.listerPourUtilisateurEtDate.mockResolvedValue([{ id: 'p1' }]);

    const res = await request(app).get('/api/prises').set('Authorization', 'Bearer x');

    expect(res.status).toBe(200);
    expect(res.body.prises).toHaveLength(1);
    expect(priseService.listerPourUtilisateurEtDate).toHaveBeenCalledWith(
      'u1',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    );
  });

  it('accepte une date explicite en paramètre', async () => {
    priseService.listerPourUtilisateurEtDate.mockResolvedValue([]);

    await request(app).get('/api/prises?date=2026-09-01').set('Authorization', 'Bearer x');

    expect(priseService.listerPourUtilisateurEtDate).toHaveBeenCalledWith('u1', '2026-09-01');
  });
});

describe('GET /api/prises/:id', () => {
  it("renvoie la prise si elle appartient au compte", async () => {
    priseService.obtenirPrisePourUtilisateur.mockResolvedValue({ id: 'p1', statut: 'AMBIGUE' });

    const res = await request(app).get('/api/prises/p1').set('Authorization', 'Bearer x');

    expect(res.status).toBe(200);
    expect(res.body.prise.id).toBe('p1');
  });

  it("renvoie 404 pour une prise qui n'existe pas ou ne nous appartient pas", async () => {
    const ApiError = require('../src/utils/ApiError');
    priseService.obtenirPrisePourUtilisateur.mockRejectedValue(ApiError.notFound('Prise introuvable'));

    const res = await request(app).get('/api/prises/p1').set('Authorization', 'Bearer x');

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/prises/:id/confirmer', () => {
  it('confirme manuellement une prise ambiguë', async () => {
    priseService.obtenirPrisePourUtilisateur.mockResolvedValue({ id: 'p1', statut: 'AMBIGUE' });
    priseService.confirmerManuellement.mockResolvedValue({ id: 'p1', statut: 'CONFIRMEE', origineConfirmation: 'MANUELLE' });

    const res = await request(app).put('/api/prises/p1/confirmer').set('Authorization', 'Bearer x');

    expect(res.status).toBe(200);
    expect(res.body.prise.statut).toBe('CONFIRMEE');
  });

  it('renvoie 404 pour une prise qui ne nous appartient pas', async () => {
    const ApiError = require('../src/utils/ApiError');
    priseService.obtenirPrisePourUtilisateur.mockRejectedValue(ApiError.notFound('Prise introuvable'));

    const res = await request(app).put('/api/prises/p1/confirmer').set('Authorization', 'Bearer x');

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/prises/:id/annuler-confirmation', () => {
  it('garde la prise ambiguë (RG-06)', async () => {
    priseService.obtenirPrisePourUtilisateur.mockResolvedValue({ id: 'p1', statut: 'AMBIGUE' });
    priseService.annulerConfirmation.mockResolvedValue({ id: 'p1', statut: 'AMBIGUE' });

    const res = await request(app).put('/api/prises/p1/annuler-confirmation').set('Authorization', 'Bearer x');

    expect(res.status).toBe(200);
    expect(res.body.prise.statut).toBe('AMBIGUE');
  });

  it('propage un conflit 409 si la prise n\'est pas ambiguë', async () => {
    const ApiError = require('../src/utils/ApiError');
    priseService.obtenirPrisePourUtilisateur.mockResolvedValue({ id: 'p1', statut: 'PREVUE' });
    priseService.annulerConfirmation.mockRejectedValue(ApiError.conflict('Seule une prise ambiguë peut être annulée'));

    const res = await request(app).put('/api/prises/p1/annuler-confirmation').set('Authorization', 'Bearer x');

    expect(res.status).toBe(409);
  });
});
