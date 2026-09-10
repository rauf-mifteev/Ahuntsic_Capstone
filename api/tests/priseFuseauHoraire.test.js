const priseService = require('../src/services/priseService');
const { FUSEAU_PAR_DEFAUT } = require('../src/models/Utilisateur');

describe('instantDepuisHeureLocale', () => {
  const heure = (annee, mois, jour, heures, minutes = 0) => ({ annee, mois, jour, heures, minutes });

  it("place 08:00 à Toronto en été (EDT, UTC-4) à 12:00 UTC", () => {
    const instant = priseService.instantDepuisHeureLocale(heure(2026, 7, 15, 8), 'America/Toronto');
    expect(instant.toISOString()).toBe('2026-07-15T12:00:00.000Z');
  });

  it("place 08:00 à Toronto en hiver (EST, UTC-5) à 13:00 UTC", () => {

    const instant = priseService.instantDepuisHeureLocale(heure(2026, 1, 15, 8), 'America/Toronto');
    expect(instant.toISOString()).toBe('2026-01-15T13:00:00.000Z');
  });

  it("suit le changement d'heure du printemps (8 mars 2026)", () => {
    const veille = priseService.instantDepuisHeureLocale(heure(2026, 3, 7, 3), 'America/Toronto');
    const jourJ = priseService.instantDepuisHeureLocale(heure(2026, 3, 8, 3), 'America/Toronto');

    expect(veille.toISOString()).toBe('2026-03-07T08:00:00.000Z');
    expect(jourJ.toISOString()).toBe('2026-03-08T07:00:00.000Z');

    expect(jourJ - veille).toBe(23 * 60 * 60 * 1000);
  });

  it('fonctionne pour un fuseau en avance sur UTC', () => {
    expect(priseService.instantDepuisHeureLocale(heure(2026, 7, 15, 8), 'Europe/Paris').toISOString())
      .toBe('2026-07-15T06:00:00.000Z');

    expect(priseService.instantDepuisHeureLocale(heure(2026, 7, 15, 8), 'Asia/Tokyo').toISOString())
      .toBe('2026-07-14T23:00:00.000Z');
  });

  it("relit toujours l'heure demandée dans le fuseau d'origine", () => {
    for (const fuseau of ['America/Toronto', 'Europe/Paris', 'Asia/Tokyo', 'America/Vancouver']) {
      for (const mois of [1, 7]) {
        const instant = priseService.instantDepuisHeureLocale(heure(2026, mois, 15, 22, 30), fuseau);
        const relu = new Intl.DateTimeFormat('en-GB', {
          timeZone: fuseau, hour: '2-digit', minute: '2-digit', hour12: false,
        }).format(instant);
        expect(relu).toBe('22:30');
      }
    }
  });
});

function faireDispositif(heures) {
  return {
    id: 'd1',
    plagesHoraires: heures.map((heure, i) => ({ creneau: i + 1, heure, delaiTolerance: 60 })),
    compartiments: Array.from({ length: 28 }, (_, indice) => ({
      indice,
      creneau: Math.floor(indice / 7) + 1,
      jourSemaine: ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'][indice % 7],
      indexDEL: indice,
    })),
  };
}

const TOUS_LES_JOURS = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];

describe('genererPrisesAttendues et le fuseau du patient', () => {
  afterEach(() => jest.useRealTimers());

  it("interprète l'heure de la plage dans le fuseau du patient", () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-15T15:00:00Z'));
    const dispositif = faireDispositif(['08:00', null, null, null]);
    const medicaments = [{ creneaux: [1], joursSemaine: TOUS_LES_JOURS }];

    const prises = priseService.genererPrisesAttendues({
      dispositif, medicaments, fuseauHoraire: 'America/Toronto',
    });

    expect(prises[0].heurePrevue.toISOString()).toBe('2026-07-15T12:00:00.000Z');
    expect(prises[0].date).toBe('2026-07-15');
  });

  it("garde la date du PATIENT pour une prise tardive, pas la date UTC", () => {

    jest.useFakeTimers().setSystemTime(new Date('2026-07-15T15:00:00Z'));
    const dispositif = faireDispositif([null, null, null, '22:00']);
    const medicaments = [{ creneaux: [4], joursSemaine: TOUS_LES_JOURS }];

    const prises = priseService.genererPrisesAttendues({
      dispositif, medicaments, fuseauHoraire: 'America/Toronto',
    });

    expect(prises[0].heurePrevue.toISOString()).toBe('2026-07-16T02:00:00.000Z');
    expect(prises[0].date).toBe('2026-07-15');
  });

  it("part du jour du patient, même quand UTC est déjà au lendemain", () => {

    jest.useFakeTimers().setSystemTime(new Date('2026-07-16T01:00:00Z'));
    const dispositif = faireDispositif(['08:00', null, null, null]);
    const medicaments = [{ creneaux: [1], joursSemaine: TOUS_LES_JOURS }];

    const prises = priseService.genererPrisesAttendues({
      dispositif, medicaments, fuseauHoraire: 'America/Toronto',
    });

    expect(prises[0].date).toBe('2026-07-15');
  });

  it("couvre 7 jours de calendrier même à travers un changement d'heure", () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-05T15:00:00Z'));
    const dispositif = faireDispositif(['08:00', null, null, null]);
    const medicaments = [{ creneaux: [1], joursSemaine: TOUS_LES_JOURS }];

    const prises = priseService.genererPrisesAttendues({
      dispositif, medicaments, fuseauHoraire: 'America/Toronto',
    });

    expect(prises).toHaveLength(7);
    expect(prises.map((p) => p.date)).toEqual([
      '2026-03-05', '2026-03-06', '2026-03-07', '2026-03-08',
      '2026-03-09', '2026-03-10', '2026-03-11',
    ]);

    for (const prise of prises) {
      const relu = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(prise.heurePrevue);
      expect(relu).toBe('08:00');
    }
  });

  it('retombe sur le fuseau par défaut si aucun n\'est fourni', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-15T15:00:00Z'));
    const dispositif = faireDispositif(['08:00', null, null, null]);
    const medicaments = [{ creneaux: [1], joursSemaine: TOUS_LES_JOURS }];

    const sansFuseau = priseService.genererPrisesAttendues({ dispositif, medicaments });
    const avecDefaut = priseService.genererPrisesAttendues({
      dispositif, medicaments, fuseauHoraire: FUSEAU_PAR_DEFAUT,
    });

    expect(sansFuseau[0].heurePrevue).toEqual(avecDefaut[0].heurePrevue);
  });
});
