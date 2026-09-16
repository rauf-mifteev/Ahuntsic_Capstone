jest.mock('../src/services/authService');
jest.mock('../src/services/adherenceService');
jest.mock('../src/services/priseService');
jest.mock('../src/repositories/utilisateurRepository');

const request = require('supertest');
const authService = require('../src/services/authService');
const adherenceService = require('../src/services/adherenceService');
const priseService = require('../src/services/priseService');
const utilisateurRepository = require('../src/repositories/utilisateurRepository');
const createApp = require('../src/app');

const app = createApp();

const HISTORIQUE = {
  debut: '2026-09-09',
  fin: '2026-09-15',
  nombreJours: 7,
  resume: { total: 14, confirmees: 12, manquees: 2, enAttente: 0, tauxAdherence: 12 / 14 },
  parJour: [],
};

beforeEach(() => {
  authService.verifierJeton.mockReturnValue('u1');
  utilisateurRepository.trouverParId.mockResolvedValue({ fuseauHoraire: 'America/Toronto' });
  adherenceService.NOMBRE_JOURS_PAR_DEFAUT = 7;
  adherenceService.obtenirHistorique.mockResolvedValue(HISTORIQUE);
});

describe('GET /api/prises/historique', () => {
  it('refuse sans jeton', async () => {
    const res = await request(app).get('/api/prises/historique');
    expect(res.status).toBe(401);
  });

  it("renvoie l'historique et le taux d'adhérence", async () => {
    const res = await request(app).get('/api/prises/historique').set('Authorization', 'Bearer x');

    expect(res.status).toBe(200);
    expect(res.body.historique.resume.confirmees).toBe(12);
  });

  it("n'est pas avalée par la route /prises/:id", async () => {
    await request(app).get('/api/prises/historique').set('Authorization', 'Bearer x');

    expect(adherenceService.obtenirHistorique).toHaveBeenCalled();
    expect(priseService.obtenirPrisePourUtilisateur).not.toHaveBeenCalled();
  });

  it('transmet le nombre de jours demandé, converti en nombre', async () => {
    await request(app).get('/api/prises/historique?jours=30').set('Authorization', 'Bearer x');

    expect(adherenceService.obtenirHistorique).toHaveBeenCalledWith('u1', expect.objectContaining({ nombreJours: 30 }));
  });

  it('utilise le jour du patient, dans son fuseau, quand aucune date n\'est fournie', async () => {
    await request(app).get('/api/prises/historique').set('Authorization', 'Bearer x');

    expect(adherenceService.obtenirHistorique).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ dateFin: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), nombreJours: 7 })
    );
  });
});
