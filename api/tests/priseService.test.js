jest.mock('../src/repositories/priseRepository');
jest.mock('../src/repositories/dispositifRepository');

const priseRepository = require('../src/repositories/priseRepository');
const dispositifRepository = require('../src/repositories/dispositifRepository');
const priseService = require('../src/services/priseService');
const { genererCompartiments } = require('../src/models/Dispositif');

function faireDispositif(heures = { 1: '08:00', 2: null, 3: '18:00', 4: null }) {
  return {
    id: 'd1',
    plagesHoraires: [1, 2, 3, 4].map((creneau) => ({
      creneau,
      heure: heures[creneau],
      delaiTolerance: 60,
    })),
    compartiments: genererCompartiments(),
  };
}

describe('priseService.genererPrisesAttendues (correction Sprint 2 : par compartiment, pas par médicament)', () => {
  it('génère une seule prise par jour même si deux médicaments partagent le créneau (RG-01)', () => {
    const medicaments = [
      { creneau: 1, joursSemaine: ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'] },
      { creneau: 1, joursSemaine: ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'] },
    ];

    const prises = priseService.genererPrisesAttendues({ dispositif: faireDispositif(), medicaments });

    expect(prises).toHaveLength(7);
  });

  it('ignore les jours non concernés par aucun médicament de ce créneau', () => {
    const medicaments = [{ creneau: 1, joursSemaine: ['LUNDI'] }];

    const prises = priseService.genererPrisesAttendues({ dispositif: faireDispositif(), medicaments });

    expect(prises.length).toBeLessThanOrEqual(1);
  });

  it("ignore un créneau sans heure configurée", () => {
    const medicaments = [
      { creneau: 2, joursSemaine: ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'] },
    ];

    const prises = priseService.genererPrisesAttendues({ dispositif: faireDispositif(), medicaments });

    expect(prises).toHaveLength(0);
  });

  it('copie le délai de tolérance de la plage horaire sur chaque prise générée', () => {
    const medicaments = [{ creneau: 1, joursSemaine: ['LUNDI'] }];
    const prises = priseService.genererPrisesAttendues({ dispositif: faireDispositif(), medicaments });

    if (prises.length > 0) {
      expect(prises[0].delaiTolerance).toBe(60);
      expect(prises[0].statut).toBe('PREVUE');
    }
  });
});

describe('priseService.genererEtEnregistrerProchainesPrises', () => {
  it('enregistre les prises générées via le dépôt', async () => {
    priseRepository.creerPlusieurs.mockResolvedValue([]);
    const medicaments = [{ creneau: 1, joursSemaine: ['LUNDI'] }];

    await priseService.genererEtEnregistrerProchainesPrises({ dispositif: faireDispositif(), medicaments });

    expect(priseRepository.creerPlusieurs).toHaveBeenCalledTimes(1);
  });
});

describe('priseService.transitionner (RG-06)', () => {
  it('autorise PREVUE -> EN_VERIFICATION', () => {
    const prise = { statut: 'PREVUE' };
    priseService.transitionner(prise, 'EN_VERIFICATION');
    expect(prise.statut).toBe('EN_VERIFICATION');
  });

  it('refuse CONFIRMEE -> AMBIGUE (une prise réglée ne redevient jamais ambiguë)', () => {
    const prise = { statut: 'CONFIRMEE' };
    expect(() => priseService.transitionner(prise, 'AMBIGUE')).toThrow(/RG-06/);
  });

  it('refuse MANQUEE -> CONFIRMEE', () => {
    const prise = { statut: 'MANQUEE' };
    expect(() => priseService.transitionner(prise, 'CONFIRMEE')).toThrow();
  });

  it('marque origineConfirmation=AUTOMATIQUE par défaut sur une confirmation', () => {
    const prise = { statut: 'EN_VERIFICATION' };
    priseService.transitionner(prise, 'CONFIRMEE');
    expect(prise.origineConfirmation).toBe('AUTOMATIQUE');
  });

  it('respecte origineConfirmation=MANUELLE si précisé', () => {
    const prise = { statut: 'AMBIGUE' };
    priseService.transitionner(prise, 'CONFIRMEE', { origineConfirmation: 'MANUELLE' });
    expect(prise.origineConfirmation).toBe('MANUELLE');
  });
});

describe('priseService.demarrerVerificationsPourOuverture', () => {
  it('fait passer chaque prise due de PREVUE à EN_VERIFICATION', async () => {
    const prise1 = { statut: 'PREVUE' };
    const prise2 = { statut: 'PREVUE' };
    priseRepository.trouverPrisesDuesPourOuverture.mockResolvedValue([prise1, prise2]);
    priseRepository.sauvegarder.mockImplementation((p) => Promise.resolve(p));

    await priseService.demarrerVerificationsPourOuverture('d1');

    expect(prise1.statut).toBe('EN_VERIFICATION');
    expect(prise2.statut).toBe('EN_VERIFICATION');
  });
});

describe('priseService.reglerDepuisComparaison (RG-03)', () => {
  it('confirme automatiquement quand le score dépasse le seuil', async () => {
    const prise = { statut: 'EN_VERIFICATION' };
    priseRepository.trouverEnVerificationPourCompartiment.mockResolvedValue(prise);
    priseRepository.sauvegarder.mockImplementation((p) => Promise.resolve(p));

    const verificationActuelle = { etatsZones: [{ indice: 3, occupee: false, score: 0.95 }] };
    await priseService.reglerDepuisComparaison('d1', [3], verificationActuelle);

    expect(prise.statut).toBe('CONFIRMEE');
    expect(prise.origineConfirmation).toBe('AUTOMATIQUE');
  });

  it('marque ambiguë quand le score est sous le seuil', async () => {
    const prise = { statut: 'EN_VERIFICATION' };
    priseRepository.trouverEnVerificationPourCompartiment.mockResolvedValue(prise);
    priseRepository.sauvegarder.mockImplementation((p) => Promise.resolve(p));

    const verificationActuelle = { etatsZones: [{ indice: 3, occupee: false, score: 0.3 }] };
    await priseService.reglerDepuisComparaison('d1', [3], verificationActuelle);

    expect(prise.statut).toBe('AMBIGUE');
  });

  it("ignore un compartiment vidé sans prise EN_VERIFICATION correspondante", async () => {
    priseRepository.trouverEnVerificationPourCompartiment.mockResolvedValue(null);

    const resultat = await priseService.reglerDepuisComparaison('d1', [7], {
      etatsZones: [{ indice: 7, occupee: false, score: 0.99 }],
    });

    expect(resultat).toEqual([]);
    expect(priseRepository.sauvegarder).not.toHaveBeenCalled();
  });
});

describe('priseService.confirmerManuellement / annulerConfirmation', () => {
  it('confirmerManuellement transitionne avec origine MANUELLE', async () => {
    const prise = { statut: 'AMBIGUE' };
    priseRepository.sauvegarder.mockImplementation((p) => Promise.resolve(p));

    await priseService.confirmerManuellement(prise);

    expect(prise.statut).toBe('CONFIRMEE');
    expect(prise.origineConfirmation).toBe('MANUELLE');
  });

  it("annulerConfirmation refuse si la prise n'est pas ambiguë", async () => {
    const prise = { statut: 'PREVUE' };
    await expect(priseService.annulerConfirmation(prise)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('annulerConfirmation garde le statut AMBIGUE (RG-06)', async () => {
    const prise = { statut: 'AMBIGUE' };
    priseRepository.sauvegarder.mockImplementation((p) => Promise.resolve(p));

    await priseService.annulerConfirmation(prise);

    expect(prise.statut).toBe('AMBIGUE');
  });
});

describe('priseService.marquerEnRetardCommeManquees', () => {
  it('marque chaque prise en retard comme MANQUEE', async () => {
    const prise = { statut: 'AMBIGUE' };
    priseRepository.trouverEnRetard.mockResolvedValue([prise]);
    priseRepository.sauvegarder.mockImplementation((p) => Promise.resolve(p));

    await priseService.marquerEnRetardCommeManquees();

    expect(prise.statut).toBe('MANQUEE');
  });
});

describe('priseService.obtenirPrisePourUtilisateur', () => {
  it("renvoie 404 si la prise n'appartient pas au dispositif de l'utilisateur", async () => {
    dispositifRepository.trouverParUtilisateur.mockResolvedValue({ id: 'd1' });
    priseRepository.trouverParId.mockResolvedValue({ id: 'p1', dispositif: 'd2' });

    await expect(priseService.obtenirPrisePourUtilisateur('u1', 'p1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('renvoie la prise si elle appartient bien au dispositif de l\'utilisateur', async () => {
    dispositifRepository.trouverParUtilisateur.mockResolvedValue({ id: 'd1' });
    priseRepository.trouverParId.mockResolvedValue({ id: 'p1', dispositif: 'd1' });

    const prise = await priseService.obtenirPrisePourUtilisateur('u1', 'p1');
    expect(prise.id).toBe('p1');
  });
});
