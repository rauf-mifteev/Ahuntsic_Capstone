import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const HOTE_PAR_DEFAUT = 'localhost';
const PORT_PAR_DEFAUT = 3000;
const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${HOTE_PAR_DEFAUT}:${PORT_PAR_DEFAUT}/api`;
const CLE_JETON = 'pilulier.jeton';

export const client = axios.create({ baseURL: API_URL, timeout: 45000 });

client.interceptors.request.use(async (config) => {
  const jeton = await SecureStore.getItemAsync(CLE_JETON);
  if (jeton) {
    config.headers.Authorization = `Bearer ${jeton}`;
  }
  return config;
});

export async function sauvegarderJeton(jeton) {
  await SecureStore.setItemAsync(CLE_JETON, jeton);
}

export async function lireJeton() {
  return SecureStore.getItemAsync(CLE_JETON);
}

export async function effacerJeton() {
  await SecureStore.deleteItemAsync(CLE_JETON);
}

export function messageErreur(err) {
  if (err.response?.data?.error?.message) {
    return err.response.data.error.message;
  }
  if (err.request) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion.';
  }
  return "Une erreur inattendue s'est produite.";
}