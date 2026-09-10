import { client } from './client';

export async function obtenirEvenementsRecents() {
  const { data } = await client.get('/demo/evenements-recents');
  return data;
}

export async function basculerConnexion(actif) {
  const { data } = await client.post('/demo/connexion', { actif });
  return data.dispositif;
}
