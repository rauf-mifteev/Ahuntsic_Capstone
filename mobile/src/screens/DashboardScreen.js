import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

/**
 * Tableau de bord du jour (F1, AC : "une connexion réussie ouvre le
 * tableau de bord"). Son contenu complet (prises du jour, adhérence,
 * alertes) arrive avec F5/F6/F7 dans les sprints suivants — cet écran
 * sert de point d'arrivée réel après la connexion pour ce sprint-ci.
 */
export default function DashboardScreen({ navigation }) {
  const { utilisateur, deconnecter } = useAuth();

  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>Tableau de bord</Text>
      <Text style={styles.titre}>Bonjour</Text>
      <Text style={styles.sousTitre}>{utilisateur?.courriel}</Text>

      <View style={styles.carte}>
        <Text style={styles.carteTitre}>Prochaine étape</Text>
        <Text style={styles.carteTexte}>
          Configurez vos moments de prise et vos médicaments, puis associez votre pilulier.
        </Text>
        <PrimaryButton
          label="Configurer mon traitement"
          onPress={() => navigation.navigate('Creneaux')}
        />
        <PrimaryButton
          label="Mes médicaments"
          variant="secondary"
          onPress={() => navigation.navigate('Medicaments')}
        />
        <PrimaryButton
          label="Associer mon pilulier"
          variant="secondary"
          onPress={() => navigation.navigate('Dispositif')}
        />
      </View>

      <PrimaryButton label="Se déconnecter" variant="secondary" onPress={deconnecter} />
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
  titre: { fontFamily: fonts.heading, fontSize: fontSizes.h1, color: colors.ink },
  sousTitre: { fontFamily: fonts.body, color: colors.inkSoft, marginBottom: spacing.xl },
  carte: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  carteTitre: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.body, color: colors.ink, marginBottom: 6 },
  carteTexte: { fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.inkSoft, marginBottom: spacing.md },
});
