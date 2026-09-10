const comparaisonService = require('../src/services/comparaisonService');

describe('comparaisonService.analyserImage', () => {
  const fetchOriginal = global.fetch;

  afterEach(() => {
    global.fetch = fetchOriginal;
  });

  it('envoie l\'image en multipart et renvoie le résultat JSON', async () => {
    const reponseSimulee = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        strategie: 'seuillage-opencv',
        resultats: [{ indice: 0, occupee: false, score: 0.9 }],
      }),
    };
    global.fetch = jest.fn().mockResolvedValue(reponseSimulee);

    const resultat = await comparaisonService.analyserImage(Buffer.from('image-factice').toString('base64'));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toEqual(expect.stringContaining('/analyser'));
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);

    expect(resultat.strategie).toBe('seuillage-opencv');
    expect(resultat.resultats).toHaveLength(1);
  });

  it('lève une erreur si le service répond avec un code non-2xx', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(comparaisonService.analyserImage('ZmFrZQ==')).rejects.toThrow(/500/);
  });

  it('propage une erreur réseau (timeout, service injoignable, etc.)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED'));

    await expect(comparaisonService.analyserImage('ZmFrZQ==')).rejects.toThrow('connect ECONNREFUSED');
  });
});
