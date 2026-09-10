import { client } from './client';

export async function obtenirDerniereReference() {
  try {
    const { data } = await client.get('/verifications/reference');
    return data.verification;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}
