import { client } from './client';

export async function listerPrisesDuJour(date) {
  const { data } = await client.get('/prises', { params: date ? { date } : undefined });
  return data.prises;
}

export async function obtenirPrise(priseId) {
  const { data } = await client.get(`/prises/${priseId}`);
  return data.prise;
}

export async function confirmerPrise(priseId) {
  const { data } = await client.put(`/prises/${priseId}/confirmer`);
  return data.prise;
}

export async function annulerConfirmationPrise(priseId) {
  const { data } = await client.put(`/prises/${priseId}/annuler-confirmation`);
  return data.prise;
}
