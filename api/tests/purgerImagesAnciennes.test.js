jest.mock('../src/repositories/verificationRepository');
jest.mock('../src/repositories/dispositifRepository');
jest.mock('../src/repositories/evenementRepository');
jest.mock('../src/services/comparaisonService');
jest.mock('../src/services/comparaisonPlateauService');
jest.mock('../src/services/priseService');

const verificationRepository = require('../src/repositories/verificationRepository');
const dispositifRepository = require('../src/repositories/dispositifRepository');
const evenementRepository = require('../src/repositories/evenementRepository');
const comparaisonService = require('../src/services/comparaisonService');
const evenementService = require('../src/services/evenementService');
const { purgerImagesAnciennes, NOMBRE_JOURS_CONSERVATION_IMAGE } = require('../src/jobs/purgerImagesAnciennes');

describe('purgerImagesAnciennes', () => {
  it('interroge le dépôt avec une date limite de 30 jours avant maintenant', async () => {
    verificationRepository.listerImagesAPurger.mockResolvedValue([]);
    const maintenant = new Date('2026-08-29T00:00:00Z');

    await purgerImagesAnciennes(maintenant);

    expect(NOMBRE_JOURS_CONSERVATION_IMAGE).toBe(30);
    const dateLimiteUtilisee = verificationRepository.listerImagesAPurger.mock.calls[0][0];
    const joursEcart = (maintenant - dateLimiteUtilisee) / (24 * 60 * 60 * 1000);
    expect(joursEcart).toBe(30);
  });

  it("met le champ image à null mais garde le reste du document", async () => {
    const verification1 = { id: 'v1', image: 'base64...', etatsZones: [{ indice: 0 }], analyseEchouee: false };
    const verification2 = { id: 'v2', image: 'base64...', etatsZones: [{ indice: 1 }], analyseEchouee: false };
    verificationRepository.listerImagesAPurger.mockResolvedValue([verification1, verification2]);
    verificationRepository.sauvegarder.mockImplementation((v) => Promise.resolve(v));

    const nombrePurgees = await purgerImagesAnciennes(new Date());

    expect(nombrePurgees).toBe(2);
    expect(verification1.image).toBeNull();
    expect(verification1.etatsZones).toEqual([{ indice: 0 }]);
    expect(verification2.image).toBeNull();
    expect(verificationRepository.sauvegarder).toHaveBeenCalledTimes(2);
  });

  it("ne fait rien si aucune image n'a besoin d'être purgée", async () => {
    verificationRepository.listerImagesAPurger.mockResolvedValue([]);

    const nombrePurgees = await purgerImagesAnciennes(new Date());

    expect(nombrePurgees).toBe(0);
    expect(verificationRepository.sauvegarder).not.toHaveBeenCalled();
  });
});

describe('PC-52 de bout en bout : la purge a désormais quelque chose à purger', () => {

  const ancien = new Date('2026-09-01T12:00:00Z');

  it("une fermeture simulée produit une image, que la purge efface ensuite", async () => {

    dispositifRepository.trouverParIdentifiant.mockResolvedValue({
      id: 'd1',
      identifiantDispositif: 'ESP32-ABC',
      prochaineFermetureEstReference: false,
    });
    dispositifRepository.sauvegarder.mockResolvedValue({});
    evenementRepository.creer.mockResolvedValue({ id: 'e1', type: 'FERMETURE' });

    const verification = {
      id: 'v1',
      image: null,
      etatsZones: [],
      analyseEchouee: false,
      moment: ancien,
    };
    verificationRepository.creer.mockResolvedValue(verification);
    verificationRepository.sauvegarder.mockImplementation((v) => Promise.resolve(v));
    comparaisonService.analyserPlateauSimule.mockResolvedValue({
      strategie: 'seuillage-opencv',
      simule: true,
      image: 'PNG-base64',
      resultats: [{ indice: 12, occupee: false, score: 1 }],
    });

    await evenementService.enregistrerEvenement({
      identifiantDispositif: 'ESP32-ABC',
      type: 'FERMETURE',
      horodatage: ancien.toISOString(),
    });

    expect(verification.image).toBe('PNG-base64');

    verificationRepository.listerImagesAPurger.mockResolvedValue([verification]);

    const nombrePurgees = await purgerImagesAnciennes(new Date('2026-10-05T12:00:00Z'));

    expect(nombrePurgees).toBe(1);
    expect(verification.image).toBeNull();
    expect(verification.etatsZones).toEqual([{ indice: 12, occupee: false, score: 1 }]);
  });
});
