jest.mock('../src/repositories/dispositifRepository');
jest.mock('../src/repositories/verificationRepository');

const dispositifRepository = require('../src/repositories/dispositifRepository');
const verificationRepository = require('../src/repositories/verificationRepository');
const verificationService = require('../src/services/verificationService');

describe('verificationService.obtenirDerniereReferencePourUtilisateur', () => {
  it("lève 404 si l'utilisateur n'a pas de dispositif", async () => {
    dispositifRepository.trouverParUtilisateur.mockResolvedValue(null);

    await expect(verificationService.obtenirDerniereReferencePourUtilisateur('u1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("lève 404 si aucune photo de référence n'existe encore", async () => {
    dispositifRepository.trouverParUtilisateur.mockResolvedValue({ id: 'd1' });
    verificationRepository.trouverDerniereReference.mockResolvedValue(null);

    await expect(verificationService.obtenirDerniereReferencePourUtilisateur('u1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('renvoie la dernière photo de référence', async () => {
    dispositifRepository.trouverParUtilisateur.mockResolvedValue({ id: 'd1' });
    verificationRepository.trouverDerniereReference.mockResolvedValue({ id: 'v1', estReference: true });

    const resultat = await verificationService.obtenirDerniereReferencePourUtilisateur('u1');
    expect(resultat.id).toBe('v1');
  });
});
