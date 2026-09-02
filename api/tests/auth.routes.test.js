jest.mock('../src/services/authService');

const request = require('supertest');
const authService = require('../src/services/authService');
const createApp = require('../src/app');

const app = createApp();

describe('POST /api/comptes', () => {
  it('crée un compte et renvoie 201 avec un jeton', async () => {
    authService.inscrire.mockResolvedValue({
      utilisateur: { id: '1', courriel: 'a@b.com' },
      jeton: 'jeton-fictif',
    });

    const res = await request(app)
      .post('/api/comptes')
      .send({ courriel: 'a@b.com', motDePasse: 'motdepasse123' });

    expect(res.status).toBe(201);
    expect(res.body.jeton).toBe('jeton-fictif');
    expect(res.body.utilisateur.courriel).toBe('a@b.com');
  });

  it('propage le code 409 renvoyé par le service (courriel déjà pris)', async () => {
    const ApiError = require('../src/utils/ApiError');
    authService.inscrire.mockRejectedValue(ApiError.conflict('Impossible de créer ce compte'));

    const res = await request(app)
      .post('/api/comptes')
      .send({ courriel: 'a@b.com', motDePasse: 'motdepasse123' });

    expect(res.status).toBe(409);
  });
});

describe('POST /api/comptes/connexion', () => {
  it('connecte avec succès et renvoie un jeton', async () => {
    authService.connecter.mockResolvedValue({
      utilisateur: { id: '1', courriel: 'a@b.com' },
      jeton: 'jeton-fictif',
    });

    const res = await request(app)
      .post('/api/comptes/connexion')
      .send({ courriel: 'a@b.com', motDePasse: 'motdepasse123' });

    expect(res.status).toBe(200);
    expect(res.body.jeton).toBe('jeton-fictif');
  });

  it('renvoie 401 pour de mauvais identifiants', async () => {
    const ApiError = require('../src/utils/ApiError');
    authService.connecter.mockRejectedValue(ApiError.unauthorized('Courriel ou mot de passe invalide'));

    const res = await request(app)
      .post('/api/comptes/connexion')
      .send({ courriel: 'a@b.com', motDePasse: 'mauvais' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/comptes/moi (route protégée)', () => {
  it("refuse l'accès sans jeton (401)", async () => {
    const res = await request(app).get('/api/comptes/moi');
    expect(res.status).toBe(401);
  });

  it('refuse un jeton invalide (401)', async () => {
    const ApiError = require('../src/utils/ApiError');
    authService.verifierJeton.mockImplementation(() => {
      throw ApiError.unauthorized('Jeton invalide ou expiré');
    });

    const res = await request(app)
      .get('/api/comptes/moi')
      .set('Authorization', 'Bearer jeton-invalide');
    expect(res.status).toBe(401);
  });

  it('accepte un jeton valide et renvoie le compte', async () => {
    authService.verifierJeton.mockReturnValue('64f000000000000000000001');
    authService.obtenirParId.mockResolvedValue({ id: '64f000000000000000000001', courriel: 'a@b.com' });

    const res = await request(app)
      .get('/api/comptes/moi')
      .set('Authorization', 'Bearer jeton-valide');

    expect(res.status).toBe(200);
    expect(res.body.utilisateur.courriel).toBe('a@b.com');
  });
});
