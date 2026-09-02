import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import TextField from '../components/TextField';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { messageErreur } from '../api/client';
import { colors, spacing } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

export default function LoginScreen({ navigation }) {
  const { connecter } = useAuth();
  const [courriel, setCourriel] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  async function soumettre() {
    setErreur('');
    setEnCours(true);
    try {
      await connecter(courriel.trim(), motDePasse);
      // La navigation change automatiquement grâce à AppNavigator, qui
      // écoute estConnecte : rien à faire ici.
    } catch (err) {
      // F1 : le message ne dit jamais quel champ (courriel ou mot de
      // passe) est fautif — on affiche tel quel le message du serveur.
      setErreur(messageErreur(err));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>Pilulier connecté</Text>
      <Text style={styles.titre}>Bon retour</Text>
      <Text style={styles.sousTitre}>Connectez-vous pour voir votre traitement du jour.</Text>

      <View style={styles.formulaire}>
        <TextField
          label="Courriel"
          value={courriel}
          onChangeText={setCourriel}
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="vous@exemple.com"
        />
        <TextField
          label="Mot de passe"
          value={motDePasse}
          onChangeText={setMotDePasse}
          secureTextEntry
          textContentType="password"
          placeholder="••••••••"
        />
        {erreur ? <Text style={styles.erreurGenerale}>{erreur}</Text> : null}

        <PrimaryButton label="Se connecter" onPress={soumettre} loading={enCours} />
        <PrimaryButton
          label="Créer un compte"
          variant="secondary"
          onPress={() => navigation.navigate('Inscription')}
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
