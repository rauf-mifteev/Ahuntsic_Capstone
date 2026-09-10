jest.mock('../src/services/dispositifService');
jest.mock('../src/repositories/dispositifRepository');
jest.mock('../src/repositories/evenementRepository');
jest.mock('../src/repositories/verificationRepository');

const dispositifService = require('../src/services/dispositifService');
const dispositifRepository = require('../src/repositories/dispositifRepository');
const evenementRepository = require('../src/repositories/evenementRepository');
const verificationRepository = require('../src/repositories/verificationRepository');
const demoService = require('../src/services/demoService');

describe('demoService.obtenirEvenementsRecents', () => {
  it('enrichit chaque FERMETURE avec sa Verification quand elle existe', async () => {
    dispositifService.obtenirParUtilisateur.mockResolvedValue({ id: 'd1' });
    evenementRepository.listerParDispositif.mockResolvedValue([
      { id: 'e1', type: 'OUVERTURE', horodatage: new Date('2026-08-29T08:00:00Z') },
      { id: 'e2', type: 'FERMETURE', horodatage: new Date('2026-08-29T08:01:00Z') },
    ]);
    verificationRepository.trouverParEvenement.mockResolvedValue({
      estReference: false,
      analyseEchouee: false,
      strategieUtilisee: 'seuillage-opencv',
      etatsZones: [{ indice: 0 }],
    });

    const resultat = await demoService.obtenirEvenementsRecents('u1');

    expect(resultat.evenements).toHaveLength(2);
    expect(resultat.evenements[0].verification).toBeNull();
    expect(resultat.evenements[1].verification.strategieUtilisee).toBe('seuillage-opencv');
    expect(resultat.evenements[1].verification.nombreZonesAnalysees).toBe(1);
  });

  it("laisse verification à null si aucune n'a été déclenchée pour cette fermeture", async () => {
    dispositifService.obtenirParUtilisateur.mockResolvedValue({ id: 'd1' });
    evenementRepository.listerParDispositif.mockResolvedValue([
      { id: 'e3', type: 'FERMETURE', horodatage: new Date() },
    ]);
    verificationRepository.trouverParEvenement.mockResolvedValue(null);

    const resultat = await demoService.obtenirEvenementsRecents('u1');

    expect(resultat.evenements[0].verification).toBeNull();
  });
});

describe('demoService.basculerConnexion', () => {
  it('coupe : pose le drapeau et marque le dispositif hors ligne immédiatement', async () => {
    const dispositif = { id: 'd1', modeDemoDeconnecte: false, etatConnexion: 'CONNECTE' };
    dispositifService.obtenirParUtilisateur.mockResolvedValue(dispositif);
    dispositifRepository.sauvegarder.mockResolvedValue(dispositif);

    const resultat = await demoService.basculerConnexion('u1', true);

    expect(resultat.modeDemoDeconnecte).toBe(true);
    expect(resultat.etatConnexion).toBe('HORS_LIGNE');
  });

  it('rétablit : retire le drapeau sans forcer un état de connexion', async () => {
    const dispositif = { id: 'd1', modeDemoDeconnecte: true, etatConnexion: 'HORS_LIGNE' };
    dispositifService.obtenirParUtilisateur.mockResolvedValue(dispositif);
    dispositifRepository.sauvegarder.mockResolvedValue(dispositif);

    const resultat = await demoService.basculerConnexion('u1', false);

    expect(resultat.modeDemoDeconnecte).toBe(false);

    expect(resultat.etatConnexion).toBe('HORS_LIGNE');
  });
});
