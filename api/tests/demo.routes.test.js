jest.mock('../src/services/authService');
jest.mock('../src/services/demoService');

const request = require('supertest');
const authService = require('../src/services/authService');
const demoService = require('../src/services/demoService');
const createApp = require('../src/app');

const app = createApp();

beforeEach(() => {
  authService.verifierJeton.mockReturnValue('u1');
});

describe('GET /api/demo/evenements-recents', () => {
  it('refuse sans jeton', async () => {
    const res = await request(app).get('/api/demo/evenements-recents');
    expect(res.status).toBe(401);
  });

  it('renvoie les événements récents enrichis', async () => {
    demoService.obtenirEvenementsRecents.mockResolvedValue({
      dispositif: { id: 'd1', etatConnexion: 'CONNECTE' },
      evenements: [{ id: 'e1', type: 'OUVERTURE', verification: null }],
    });

    const res = await request(app).get('/api/demo/evenements-recents').set('Authorization', 'Bearer x');

    expect(res.status).toBe(200);
    expect(res.body.evenements).toHaveLength(1);
  });
});

describe('POST /api/demo/connexion', () => {
  it('coupe la connexion (actif=true)', async () => {
    demoService.basculerConnexion.mockResolvedValue({ id: 'd1', modeDemoDeconnecte: true, etatConnexion: 'HORS_LIGNE' });

    const res = await request(app)
      .post('/api/demo/connexion')
      .set('Authorization', 'Bearer x')
      .send({ actif: true });

    expect(res.status).toBe(200);
    expect(res.body.dispositif.modeDemoDeconnecte).toBe(true);
    expect(demoService.basculerConnexion).toHaveBeenCalledWith('u1', true);
  });

  it('rétablit la connexion (actif=false)', async () => {
    demoService.basculerConnexion.mockResolvedValue({ id: 'd1', modeDemoDeconnecte: false });

    await request(app).post('/api/demo/connexion').set('Authorization', 'Bearer x').send({ actif: false });

    expect(demoService.basculerConnexion).toHaveBeenCalledWith('u1', false);
  });
});
