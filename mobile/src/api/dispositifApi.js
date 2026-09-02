import { client } from './client';

export async function obtenirMonDispositif() {
  const { data } = await client.get('/dispositifs/moi');
  return data.dispositif;
}

export async function mettreAJourPlagesHoraires(plagesHoraires) {
  const { data } = await client.put('/dispositifs/moi/plages-horaires', { plagesHoraires });
  return data.dispositif;
}

export async function associerDispositif(identifiantDispositif) {
  const { data } = await client.post('/dispositifs/associer', { identifiantDispositif });
  return data.dispositif;
}
