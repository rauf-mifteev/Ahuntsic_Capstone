jest.mock('../src/repositories/dispositifRepository');
jest.mock('../src/repositories/priseRepository');

const dispositifRepository = require('../src/repositories/dispositifRepository');
const priseRepository = require('../src/repositories/priseRepository');
const delService = require('../src/services/delService');
const { genererCompartiments } = require('../src/models/Dispositif');

function faireDispositif() {
  return { id: 'd1', compartiments: genererCompartiments() };
}

describe('delService.obtenirCommandesDel', () => {
  it('refuse un identifiant de dispositif inconnu', async () => {
    dispositifRepository.trouverParIdentifiant.mockResolvedValue(null);

    await expect(delService.obtenirCommandesDel('ID-INCONNU')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('refuse (503) un dispositif en mode démo déconnecté (PC-70)', async () => {
    dispositifRepository.trouverParIdentifiant.mockResolvedValue({
      ...faireDispositif(),
      modeDemoDeconnecte: true,
    });

    await expect(delService.obtenirCommandesDel('ESP32-ABC')).rejects.toMatchObject({ statusCode: 503 });
  });

  it('traduit chaque prise active en indexDEL de son compartiment', async () => {
    const dispositif = faireDispositif();
    dispositifRepository.trouverParIdentifiant.mockResolvedValue(dispositif);
    priseRepository.trouverActivesPourDel.mockResolvedValue([{ compartimentIndice: 5 }, { compartimentIndice: 12 }]);

    const resultat = await delService.obtenirCommandesDel('ESP32-ABC');

    expect(resultat.indexDEL.sort((a, b) => a - b)).toEqual([5, 12]);
  });

  it("renvoie une liste vide s'il n'y a aucune prise active (toutes réglées)", async () => {
    const dispositif = faireDispositif();
    dispositifRepository.trouverParIdentifiant.mockResolvedValue(dispositif);
    priseRepository.trouverActivesPourDel.mockResolvedValue([]);

    const resultat = await delService.obtenirCommandesDel('ESP32-ABC');

    expect(resultat.indexDEL).toEqual([]);
  });
});
