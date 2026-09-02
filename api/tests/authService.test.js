jest.mock('../src/repositories/utilisateurRepository');
jest.mock('../src/services/dispositifService');

const utilisateurRepository = require('../src/repositories/utilisateurRepository');
const dispositifService = require('../src/services/dispositifService');
const authService = require('../src/services/authService');

beforeEach(() => {
  dispositifService.creerParDefaut.mockResolvedValue({ id: 'dispositif-fictif' });
});

function faireUtilisateur(overrides = {}) {
  return {
    id: '64f000000000000000000001',
    courriel: 'patient@example.com',
    motDePasseHache: '$2a$12$hachefictifpourletest................',
    ...overrides,
  };
}

describe('authService.inscrire', () => {
  it('refuse un courriel déjà utilisé', async () => {
    utilisateurRepository.trouverParCourrielAvecMotDePasse.mockResolvedValue(faireUtilisateur());

    await expect(
      authService.inscrire({ courriel: 'patient@example.com', motDePasse: 'motdepasse123' })
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(utilisateurRepository.creer).not.toHaveBeenCalled();
  });

  it('refuse un mot de passe trop court', async () => {
    utilisateurRepository.trouverParCourrielAvecMotDePasse.mockResolvedValue(null);

    await expect(
      authService.inscrire({ courriel: 'patient@example.com', motDePasse: '123' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('hache le mot de passe avant de le transmettre au dépôt (jamais en clair)', async () => {
    utilisateurRepository.trouverParCourrielAvecMotDePasse.mockResolvedValue(null);
    utilisateurRepository.creer.mockResolvedValue(faireUtilisateur());

    await authService.inscrire({ courriel: 'patient@example.com', motDePasse: 'motdepasse123' });

    const argument = utilisateurRepository.creer.mock.calls[0][0];
    expect(argument.motDePasseHache).toBeDefined();
    expect(argument.motDePasseHache).not.toBe('motdepasse123');
    expect(argument).not.toHaveProperty('motDePasse');
  });

  it('renvoie un jeton après une inscription réussie', async () => {
    utilisateurRepository.trouverParCourrielAvecMotDePasse.mockResolvedValue(null);
    utilisateurRepository.creer.mockResolvedValue(faireUtilisateur());

    const { jeton } = await authService.inscrire({
      courriel: 'patient@example.com',
      motDePasse: 'motdepasse123',
    });

    expect(typeof jeton).toBe('string');
    expect(jeton.split('.')).toHaveLength(3); // un JWT a 3 segments
  });

  it('crée le dispositif "en attente" du nouveau compte (RG-09)', async () => {
    utilisateurRepository.trouverParCourrielAvecMotDePasse.mockResolvedValue(null);
    utilisateurRepository.creer.mockResolvedValue(faireUtilisateur());

    await authService.inscrire({ courriel: 'patient@example.com', motDePasse: 'motdepasse123' });

    expect(dispositifService.creerParDefaut).toHaveBeenCalledWith('64f000000000000000000001');
  });
});

describe('authService.connecter', () => {
  const bcrypt = require('bcryptjs');

  it('donne le même message que le compte existe ou non (F1)', async () => {
    utilisateurRepository.trouverParCourrielAvecMotDePasse.mockResolvedValueOnce(null);
    const erreurCompteInconnu = await authService
      .connecter({ courriel: 'inconnu@example.com', motDePasse: 'peuimporte123' })
      .catch((e) => e);

    const motDePasseHache = await bcrypt.hash('bonmotdepasse', 4);
    utilisateurRepository.trouverParCourrielAvecMotDePasse.mockResolvedValueOnce(
      faireUtilisateur({ motDePasseHache })
    );
    const erreurMauvaisMotDePasse = await authService
      .connecter({ courriel: 'patient@example.com', motDePasse: 'mauvaismotdepasse' })
      .catch((e) => e);

    expect(erreurCompteInconnu.statusCode).toBe(401);
    expect(erreurMauvaisMotDePasse.statusCode).toBe(401);
    expect(erreurCompteInconnu.message).toBe(erreurMauvaisMotDePasse.message);
  });

  it('réussit avec les bons identifiants et renvoie un jeton', async () => {
    const motDePasseHache = await bcrypt.hash('bonmotdepasse', 4);
    utilisateurRepository.trouverParCourrielAvecMotDePasse.mockResolvedValue(
      faireUtilisateur({ motDePasseHache })
    );

    const { jeton, utilisateur } = await authService.connecter({
      courriel: 'patient@example.com',
      motDePasse: 'bonmotdepasse',
    });

    expect(jeton).toBeDefined();
    expect(utilisateur.courriel).toBe('patient@example.com');
  });
});

describe('authService.verifierJeton', () => {
  it('rejette un jeton invalide', () => {
    expect(() => authService.verifierJeton('jeton.invalide.ici')).toThrow();
  });

  it("accepte un jeton qu'elle a elle-même généré", () => {
    const jeton = authService.genererJeton(faireUtilisateur());
    const idExtrait = authService.verifierJeton(jeton);
    expect(idExtrait).toBe('64f000000000000000000001');
  });
});
