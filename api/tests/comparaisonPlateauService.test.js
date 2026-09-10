jest.mock('../src/repositories/verificationRepository');
jest.mock('../src/repositories/comparaisonPlateauRepository');

const verificationRepository = require('../src/repositories/verificationRepository');
const comparaisonPlateauRepository = require('../src/repositories/comparaisonPlateauRepository');
const { comparerZones, comparerEtEnregistrer } = require('../src/services/comparaisonPlateauService');

describe('comparerZones (fonction pure, RG-11)', () => {
  it('trouve les zones passées de pleine à vide', () => {
    const precedentes = [
      { indice: 0, occupee: true, score: 0.1 },
      { indice: 1, occupee: false, score: 0.9 },
      { indice: 2, occupee: true, score: 0.2 },
    ];
    const actuelles = [
      { indice: 0, occupee: false, score: 0.95 },
      { indice: 1, occupee: false, score: 0.9 },
      { indice: 2, occupee: true, score: 0.15 },
    ];

    expect(comparerZones(precedentes, actuelles)).toEqual([0]);
  });

  it("ignore une zone vide qui redevient pleine (ce n'est pas une prise)", () => {
    const precedentes = [{ indice: 5, occupee: false, score: 0.9 }];
    const actuelles = [{ indice: 5, occupee: true, score: 0.1 }];

    expect(comparerZones(precedentes, actuelles)).toEqual([]);
  });

  it('renvoie les indices triés même si les tableaux ne sont pas dans le même ordre', () => {
    const precedentes = [
      { indice: 3, occupee: true, score: 0.1 },
      { indice: 0, occupee: true, score: 0.1 },
    ];
    const actuelles = [
      { indice: 0, occupee: false, score: 0.9 },
      { indice: 3, occupee: false, score: 0.9 },
    ];

    expect(comparerZones(precedentes, actuelles)).toEqual([0, 3]);
  });
});

describe('comparerEtEnregistrer', () => {
  it("renvoie null s'il n'existe aucune photo de référence (RG-13)", async () => {
    verificationRepository.trouverDerniereReference.mockResolvedValue(null);

    const resultat = await comparerEtEnregistrer('d1', { id: 'v2', moment: new Date(), etatsZones: [] });

    expect(resultat).toBeNull();
    expect(comparaisonPlateauRepository.creer).not.toHaveBeenCalled();
  });

  it('compare à la photo de référence et enregistre le résultat', async () => {
    verificationRepository.trouverDerniereReference.mockResolvedValue({
      id: 'v1',
      etatsZones: [{ indice: 0, occupee: true, score: 0.1 }],
    });
    comparaisonPlateauRepository.creer.mockResolvedValue({ id: 'c1', compartimentsVides: [0] });

    const verificationActuelle = {
      id: 'v2',
      moment: new Date('2026-08-29T12:00:00Z'),
      etatsZones: [{ indice: 0, occupee: false, score: 0.9 }],
    };

    const resultat = await comparerEtEnregistrer('d1', verificationActuelle);

    expect(comparaisonPlateauRepository.creer).toHaveBeenCalledWith(
      expect.objectContaining({
        dispositif: 'd1',
        verificationReference: 'v1',
        verificationActuelle: 'v2',
        compartimentsVides: [0],
      })
    );
    expect(resultat.id).toBe('c1');
  });
});
