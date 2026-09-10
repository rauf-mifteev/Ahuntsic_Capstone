jest.mock('../src/repositories/dispositifRepository');
jest.mock('../src/repositories/evenementRepository');
jest.mock('../src/repositories/verificationRepository');
jest.mock('../src/services/comparaisonService');
jest.mock('../src/services/comparaisonPlateauService');
jest.mock('../src/services/priseService');

const dispositifRepository = require('../src/repositories/dispositifRepository');
const evenementRepository = require('../src/repositories/evenementRepository');
const verificationRepository = require('../src/repositories/verificationRepository');
const comparaisonService = require('../src/services/comparaisonService');
const comparaisonPlateauService = require('../src/services/comparaisonPlateauService');
const priseService = require('../src/services/priseService');
const evenementService = require('../src/services/evenementService');

function faireDispositif(overrides = {}) {
  return { id: 'd1', identifiantDispositif: 'ESP32-ABC', etatConnexion: 'HORS_LIGNE', prochaineFermetureEstReference: false, ...overrides };
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

  it('refuse (503) un dispositif en mode démo déconnecté (PC-70)', async () => {
    dispositifRepository.trouverParIdentifiant.mockResolvedValue(
      faireDispositif({ modeDemoDeconnecte: true })
    );

    await expect(
      evenementService.enregistrerEvenement({
        identifiantDispositif: 'ESP32-ABC',
        type: 'OUVERTURE',
        horodatage: new Date().toISOString(),
      })
    ).rejects.toMatchObject({ statusCode: 503 });

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
    priseService.demarrerVerificationsPourOuverture.mockResolvedValue([]);

    const resultat = await evenementService.enregistrerEvenement({
      identifiantDispositif: 'ESP32-ABC',
      type: 'OUVERTURE',
      horodatage: '2026-08-29T12:00:00.000Z',
    });

    expect(resultat.evenement.id).toBe('e1');
    expect(resultat.verification).toBeNull();
    expect(dispositif.etatConnexion).toBe('CONNECTE');
    expect(dispositifRepository.sauvegarder).toHaveBeenCalledWith(dispositif);
    expect(evenementRepository.creer).toHaveBeenCalledWith(
      expect.objectContaining({ dispositif: 'd1', identifiantDispositif: 'ESP32-ABC', type: 'OUVERTURE' })
    );
  });

  it('une OUVERTURE fait passer les prises dues à EN_VERIFICATION (RG-06)', async () => {
    const dispositif = faireDispositif();
    dispositifRepository.trouverParIdentifiant.mockResolvedValue(dispositif);
    dispositifRepository.sauvegarder.mockResolvedValue(dispositif);
    evenementRepository.creer.mockResolvedValue({ id: 'e1b', type: 'OUVERTURE' });
    priseService.demarrerVerificationsPourOuverture.mockResolvedValue([{ id: 'p1' }]);

    await evenementService.enregistrerEvenement({
      identifiantDispositif: 'ESP32-ABC',
      type: 'OUVERTURE',
      horodatage: '2026-08-29T12:00:00.000Z',
    });

    expect(priseService.demarrerVerificationsPourOuverture).toHaveBeenCalledWith(
      'd1',
      new Date('2026-08-29T12:00:00.000Z')
    );
  });

  it("une FERMETURE sans image fait photographier le plateau simulé (PC-51)", async () => {

    const dispositif = faireDispositif();
    dispositifRepository.trouverParIdentifiant.mockResolvedValue(dispositif);
    dispositifRepository.sauvegarder.mockResolvedValue(dispositif);
    evenementRepository.creer.mockResolvedValue({ id: 'e2', type: 'FERMETURE' });

    const verificationCreee = { id: 'v0', etatsZones: [], analyseEchouee: false };
    verificationRepository.creer.mockResolvedValue(verificationCreee);
    verificationRepository.sauvegarder.mockResolvedValue(verificationCreee);
    comparaisonService.analyserPlateauSimule.mockResolvedValue({
      strategie: 'seuillage-opencv',
      simule: true,
      resultats: [{ indice: 0, occupee: false, score: 0.9 }],
    });

    await evenementService.enregistrerEvenement({
      identifiantDispositif: 'ESP32-ABC',
      type: 'FERMETURE',
      horodatage: '2026-08-29T12:00:00.000Z',
    });

    expect(comparaisonService.analyserPlateauSimule).toHaveBeenCalledWith('ESP32-ABC');
    expect(comparaisonService.analyserImage).not.toHaveBeenCalled();
    expect(verificationRepository.creer).toHaveBeenCalledWith(
      expect.objectContaining({ image: null, photoSimulee: true })
    );
  });

  it("une FERMETURE avec image sauvegarde la Verification AVANT d'appeler le service d'analyse", async () => {
    const dispositif = faireDispositif();
    dispositifRepository.trouverParIdentifiant.mockResolvedValue(dispositif);
    dispositifRepository.sauvegarder.mockResolvedValue(dispositif);
    evenementRepository.creer.mockResolvedValue({ id: 'e3', type: 'FERMETURE' });

    const verificationCreee = { id: 'v1', etatsZones: [], analyseEchouee: false };
    verificationRepository.creer.mockResolvedValue(verificationCreee);
    verificationRepository.sauvegarder.mockResolvedValue(verificationCreee);
    comparaisonService.analyserImage.mockResolvedValue({
      strategie: 'seuillage-opencv',
      resultats: [{ indice: 0, occupee: true, score: 0.1 }],
    });
    comparaisonPlateauService.comparerEtEnregistrer.mockResolvedValue(null);

    const resultat = await evenementService.enregistrerEvenement({
      identifiantDispositif: 'ESP32-ABC',
      type: 'FERMETURE',
      horodatage: '2026-08-29T12:00:00.000Z',
      image: 'ZmFrZS1pbWFnZQ==',
    });

    const ordreCreation = verificationRepository.creer.mock.invocationCallOrder[0];
    const ordreAnalyse = comparaisonService.analyserImage.mock.invocationCallOrder[0];
    expect(ordreCreation).toBeLessThan(ordreAnalyse);

    expect(resultat.verification.etatsZones).toEqual([{ indice: 0, occupee: true, score: 0.1 }]);
    expect(resultat.verification.strategieUtilisee).toBe('seuillage-opencv');
    expect(resultat.verification.analyseEchouee).toBe(false);
    expect(priseService.reglerDepuisComparaison).not.toHaveBeenCalled();
  });

  it('RG-03 : après une comparaison avec des compartiments vidés, déclenche le règlement des prises', async () => {
    const dispositif = faireDispositif();
    dispositifRepository.trouverParIdentifiant.mockResolvedValue(dispositif);
    dispositifRepository.sauvegarder.mockResolvedValue(dispositif);
    evenementRepository.creer.mockResolvedValue({ id: 'e3b', type: 'FERMETURE' });

    const verificationCreee = { id: 'v1b', etatsZones: [], analyseEchouee: false };
    verificationRepository.creer.mockResolvedValue(verificationCreee);
    verificationRepository.sauvegarder.mockResolvedValue(verificationCreee);
    comparaisonService.analyserImage.mockResolvedValue({
      strategie: 'seuillage-opencv',
      resultats: [{ indice: 0, occupee: false, score: 0.95 }],
    });
    const comparaison = { compartimentsVides: [0] };
    comparaisonPlateauService.comparerEtEnregistrer.mockResolvedValue(comparaison);

    await evenementService.enregistrerEvenement({
      identifiantDispositif: 'ESP32-ABC',
      type: 'FERMETURE',
      horodatage: '2026-08-29T12:00:00.000Z',
      image: 'ZmFrZS1pbWFnZQ==',
    });

    expect(priseService.reglerDepuisComparaison).toHaveBeenCalledWith('d1', [0], verificationCreee);
  });

  it("RG-13 : une photo de référence n'est jamais comparée, et le drapeau est réinitialisé", async () => {
    const dispositif = faireDispositif({ prochaineFermetureEstReference: true });
    dispositifRepository.trouverParIdentifiant.mockResolvedValue(dispositif);
    dispositifRepository.sauvegarder.mockResolvedValue(dispositif);
    evenementRepository.creer.mockResolvedValue({ id: 'e3c', type: 'FERMETURE' });

    const verificationCreee = { id: 'v1c', etatsZones: [], analyseEchouee: false };
    verificationRepository.creer.mockResolvedValue(verificationCreee);
    verificationRepository.sauvegarder.mockResolvedValue(verificationCreee);
    comparaisonService.analyserImage.mockResolvedValue({
      strategie: 'seuillage-opencv',
      resultats: [{ indice: 0, occupee: true, score: 0.1 }],
    });

    await evenementService.enregistrerEvenement({
      identifiantDispositif: 'ESP32-ABC',
      type: 'FERMETURE',
      horodatage: '2026-08-29T12:00:00.000Z',
      image: 'ZmFrZS1pbWFnZQ==',
    });

    expect(verificationRepository.creer).toHaveBeenCalledWith(expect.objectContaining({ estReference: true }));

    expect(comparaisonPlateauService.comparerEtEnregistrer).not.toHaveBeenCalled();

    expect(dispositif.prochaineFermetureEstReference).toBe(false);
  });

  it("si le service d'analyse ne répond pas, la fermeture reste enregistrée sans vérification (AC de PC-50)", async () => {
    const dispositif = faireDispositif();
    dispositifRepository.trouverParIdentifiant.mockResolvedValue(dispositif);
    dispositifRepository.sauvegarder.mockResolvedValue(dispositif);
    evenementRepository.creer.mockResolvedValue({ id: 'e4', type: 'FERMETURE' });

    const verificationCreee = { id: 'v2', etatsZones: [], analyseEchouee: false };
    verificationRepository.creer.mockResolvedValue(verificationCreee);
    verificationRepository.sauvegarder.mockResolvedValue(verificationCreee);
    comparaisonService.analyserImage.mockRejectedValue(new Error('délai dépassé'));

    const resultat = await evenementService.enregistrerEvenement({
      identifiantDispositif: 'ESP32-ABC',
      type: 'FERMETURE',
      horodatage: '2026-08-29T12:00:00.000Z',
      image: 'ZmFrZS1pbWFnZQ==',
    });

    expect(resultat.evenement.id).toBe('e4');
    expect(verificationCreee.analyseEchouee).toBe(true);
  });

  it("conserve l'image dessinée par le service d'analyse (PC-52)", async () => {

    const dispositif = faireDispositif();
    dispositifRepository.trouverParIdentifiant.mockResolvedValue(dispositif);
    dispositifRepository.sauvegarder.mockResolvedValue(dispositif);
    evenementRepository.creer.mockResolvedValue({ id: 'e9', type: 'FERMETURE' });

    const verificationCreee = { id: 'v9', image: null, etatsZones: [], analyseEchouee: false };
    verificationRepository.creer.mockResolvedValue(verificationCreee);
    verificationRepository.sauvegarder.mockResolvedValue(verificationCreee);
    comparaisonService.analyserPlateauSimule.mockResolvedValue({
      strategie: 'seuillage-opencv',
      simule: true,
      image: 'iVBORw0KGgo-PNG-base64',
      resultats: [{ indice: 0, occupee: false, score: 0.9 }],
    });

    await evenementService.enregistrerEvenement({
      identifiantDispositif: 'ESP32-ABC',
      type: 'FERMETURE',
      horodatage: '2026-08-29T12:00:00.000Z',
    });

    expect(verificationCreee.image).toBe('iVBORw0KGgo-PNG-base64');
  });

  it("n'écrase pas l'image fournie par l'appelant (PC-52)", async () => {
    const dispositif = faireDispositif();
    dispositifRepository.trouverParIdentifiant.mockResolvedValue(dispositif);
    dispositifRepository.sauvegarder.mockResolvedValue(dispositif);
    evenementRepository.creer.mockResolvedValue({ id: 'e10', type: 'FERMETURE' });

    const verificationCreee = { id: 'v10', image: 'IMAGE-DE-L-APPELANT', etatsZones: [], analyseEchouee: false };
    verificationRepository.creer.mockResolvedValue(verificationCreee);
    verificationRepository.sauvegarder.mockResolvedValue(verificationCreee);
    comparaisonService.analyserImage.mockResolvedValue({
      strategie: 'seuillage-opencv',
      simule: false,
      image: null,
      resultats: [{ indice: 0, occupee: false, score: 0.9 }],
    });

    await evenementService.enregistrerEvenement({
      identifiantDispositif: 'ESP32-ABC',
      type: 'FERMETURE',
      horodatage: '2026-08-29T12:00:00.000Z',
      image: 'IMAGE-DE-L-APPELANT',
    });

    expect(verificationCreee.image).toBe('IMAGE-DE-L-APPELANT');
  });
});
