import { client } from './client';

export async function inscrire(courriel, motDePasse) {
  const { data } = await client.post('/comptes', { courriel, motDePasse });
  return data; // { utilisateur, jeton }
}

export async function connecter(courriel, motDePasse) {
  const { data } = await client.post('/comptes/connexion', { courriel, motDePasse });
  return data; // { utilisateur, jeton }
}

export async function obtenirCompteCourant() {
  const { data } = await client.get('/comptes/moi');
  return data.utilisateur;
}
