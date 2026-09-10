import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import * as authApi from '../api/authApi';
import { sauvegarderJeton, lireJeton, effacerJeton } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    (async () => {
      const jeton = await lireJeton();
      if (jeton) {
        try {
          const compte = await authApi.obtenirCompteCourant();
          setUtilisateur(compte);
        } catch (err) {

          await effacerJeton();
        }
      }
      setPret(true);
    })();
  }, []);

  const inscrire = useCallback(async (courriel, motDePasse) => {
    const { utilisateur: compte, jeton } = await authApi.inscrire(courriel, motDePasse);
    await sauvegarderJeton(jeton);
    setUtilisateur(compte);
  }, []);

  const connecter = useCallback(async (courriel, motDePasse) => {
    const { utilisateur: compte, jeton } = await authApi.connecter(courriel, motDePasse);
    await sauvegarderJeton(jeton);
    setUtilisateur(compte);
  }, []);

  const deconnecter = useCallback(async () => {
    await effacerJeton();
    setUtilisateur(null);
  }, []);

  const valeur = useMemo(
    () => ({ utilisateur, pret, estConnecte: !!utilisateur, inscrire, connecter, deconnecter }),
    [utilisateur, pret, inscrire, connecter, deconnecter]
  );

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>');
  return ctx;
}
