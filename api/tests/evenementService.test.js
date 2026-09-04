jest.mock('../src/repositories/dispositifRepository');
jest.mock('../src/repositories/evenementRepository');

const dispositifRepository = require('../src/repositories/dispositifRepository');
const evenementRepository = require('../src/repositories/evenementRepository');
const evenementService = require('../src/services/evenementService');

function faireDispositif() {
  return { id: 'd1', identifiantDispositif: 'ESP32-ABC', etatConnexion: 'HORS_LIGNE' };
}

describe('evenementService.enregistrerEvenement', () => {
  it("refuse un événement d'un dispositif inconnu (AC de PC-42)", async () => {
    dispositifRepository.trouverParIdentifiant.mockResolvedValue(null);

    await expect(
      evenementService.enregistrerEvenement({
        identifiantDispositif: 'ESP32-INCONNU',
        type: 'OUVERTURE',
        horodatage: new Date().toISOString(),
      })
    ).rejects.toMatchObject({ statusCode: 401 });

    expect(evenementRepository.creer).not.toHaveBeenCalled();
  });

  it('refuse un type invalide', async () => {
    dispositifRepository.trouverParIdentifiant.mockResolvedValue(faireDispositif());

    await expect(
      evenementService.enregistrerEvenement({
        identifiantDispositif: 'ESP32-ABC',
        type: 'CASSE',
        horodatage: new Date().toISOString(),
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuse un horodatage invalide', async () => {
    dispositifRepository.trouverParIdentifiant.mockResolvedValue(faireDispositif());

    await expect(
      evenementService.enregistrerEvenement({
        identifiantDispositif: 'ESP32-ABC',
        type: 'OUVERTURE',
        horodatage: 'pas-une-date',
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('enregistre un événement valide et met à jour le dispositif comme connecté', async () => {
    const dispositif = faireDispositif();
    dispositifRepository.trouverParIdentifiant.mockResolvedValue(dispositif);
    dispositifRepository.sauvegarder.mockResolvedValue(dispositif);
    evenementRepository.creer.mockResolvedValue({ id: 'e1', type: 'OUVERTURE' });

    const resultat = await evenementService.enregistrerEvenement({
      identifiantDispositif: 'ESP32-ABC',
      type: 'OUVERTURE',
      horodatage: '2026-08-29T12:00:00.000Z',
    });

    expect(resultat.id).toBe('e1');
    expect(dispositif.etatConnexion).toBe('CONNECTE');
    expect(dispositifRepository.sauvegarder).toHaveBeenCalledWith(dispositif);
    expect(evenementRepository.creer).toHaveBeenCalledWith(
      expect.objectContaining({ dispositif: 'd1', identifiantDispositif: 'ESP32-ABC', type: 'OUVERTURE' })
    );
  });
});
