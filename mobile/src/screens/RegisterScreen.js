import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import TextField from '../components/TextField';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { messageErreur } from '../api/client';
import { colors, spacing } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

const LONGUEUR_MIN_MOT_DE_PASSE = 8;

export default function RegisterScreen({ navigation }) {
  const { inscrire } = useAuth();
  const [courriel, setCourriel] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreurs, setErreurs] = useState({});
  const [erreurGenerale, setErreurGenerale] = useState('');
  const [enCours, setEnCours] = useState(false);

  function valider() {
    const nouvellesErreurs = {};
    if (!/^\S+@\S+\.\S+$/.test(courriel.trim())) {
      nouvellesErreurs.courriel = 'Entrez un courriel valide.';
    }
    if (motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
      nouvellesErreurs.motDePasse = `Au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`;
    }
    if (confirmation !== motDePasse) {
      nouvellesErreurs.confirmation = 'Les mots de passe ne correspondent pas.';
    }
    setErreurs(nouvellesErreurs);
    return Object.keys(nouvellesErreurs).length === 0;
  }

  async function soumettre() {
    setErreurGenerale('');
    if (!valider()) return;

    setEnCours(true);
    try {
      await inscrire(courriel.trim(), motDePasse);
    } catch (err) {
      setErreurGenerale(messageErreur(err));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>Pilulier connecté</Text>
      <Text style={styles.titre}>Créer un compte</Text>
      <Text style={styles.sousTitre}>
        Votre traitement et votre historique resteront juste à vous.
      </Text>

      <View style={styles.formulaire}>
        <TextField
          label="Courriel"
          value={courriel}
          onChangeText={setCourriel}
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="vous@exemple.com"
          error={erreurs.courriel}
        />
        <TextField
          label="Mot de passe"
          value={motDePasse}
          onChangeText={setMotDePasse}
          secureTextEntry
          textContentType="newPassword"
          placeholder="8 caractères minimum"
          error={erreurs.motDePasse}
        />
        <TextField
          label="Confirmer le mot de passe"
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry
          placeholder="••••••••"
          error={erreurs.confirmation}
        />
        {erreurGenerale ? <Text style={styles.erreurGenerale}>{erreurGenerale}</Text> : null}

        <PrimaryButton label="Créer mon compte" onPress={soumettre} loading={enCours} />
        <PrimaryButton
          label="J'ai déjà un compte"
          variant="secondary"
          onPress={() => navigation.navigate('Connexion')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.amberDeep,
    marginBottom: spacing.xs,
  },
  titre: { fontFamily: fonts.heading, fontSize: fontSizes.h1, color: colors.ink, marginBottom: 6 },
  sousTitre: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.inkSoft,
    marginBottom: spacing.xl,
  },
  formulaire: { marginTop: spacing.sm },
  erreurGenerale: {
    fontFamily: fonts.bodyMedium,
    color: colors.clay,
    marginBottom: spacing.sm,
    fontSize: fontSizes.small,
  },
});
