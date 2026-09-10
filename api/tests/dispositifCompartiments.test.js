const { genererCompartiments, JOURS_ORDRE } = require('../src/models/Dispositif');

describe('genererCompartiments (28 compartiments, cohérent avec analyse-images/zones.py)', () => {
  it('génère exactement 28 compartiments', () => {
    expect(genererCompartiments()).toHaveLength(28);
  });

  it('couvre les 7 jours × 4 créneaux sans doublon', () => {
    const compartiments = genererCompartiments();
    const cles = new Set(compartiments.map((c) => `${c.jourSemaine}-${c.creneau}`));
    expect(cles.size).toBe(28);
  });

  it('indice = (creneau-1)*7 + position du jour — même formule que zones.py côté Python', () => {
    const compartiments = genererCompartiments();
    for (const compartiment of compartiments) {
      const colonneJour = JOURS_ORDRE.indexOf(compartiment.jourSemaine);
      const indiceAttendu = (compartiment.creneau - 1) * JOURS_ORDRE.length + colonneJour;
      expect(compartiment.indice).toBe(indiceAttendu);
    }
  });

  it('indexDEL est égal à indice (choix de câblage le plus simple)', () => {
    const compartiments = genererCompartiments();
    compartiments.forEach((c) => expect(c.indexDEL).toBe(c.indice));
  });

  it('les indices vont bien de 0 à 27 sans trou', () => {
    const indices = genererCompartiments()
      .map((c) => c.indice)
      .sort((a, b) => a - b);
    expect(indices).toEqual(Array.from({ length: 28 }, (_, i) => i));
  });
});
