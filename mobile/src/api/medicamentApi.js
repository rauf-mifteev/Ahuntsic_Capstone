import { client } from './client';

export async function creerMedicament(medicament) {
  const { data } = await client.post('/medicaments', medicament);
  return data.medicament;
}

export async function listerMedicaments() {
  const { data } = await client.get('/medicaments');
  return data.medicaments;
}
