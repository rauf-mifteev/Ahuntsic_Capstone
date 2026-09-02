import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

/**
 * Client HTTP unique de l'application. Toutes les autres fonctions d'API
 * (authApi, dispositifApi, medicamentApi, ...) passent par lui, pour que
 * le jeton d'authentification soit ajouté au même endroit pour tout le
 * monde, et pour qu'un seul fichier connaisse l'URL de base de l'API.
 *
 * EXPO_PUBLIC_API_URL est la seule variable d'environnement utilisée :
 * Expo n'expose au bundle que les variables préfixées EXPO_PUBLIC_.
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const CLE_JETON = 'pilulier.jeton';

export const client = axios.create({ baseURL: API_URL, timeout: 10000 });

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

/**
 * Traduit une erreur axios en message affichable, sans jamais exposer de
 * détail technique (pile d'appel, code HTTP brut) au patient.
 */
export function messageErreur(err) {
  if (err.response?.data?.error?.message) {
    return err.response.data.error.message;
  }
  if (err.request) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion.';
  }
  return "Une erreur inattendue s'est produite.";
}
