const request = require('supertest');
const createApp = require('../src/app');

describe('GET /api/sante', () => {
  it("répond 200 et confirme que le processus de l'API tourne", async () => {
    const app = createApp();

    const res = await request(app).get('/api/sante');

    expect(res.status).toBe(200);
    expect(res.body.etat).toBe('ok');
    expect(res.body.horodatage).toBeDefined();
  });
});

describe('Route inconnue', () => {
  it('répond 404 avec un message explicite', async () => {
    const app = createApp();

    const res = await request(app).get('/api/ceci-nexiste-pas');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toContain('/api/ceci-nexiste-pas');
  });
});

describe('Corps JSON malformé', () => {
  it('répond 400 et non 500 : la faute est celle du client', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/comptes')
      .set('Content-Type', 'application/json')
      .send('{courriel:pas-du-json}');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/JSON/i);
  });
});
