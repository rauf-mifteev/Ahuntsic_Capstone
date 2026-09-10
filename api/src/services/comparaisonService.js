const env = require('../config/env');

async function analyserImage(imageBase64) {
  const octets = Buffer.from(imageBase64, 'base64');
  const blob = new Blob([octets], { type: 'image/jpeg' });

  const formulaire = new FormData();
  formulaire.append('image', blob, 'plateau.jpg');

  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), env.serviceAnalyseTimeoutMs);

  try {
    const reponse = await fetch(env.serviceAnalyseUrl, {
      method: 'POST',
      body: formulaire,
      signal: controleur.signal,
    });

    if (!reponse.ok) {
      throw new Error(`Service d'analyse : réponse ${reponse.status}`);
    }

    return await reponse.json();
  } finally {
    clearTimeout(minuteur);
  }
}

async function analyserPlateauSimule(identifiantDispositif) {
  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), env.serviceAnalyseTimeoutMs);

  try {
    const reponse = await fetch(env.serviceAnalyseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dispositifId: identifiantDispositif }),
      signal: controleur.signal,
    });

    if (!reponse.ok) {
      throw new Error(`Service d'analyse : réponse ${reponse.status}`);
    }

    return await reponse.json();
  } finally {
    clearTimeout(minuteur);
  }
}

module.exports = { analyserImage, analyserPlateauSimule };
